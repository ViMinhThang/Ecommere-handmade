/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const VND_PER_USD = 25500;
const SHOPIFY_LIMIT_PER_SOURCE = 24;

const ROOT_DIR = path.resolve(__dirname, '..');
const EBAY_RAW_FILE = path.join(ROOT_DIR, 'crawl', 'data', 'ebay-products-raw.json');
const SHOPIFY_RAW_FILE = path.join(
  ROOT_DIR,
  'crawl',
  'data',
  'shopify-handmade-products-raw.json',
);
const FIXTURE_FILE = path.join(
  ROOT_DIR,
  'prisma',
  'fixtures',
  'handmade-real-products.json',
);

const SHOPIFY_SOURCES = [
  {
    slug: 'eastfork',
    baseUrl: 'https://www.eastfork.com',
    shopName: 'East Fork',
    email: 'eastfork.importer@local.dev',
    defaultCategorySlug: 'ceramics',
    specialty: 'Pottery and ceramic tableware',
  },
  {
    slug: 'heathceramics',
    baseUrl: 'https://www.heathceramics.com',
    shopName: 'Heath Ceramics',
    email: 'heathceramics.importer@local.dev',
    defaultCategorySlug: 'ceramics',
    specialty: 'Ceramic dinnerware and home goods',
  },
  {
    slug: 'mudlove',
    baseUrl: 'https://www.mudlove.com',
    shopName: 'MudLOVE',
    email: 'mudlove.importer@local.dev',
    defaultCategorySlug: 'jewelry',
    specialty: 'Bracelets, mugs and small handmade gifts',
  },
  {
    slug: 'pegandawl',
    baseUrl: 'https://pegandawlbuilt.com',
    shopName: 'Peg and Awl',
    email: 'pegandawl.importer@local.dev',
    defaultCategorySlug: 'paper-art',
    specialty: 'Prints, stationery and handmade goods',
  },
  {
    slug: 'tenthousandvillages',
    baseUrl: 'https://www.tenthousandvillages.com',
    shopName: 'Ten Thousand Villages',
    email: 'tenthousandvillages.importer@local.dev',
    defaultCategorySlug: 'wall-decor',
    specialty: 'Fair trade artisan decor and gifts',
  },
  {
    slug: 'fairtradewinds',
    baseUrl: 'https://www.fairtradewinds.net',
    shopName: 'Fair Trade Winds',
    email: 'fairtradewinds.importer@local.dev',
    defaultCategorySlug: 'gifts',
    specialty: 'Fair trade handmade gifts and decor',
  },
];

const colorMap = [
  ['cobalt', 'cobalt blue'],
  ['turquoise', 'turquoise'],
  ['blue', 'blue'],
  ['green', 'green'],
  ['yellow', 'yellow'],
  ['brown', 'brown'],
  ['beige', 'beige'],
  ['white', 'white'],
  ['black', 'black'],
  ['multicolor', 'multicolor'],
  ['multi color', 'multicolor'],
  ['neutral', 'neutral'],
  ['aqua', 'aqua'],
  ['cream', 'cream'],
  ['pink', 'pink'],
  ['red', 'red'],
  ['orange', 'orange'],
  ['gray', 'gray'],
  ['grey', 'gray'],
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function stripHtml(input) {
  return String(input || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function slugPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function httpsUrl(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (normalized.startsWith('//')) return `https:${normalized}`;
  if (normalized.startsWith('https://')) return normalized;
  return null;
}

function detectColors(text) {
  const lower = text.toLowerCase();
  return [...new Set(colorMap.filter(([key]) => lower.includes(key)).map(([, value]) => value))];
}

function detectEbayItemType(title) {
  const lower = title.toLowerCase();
  if (/mug|coffee|cup|tea\b|cups\b|kulhad|kulhar/.test(lower)) return 'pottery mug/cup';
  if (/bowl|dish|plate/.test(lower)) return 'pottery bowl/dish';
  if (/vase|jug|pitcher|pot\b|planter|crock/.test(lower)) return 'pottery vase/jar/planter';
  if (/ornament|decor|figurine|sculpture|bell|face/.test(lower)) return 'pottery decor';
  return 'handmade pottery';
}

function detectMaterial(text) {
  const lower = text.toLowerCase();
  if (lower.includes('stoneware')) return 'stoneware';
  if (lower.includes('ceramic')) return 'ceramic';
  if (lower.includes('clay')) return 'clay';
  if (lower.includes('raku')) return 'raku pottery';
  if (lower.includes('leather')) return 'leather';
  if (lower.includes('cotton')) return 'cotton';
  if (lower.includes('wool')) return 'wool';
  if (lower.includes('wood')) return 'wood';
  if (lower.includes('paper')) return 'paper';
  if (lower.includes('pottery')) return 'pottery';
  return 'handmade';
}

function detectCategory({ source, title, productType, tags }) {
  const text = `${title} ${productType || ''} ${(tags || []).join(' ')}`.toLowerCase();
  if (/pottery|ceramic|stoneware|mug|bowl|vase|plate|pitcher/.test(text)) return 'ceramics';
  if (/bracelet|necklace|ring|earring|jewelry|jewellery/.test(text)) return 'jewelry';
  if (/basket|wall|decor|chime|ornament|sculpture|home/.test(text)) return 'wall-decor';
  if (/tote|bag|pouch|linen|textile|cloth|quilt|fabric/.test(text)) return 'textiles';
  if (/candle|wax/.test(text)) return 'candles';
  if (/soap|balm|body|bath/.test(text)) return 'soap-cosmetics';
  if (/wood|wooden/.test(text)) return 'wood-decor';
  if (/leather/.test(text)) return 'leather-goods';
  if (/paper|card|print|journal|notebook|stationery/.test(text)) return 'paper-art';
  return source.defaultCategorySlug;
}

function detectSize(text) {
  const match = String(text || '').match(/\b\d+(?:\.\d+)?\s*(?:"|inch|inches|in\.?|cm|oz|lb)\b/i);
  return match ? match[0].trim() : null;
}

function styleTags(text) {
  const lower = text.toLowerCase();
  return [
    ['vintage', 'vintage'],
    ['studio', 'studio'],
    ['signed', 'signed'],
    ['rustic', 'rustic'],
    ['art', 'art'],
    ['hand thrown', 'hand-thrown'],
    ['handmade', 'handmade'],
    ['hand made', 'handmade'],
    ['glaze', 'glazed'],
    ['drip', 'drip-glaze'],
    ['fair trade', 'fair-trade'],
  ]
    .filter(([key]) => lower.includes(key))
    .map(([, value]) => value);
}

function buildTags(...groups) {
  return [
    ...new Set(
      groups
        .flat()
        .filter(Boolean)
        .map(slugPart)
        .filter(Boolean),
    ),
  ].slice(0, 16);
}

function firstShopifyImage(product) {
  const image =
    product?.images?.[0]?.src ||
    product?.image?.src ||
    product?.variants?.find((variant) => variant?.featured_image?.src)?.featured_image?.src;
  return httpsUrl(image);
}

function firstAvailableVariant(product) {
  return (
    product?.variants?.find((variant) => variant.available !== false && Number(variant.price) > 0) ||
    product?.variants?.find((variant) => Number(variant.price) > 0)
  );
}

function normalizeEbay(rawItems) {
  return rawItems
    .filter((item) => item?.itemId && item?.title && item?.priceValue && httpsUrl(item?.imageUrl))
    .map((item, index) => {
      const title = String(item.title).trim();
      const itemType = detectEbayItemType(title);
      const material = detectMaterial(title);
      const colors = detectColors(title);
      const styles = styleTags(title);
      return {
        externalId: String(item.itemId),
        sku: `EBAY-${String(item.itemId).replace(/[^a-zA-Z0-9]/g, '-').slice(0, 80)}`,
        name: title.slice(0, 255),
        description: `${title}. Real title, price, image URL and source URL are preserved from the local eBay crawl dated ${item.crawledAt}.`,
        priceVnd: Math.max(30000, Math.round(Number(item.priceValue) / 1000) * 1000),
        priceText: item.priceText,
        categorySlug: 'ceramics',
        sellerEmail: 'seller7@ecommerce.com',
        status: index === 0 ? 'PENDING' : 'APPROVED',
        stock: 4 + (index % 18),
        lowStockThreshold: 3,
        imageUrl: httpsUrl(item.imageUrl),
        tags: buildTags(['real-data', 'ebay', 'handmade', 'remote-image', 'pottery'], [itemType, material], colors, styles),
        attributes: {
          itemType,
          material,
          colors,
          size: detectSize(title),
          styleTags: styles,
          inferredFromTitle: true,
        },
        source: {
          name: item.source || 'ebay-web-search',
          domain: 'ebay.com',
          itemWebUrl: item.itemWebUrl,
          crawledAt: item.crawledAt,
        },
      };
    });
}

function normalizeShopify(rawProducts) {
  return rawProducts
    .filter((entry) => entry?.product && entry?.source)
    .map((entry) => {
      const { source, product } = entry;
      const variant = firstAvailableVariant(product);
      const imageUrl = firstShopifyImage(product);
      if (!variant || !imageUrl) return null;

      const title = String(product.title || '').trim();
      const description = stripHtml(product.body_html);
      let priceUsd = Number(variant.price);
      if (!title || !priceUsd) return null;

      if (source.slug === 'pegandawl' && priceUsd > 1000) {
        priceUsd = priceUsd / 100000;
      }

      const categorySlug = detectCategory({
        source,
        title,
        productType: product.product_type,
        tags: product.tags,
      });
      const material = detectMaterial(`${title} ${description} ${product.product_type || ''}`);
      const colors = detectColors(`${title} ${description}`);
      const styles = styleTags(`${title} ${description} ${(product.tags || []).join(' ')}`);
      const sourceUrl = `${source.baseUrl.replace(/\/$/, '')}/products/${product.handle}`;
      const priceVnd = Math.max(30000, Math.round((priceUsd * VND_PER_USD) / 1000) * 1000);

      return {
        externalId: `${source.slug}:${product.id}`,
        sku: `SHOPIFY-${source.slug}-${product.id}`,
        name: title.slice(0, 255),
        description:
          description ||
          `${title}. Real title, price, image URL and product URL are preserved from public Shopify products.json.`,
        priceVnd,
        priceText: `${priceVnd.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} đ`,
        categorySlug,
        sellerEmail: source.email,
        status: 'APPROVED',
        stock: variant.available === false ? 0 : 4 + (Number(product.id) % 18),
        lowStockThreshold: 3,
        imageUrl,
        tags: buildTags(
          ['real-data', 'shopify', 'handmade', 'remote-image'],
          [source.slug, product.product_type, categorySlug, material],
          product.tags || [],
          colors,
          styles,
        ),
        attributes: {
          itemType: product.product_type || categorySlug,
          material,
          colors,
          size: detectSize(`${title} ${description}`),
          vendor: product.vendor || source.shopName,
          variantTitle: variant.title,
          sourceCurrency: 'USD',
          vndPerUsd: VND_PER_USD,
          inferredFields: ['categorySlug', 'material', 'colors', 'size', 'stock'],
        },
        source: {
          name: 'shopify-products-json',
          domain: new URL(source.baseUrl).hostname,
          shopName: source.shopName,
          itemWebUrl: sourceUrl,
          rawApiUrl: `${source.baseUrl.replace(/\/$/, '')}/products.json`,
          crawledAt: entry.crawledAt,
        },
      };
    })
    .filter(Boolean);
}

function buildFixture({ ebayItems, shopifyRawProducts, generatedAt }) {
  const ebayProducts = normalizeEbay(ebayItems);
  const shopifyProducts = normalizeShopify(shopifyRawProducts);
  const products = [...ebayProducts, ...shopifyProducts];

  return {
    meta: {
      name: 'Real handmade product fixture for local MVP',
      version: 2,
      generatedFrom: [
        path.relative(ROOT_DIR, EBAY_RAW_FILE).replace(/\\/g, '/'),
        path.relative(ROOT_DIR, SHOPIFY_RAW_FILE).replace(/\\/g, '/'),
      ],
      generatedAt,
      imageStrategy: 'remote-url-only; no generated images; no downloaded images',
      pricingPolicy: [
        'eBay raw prices are already stored as VND in the source file.',
        `Shopify source prices are preserved as USD in priceText and converted to VND with VND_PER_USD=${VND_PER_USD} for local checkout compatibility.`,
      ],
      dataPolicy: [
        'Product title, price, imageUrl, itemWebUrl and crawledAt come from local raw crawl files.',
        'Shopify product descriptions come from public products.json body_html after HTML stripping.',
        'Product category/tags/attributes can include deterministic inference from title/type/tags and are marked in attributes.',
        'Seller accounts are local importer wrappers because raw product feeds do not include full marketplace seller identities.',
        'No customer PII, real orders, or real reviews are included.',
      ],
      sourceCounts: {
        ebay: ebayProducts.length,
        shopify: shopifyProducts.length,
        total: products.length,
      },
    },
    categories: [
      {
        slug: 'ceramics',
        name: 'Handmade pottery and ceramics',
        description: 'Pottery, mugs, bowls, vases and handmade ceramic decor from real product records.',
        status: 'ACTIVE',
      },
    ],
    sellers: [
      {
        email: 'seller7@ecommerce.com',
        name: 'Đồ Gốm Bát Tràng Minh Khang',
        shopName: 'Đồ Gốm Bát Tràng Minh Khang',
        sellerTitle: 'Real handmade product source from local eBay crawl',
        sellerBio:
          'Local importer account for real products that preserve source URLs. The raw file does not include real seller username.',
        sellerAbout:
          'The app uses this local account only to attach product ownership in the demo marketplace. Product title, price, image and item URL remain sourced from the raw crawl file.',
        avatar: ebayProducts[0]?.imageUrl || null,
        sellerHeroImage: ebayProducts[1]?.imageUrl || ebayProducts[0]?.imageUrl || null,
        sellerAboutImage: ebayProducts[2]?.imageUrl || ebayProducts[0]?.imageUrl || null,
      },
      ...SHOPIFY_SOURCES.map((source) => {
        const sourceProducts = shopifyProducts.filter((product) => product.sellerEmail === source.email);
        return {
          email: source.email,
          name: `${source.shopName} Importer`,
          shopName: source.shopName,
          sellerTitle: source.specialty,
          sellerBio:
            'Local importer account for public Shopify product records. Product title, description, price, image URL and source URL are preserved.',
          sellerAbout:
            'Used only for local MVP ownership mapping; product data remains tied to the original source URL in fixture metadata.',
          avatar: sourceProducts[0]?.imageUrl || null,
          sellerHeroImage: sourceProducts[1]?.imageUrl || sourceProducts[0]?.imageUrl || null,
          sellerAboutImage: sourceProducts[2]?.imageUrl || sourceProducts[0]?.imageUrl || null,
        };
      }),
    ],
    products,
  };
}

async function fetchShopifyProducts(source) {
  const url = `${source.baseUrl.replace(/\/$/, '')}/products.json?limit=${SHOPIFY_LIMIT_PER_SOURCE}`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'HandCraftMarketLocalMVP/1.0',
    },
  });

  if (!response.ok) {
    console.warn(`[shopify-crawl] Skip ${source.baseUrl}: HTTP ${response.status}`);
    return [];
  }

  const payload = await response.json();
  const products = Array.isArray(payload.products) ? payload.products : [];
  return products.slice(0, SHOPIFY_LIMIT_PER_SOURCE).map((product) => ({
    source,
    crawledAt: new Date().toISOString(),
    product,
  }));
}

async function main() {
  const generatedAt = new Date().toISOString();
  const ebayItems = readJsonArray(EBAY_RAW_FILE);
  const shopifyRawProducts = [];

  for (const source of SHOPIFY_SOURCES) {
    const products = await fetchShopifyProducts(source);
    console.log(`[shopify-crawl] ${source.shopName}: ${products.length} product(s)`);
    shopifyRawProducts.push(...products);
  }

  writeJson(SHOPIFY_RAW_FILE, {
    meta: {
      generatedAt,
      imageStrategy: 'remote-url-only; no generated images; no downloaded images',
      limitPerSource: SHOPIFY_LIMIT_PER_SOURCE,
      sources: SHOPIFY_SOURCES.map(({ slug, baseUrl, shopName }) => ({ slug, baseUrl, shopName })),
    },
    products: shopifyRawProducts,
  });

  const fixture = buildFixture({ ebayItems, shopifyRawProducts, generatedAt });
  writeJson(FIXTURE_FILE, fixture);

  console.log(
    `[handmade-real-data] Wrote ${fixture.products.length} product(s): ${fixture.meta.sourceCounts.ebay} eBay, ${fixture.meta.sourceCounts.shopify} Shopify.`,
  );
  console.log(`[handmade-real-data] Raw Shopify: ${SHOPIFY_RAW_FILE}`);
  console.log(`[handmade-real-data] Fixture: ${FIXTURE_FILE}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[handmade-real-data] Failed:', error?.message || error);
    process.exitCode = 1;
  });
}
