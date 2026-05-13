/* eslint-disable no-console */
require('dotenv').config();

const {
  PrismaClient,
  Prisma,
  ProductStatus,
  Role,
  UserStatus,
} = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const prisma = new PrismaClient();

const SKU_PREFIX = 'EBAY-';
const IMPORTER_EMAIL = 'ebay.importer@local.dev';
const IMPORTER_SHOP_NAME = 'Ebay Handmade Import';
const DEFAULT_CATEGORY_SLUG = 'gom-su-handmade';
const DEFAULT_LOCAL_SOURCE_FILE = path.join('crawl', 'data', 'product.csv');
const REQUIRED_SOURCE_COLUMNS = ['itemId', 'title', 'priceValue', 'imageUrl'];
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

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
  return String(input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toPositiveNumber(value) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveSourceFilePath() {
  const configuredPath =
    process.env.PRODUCT_IMPORT_SOURCE_FILE ||
    process.env.EBAY_IMPORT_SOURCE_FILE ||
    DEFAULT_LOCAL_SOURCE_FILE;
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function getXmlAttr(attributes, name) {
  const match = attributes.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? decodeXml(match[1]) : '';
}

function getColumnIndex(cellRef) {
  const letters = String(cellRef || '').match(/^[A-Z]+/i)?.[0] || 'A';
  return (
    [...letters.toUpperCase()].reduce(
      (total, letter) => total * 26 + letter.charCodeAt(0) - 64,
      0,
    ) - 1
  );
}

function getXmlTagValue(xml, tagName) {
  const pattern = new RegExp(
    `<(?:\\w+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`,
  );
  const match = xml.match(pattern);
  return match ? decodeXml(match[1]) : '';
}

function getTextRuns(xml) {
  const values = [];
  const pattern = /<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g;
  for (const match of xml.matchAll(pattern)) {
    values.push(decodeXml(match[1]));
  }
  return values.join('');
}

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (
      buffer.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE
    ) {
      return offset;
    }
  }
  throw new Error('Invalid XLSX file: missing ZIP directory');
}

function readZipEntryTexts(buffer) {
  const entries = new Map();
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('Invalid XLSX file: broken ZIP directory');
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString(
      'utf8',
      offset + 46,
      offset + 46 + fileNameLength,
    );
    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart =
      localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedData = buffer.subarray(
      dataStart,
      dataStart + compressedSize,
    );

    if (buffer.readUInt32LE(localHeaderOffset) !== ZIP_LOCAL_FILE_SIGNATURE) {
      throw new Error(`Invalid XLSX file: broken entry ${fileName}`);
    }

    if (compressionMethod === 0) {
      entries.set(fileName, compressedData.toString('utf8'));
    } else if (compressionMethod === 8) {
      entries.set(
        fileName,
        zlib.inflateRawSync(compressedData).toString('utf8'),
      );
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function parseSharedStrings(sharedStringsXml) {
  const xml = sharedStringsXml || '';
  const strings = [];
  const pattern = /<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g;
  for (const match of xml.matchAll(pattern)) {
    strings.push(getTextRuns(match[1]));
  }
  return strings;
}

function parseWorksheetRows(sheetXml, sharedStrings) {
  const rows = [];
  const rowPattern = /<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g;

  for (const rowMatch of sheetXml.matchAll(rowPattern)) {
    const row = [];
    const cellPattern = /<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g;

    for (const cellMatch of rowMatch[1].matchAll(cellPattern)) {
      const attributes = cellMatch[1];
      const cellType = getXmlAttr(attributes, 't');
      const cellRef = getXmlAttr(attributes, 'r');
      const value =
        cellType === 'inlineStr'
          ? getTextRuns(cellMatch[2])
          : getXmlTagValue(cellMatch[2], 'v');
      const columnIndex = getColumnIndex(cellRef);
      row[columnIndex] =
        cellType === 's' ? sharedStrings[Number(value)] || '' : value;
    }

    rows.push(row.map((value) => value ?? ''));
  }

  return rows;
}

function rowsToObjects(rows) {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];

  const headers = headerRow.map((header) => String(header || '').trim());
  return dataRows
    .filter((row) => row.some((value) => String(value || '').trim()))
    .map((row) =>
      headers.reduce((record, header, index) => {
        if (header) record[header] = String(row[index] ?? '').trim();
        return record;
      }, {}),
    );
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function parseXlsxItems(sourceFile) {
  const buffer = fs.readFileSync(sourceFile);
  const entries = readZipEntryTexts(buffer);
  const sheetXml = entries.get('xl/worksheets/sheet1.xml');
  if (!sheetXml)
    throw new Error('XLSX file does not contain xl/worksheets/sheet1.xml');

  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml'));
  return rowsToObjects(parseWorksheetRows(sheetXml, sharedStrings));
}

function parseTextCsvItems(sourceFile) {
  const raw = fs.readFileSync(sourceFile, 'utf8').replace(/^\uFEFF/, '');
  return rowsToObjects(parseCsvRows(raw));
}

function readSourceItems(sourceFile) {
  const fileStart = fs.readFileSync(sourceFile);
  const isXlsx =
    fileStart.length >= 4 &&
    fileStart.readUInt32LE(0) === ZIP_LOCAL_FILE_SIGNATURE;
  return isXlsx ? parseXlsxItems(sourceFile) : parseTextCsvItems(sourceFile);
}

function warnInvalidSourceColumns(sourceFile, items) {
  const columns = Object.keys(items[0] || {});
  const missing = REQUIRED_SOURCE_COLUMNS.filter(
    (column) => !columns.includes(column),
  );
  if (missing.length > 0) {
    console.warn(
      `[product-import] Source file ${sourceFile} missing required columns: ${missing.join(', ')}`,
    );
  }
}

function readLocalItems() {
  const sourceFile = resolveSourceFilePath();
  if (!fs.existsSync(sourceFile)) return { sourceFile, items: [] };

  try {
    const items = readSourceItems(sourceFile);
    warnInvalidSourceColumns(sourceFile, items);
    return { sourceFile, items };
  } catch (error) {
    console.warn(
      `[product-import] Cannot parse local source file ${sourceFile}: ${error?.message || error}`,
    );
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

  const importerPassword =
    process.env.EBAY_IMPORTER_PASSWORD || crypto.randomBytes(24).toString('hex');
  const hashedPassword = await bcrypt.hash(importerPassword, 12);
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
  const data = {
    slug: DEFAULT_CATEGORY_SLUG,
    name: 'Đồ gốm thủ công',
    description: 'Bộ sưu tập gốm thủ công đã Việt hóa từ dữ liệu sản phẩm.',
    status: 'ACTIVE',
  };

  const category = await prisma.category.upsert({
    where: { slug: DEFAULT_CATEGORY_SLUG },
    update: data,
    create: data,
    select: { id: true },
  });
  return category.id;
}

async function getAccessToken(clientId, clientSecret) {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64',
  );

  const response = await fetch(
    'https://api.ebay.com/identity/v1/oauth2/token',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Cannot get eBay token: HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('eBay token response missing access_token');
  }
  return payload.access_token;
}

async function searchItems({
  accessToken,
  query,
  marketplaceId,
  offset,
  limit,
}) {
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
    console.warn(
      `[ebay-crawl] Search failed at offset ${offset}: HTTP ${response.status}`,
    );
    return [];
  }

  const payload = await response.json();
  return payload.itemSummaries || [];
}

function toProductSeedData(item, categoryId, sellerId) {
  const itemId = String(item?.itemId || '').trim();
  const title = String(item?.title || '').trim();
  const price = toPositiveNumber(item?.priceValue ?? item?.price?.value);
  const imageUrl =
    item?.imageUrl ||
    item?.image?.imageUrl ||
    item?.thumbnailImages?.[0]?.imageUrl;

  if (!itemId || !title || !price || !imageUrl) return null;

  const cleanItemId = itemId.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 80);
  const sku = `${SKU_PREFIX}${cleanItemId}`;
  const shortDesc = stripHtml(item?.shortDescription || item?.subtitle || '');
  const sellerName = item?.seller?.username
    ? `Người bán: ${item.seller.username}. `
    : '';
  const description = (
    shortDesc ||
    `${sellerName}Sản phẩm gốm thủ công được tuyển chọn cho bộ sưu tập handmade.`
  ).slice(0, 2000);

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
      tags: ['nhap-khau', 'thu-cong', 'gom-su'],
      descriptionImages: [imageUrl],
      category: { connect: { id: categoryId } },
      seller: { connect: { id: sellerId } },
      images: { create: [{ url: imageUrl, isMain: true }] },
    },
  };
}

async function importFromItems({
  items,
  toCreate,
  categoryId,
  sellerId,
  existingSkuSet,
}) {
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

function canResetImportedProducts() {
  const runtimeEnv = String(process.env.NODE_ENV || 'development')
    .trim()
    .toLowerCase();
  return runtimeEnv !== 'production' && runtimeEnv !== 'prod';
}

async function resetImportedProducts() {
  const products = await prisma.product.findMany({
    where: { sku: { startsWith: SKU_PREFIX } },
    select: { id: true },
  });
  const productIds = products.map((product) => product.id);
  if (productIds.length === 0) return 0;

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { productId: { in: productIds } } }),
    prisma.orderItem.deleteMany({ where: { productId: { in: productIds } } }),
    prisma.cartItem.deleteMany({ where: { productId: { in: productIds } } }),
    prisma.productQuestion.deleteMany({
      where: { productId: { in: productIds } },
    }),
    prisma.inventoryLog.deleteMany({
      where: { productId: { in: productIds } },
    }),
    prisma.productImage.deleteMany({
      where: { productId: { in: productIds } },
    }),
    prisma.chatConversation.updateMany({
      where: { contextProductId: { in: productIds } },
      data: { contextProductId: null },
    }),
    prisma.product.deleteMany({ where: { id: { in: productIds } } }),
  ]);

  return productIds.length;
}

async function runEbayImport() {
  const enabled = toBoolean(process.env.AUTO_IMPORT_PRODUCTS_ON_BOOT, false);
  if (!enabled) {
    console.log('[product-import] AUTO_IMPORT_PRODUCTS_ON_BOOT=false, skip.');
    return;
  }

  const limit = toInt(process.env.AUTO_IMPORT_PRODUCTS_LIMIT, 100, 1, 200);
  const query = (process.env.EBAY_IMPORT_QUERY || 'handmade pottery').trim();
  const marketplaceId = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
  const onlyIfEmpty = toBoolean(
    process.env.AUTO_IMPORT_PRODUCTS_ONLY_IF_EMPTY,
    true,
  );
  const resetOnBoot = toBoolean(
    process.env.AUTO_IMPORT_PRODUCTS_RESET_ON_BOOT,
    false,
  );

  if (resetOnBoot && canResetImportedProducts()) {
    const deleted = await resetImportedProducts();
    console.log(
      `[product-import] Reset imported products before import. Deleted ${deleted} product(s).`,
    );
  } else if (resetOnBoot) {
    console.warn('[product-import] Skip reset because NODE_ENV=production.');
  }

  const existingEbayCount = await prisma.product.count({
    where: { sku: { startsWith: SKU_PREFIX } },
  });

  if (onlyIfEmpty && existingEbayCount > 0) {
    console.log(
      `[product-import] Already has ${existingEbayCount} imported products, skip.`,
    );
    return;
  }
  if (existingEbayCount >= limit) {
    console.log(
      `[product-import] Already has ${existingEbayCount}/${limit}, skip.`,
    );
    return;
  }

  const toCreate = limit - existingEbayCount;
  const sellerId = await ensureImporterSeller();
  const categoryId = await ensureDefaultCategory();
  const existingImported = await prisma.product.findMany({
    where: { sku: { startsWith: SKU_PREFIX } },
    select: { sku: true },
  });
  const existingSkuSet = new Set(
    existingImported.map((item) => item.sku).filter(Boolean),
  );

  const { sourceFile, items: localItems } = readLocalItems();
  if (localItems.length > 0) {
    console.log(
      `[product-import] Local source detected: ${sourceFile} (${localItems.length} item(s)).`,
    );
    const createdFromFile = await importFromItems({
      items: localItems,
      toCreate,
      categoryId,
      sellerId,
      existingSkuSet,
    });
    console.log(
      `[product-import] Import completed from local file. Added ${createdFromFile} product(s), target ${toCreate}.`,
    );
    return;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn(
      '[product-import] Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET, and no local source file found, skip.',
    );
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

  console.log(
    `[product-import] Import completed. Added ${created} product(s), target ${toCreate}.`,
  );
}

module.exports = { readLocalItems, runEbayImport };

if (require.main === module) {
  runEbayImport()
    .catch((error) => {
      console.error('[product-import] Failed:', error?.message || error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
