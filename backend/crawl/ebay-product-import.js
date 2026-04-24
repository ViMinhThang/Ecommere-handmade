/* eslint-disable no-console */
require('dotenv').config();

const { PrismaClient, Prisma, ProductStatus, Role, UserStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const SKU_PREFIX = 'EBAY-';
const IMPORTER_EMAIL = 'ebay.importer@local.dev';
const IMPORTER_SHOP_NAME = 'Ebay Handmade Import';
const DEFAULT_CATEGORY_SLUG = 'gom-su-handmade';
const DEFAULT_LOCAL_SOURCE_FILE = path.join('crawl', 'data', 'ebay-products-raw.json');

function toBoolean(value, fallback) {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function toInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function stripHtml(input) {
  return String(input || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toPositiveNumber(value) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveSourceFilePath() {
  const configuredPath = process.env.EBAY_IMPORT_SOURCE_FILE || DEFAULT_LOCAL_SOURCE_FILE;
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

function readLocalItems() {
  const sourceFile = resolveSourceFilePath();
  if (!fs.existsSync(sourceFile)) return { sourceFile, items: [] };

  try {
    const raw = fs.readFileSync(sourceFile, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [];
    return { sourceFile, items };
  } catch (error) {
    console.warn(`[ebay-crawl] Cannot parse local source file ${sourceFile}: ${error?.message || error}`);
    return { sourceFile, items: [] };
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureImporterSeller() {
  const existing = await prisma.user.findUnique({
    where: { email: IMPORTER_EMAIL },
    select: { id: true },
  });
  if (existing) return existing.id;

  const hashedPassword = await bcrypt.hash('Importer@123', 12);
  const seller = await prisma.user.create({
    data: {
      email: IMPORTER_EMAIL,
      name: 'Ebay Import Bot',
      password: hashedPassword,
      roles: [Role.ROLE_SELLER],
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      shopName: IMPORTER_SHOP_NAME,
      sellerTitle: 'Imported Handmade Collection',
    },
    select: { id: true },
  });
  return seller.id;
}

async function ensureDefaultCategory() {
  const category = await prisma.category.upsert({
    where: { slug: DEFAULT_CATEGORY_SLUG },
    update: {},
    create: {
      slug: DEFAULT_CATEGORY_SLUG,
      name: 'Do gom handmade',
      description: 'Imported from eBay Browse API',
      status: 'ACTIVE',
    },
    select: { id: true },
  });
  return category.id;
}

async function getAccessToken(clientId, clientSecret) {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
  });

  if (!response.ok) {
    throw new Error(`Cannot get eBay token: HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('eBay token response missing access_token');
  }
  return payload.access_token;
}

async function searchItems({ accessToken, query, marketplaceId, offset, limit }) {
  const search = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
    filter: 'buyingOptions:{FIXED_PRICE}',
  });

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${search.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
      },
    },
  );

  if (!response.ok) {
    console.warn(`[ebay-crawl] Search failed at offset ${offset}: HTTP ${response.status}`);
    return [];
  }

  const payload = await response.json();
  return payload.itemSummaries || [];
}

function toProductSeedData(item, categoryId, sellerId) {
  const itemId = String(item?.itemId || '').trim();
  const title = String(item?.title || '').trim();
  const price = toPositiveNumber(item?.priceValue ?? item?.price?.value);
  const imageUrl = item?.imageUrl || item?.image?.imageUrl || item?.thumbnailImages?.[0]?.imageUrl;

  if (!itemId || !title || !price || !imageUrl) return null;

  const cleanItemId = itemId.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 80);
  const sku = `${SKU_PREFIX}${cleanItemId}`;
  const shortDesc = stripHtml(item?.shortDescription || item?.subtitle || '');
  const sourceUrl = item.itemWebUrl || `https://www.ebay.com/itm/${itemId.replace(/\D/g, '')}`;
  const sellerName = item?.seller?.username ? `Seller: ${item.seller.username}. ` : '';
  const description = (shortDesc || `${sellerName}Imported from eBay listing. Source: ${sourceUrl}`).slice(0, 2000);

  return {
    sku,
    data: {
      name: title.slice(0, 255),
      description,
      price: new Prisma.Decimal(price.toFixed(2)),
      status: ProductStatus.APPROVED,
      stock: randomInt(3, 25),
      lowStockThreshold: 3,
      sku,
      tags: ['ebay', 'handmade', 'ceramic'],
      descriptionImages: [imageUrl],
      category: { connect: { id: categoryId } },
      seller: { connect: { id: sellerId } },
      images: { create: [{ url: imageUrl, isMain: true }] },
    },
  };
}

async function importFromItems({ items, toCreate, categoryId, sellerId, existingSkuSet }) {
  let created = 0;

  for (const rawItem of items) {
    if (created >= toCreate) break;

    const mapped = toProductSeedData(rawItem, categoryId, sellerId);
    if (!mapped) continue;
    if (existingSkuSet.has(mapped.sku)) continue;

    await prisma.product.create({ data: mapped.data });
    existingSkuSet.add(mapped.sku);
    created += 1;
  }

  return created;
}

async function runEbayImport() {
  const enabled = toBoolean(process.env.AUTO_IMPORT_PRODUCTS_ON_BOOT, false);
  if (!enabled) {
    console.log('[ebay-crawl] AUTO_IMPORT_PRODUCTS_ON_BOOT=false, skip.');
    return;
  }

  const limit = toInt(process.env.AUTO_IMPORT_PRODUCTS_LIMIT, 100, 1, 200);
  const query = (process.env.EBAY_IMPORT_QUERY || 'handmade pottery').trim();
  const marketplaceId = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
  const onlyIfEmpty = toBoolean(process.env.AUTO_IMPORT_PRODUCTS_ONLY_IF_EMPTY, true);

  const existingEbayCount = await prisma.product.count({
    where: { sku: { startsWith: SKU_PREFIX } },
  });

  if (onlyIfEmpty && existingEbayCount > 0) {
    console.log(`[ebay-crawl] Already has ${existingEbayCount} imported products, skip.`);
    return;
  }
  if (existingEbayCount >= limit) {
    console.log(`[ebay-crawl] Already has ${existingEbayCount}/${limit}, skip.`);
    return;
  }

  const toCreate = limit - existingEbayCount;
  const sellerId = await ensureImporterSeller();
  const categoryId = await ensureDefaultCategory();
  const existingImported = await prisma.product.findMany({
    where: { sku: { startsWith: SKU_PREFIX } },
    select: { sku: true },
  });
  const existingSkuSet = new Set(existingImported.map((item) => item.sku).filter(Boolean));

  const { sourceFile, items: localItems } = readLocalItems();
  if (localItems.length > 0) {
    console.log(`[ebay-crawl] Local source detected: ${sourceFile} (${localItems.length} item(s)).`);
    const createdFromFile = await importFromItems({
      items: localItems,
      toCreate,
      categoryId,
      sellerId,
      existingSkuSet,
    });
    console.log(`[ebay-crawl] Import completed from local file. Added ${createdFromFile} product(s), target ${toCreate}.`);
    return;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('[ebay-crawl] Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET, and no local source file found, skip.');
    return;
  }
  const accessToken = await getAccessToken(clientId, clientSecret);

  let created = 0;
  let offset = 0;
  const pageSize = 50;
  const maxOffsets = 1000;

  while (created < toCreate && offset < maxOffsets) {
    const items = await searchItems({
      accessToken,
      query,
      marketplaceId,
      offset,
      limit: pageSize,
    });
    if (items.length === 0) break;

    const newlyCreated = await importFromItems({
      items,
      toCreate: toCreate - created,
      categoryId,
      sellerId,
      existingSkuSet,
    });
    created += newlyCreated;

    offset += pageSize;
  }

  console.log(`[ebay-crawl] Import completed. Added ${created} product(s), target ${toCreate}.`);
}

module.exports = { runEbayImport };

if (require.main === module) {
  runEbayImport()
    .catch((error) => {
      console.error('[ebay-crawl] Failed:', error?.message || error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
