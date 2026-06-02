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
    specialty: 'Bát đĩa và đồ gốm gia dụng thủ công',
  },
  {
    slug: 'heathceramics',
    baseUrl: 'https://www.heathceramics.com',
    shopName: 'Heath Ceramics',
    email: 'heathceramics.importer@local.dev',
    defaultCategorySlug: 'ceramics',
    specialty: 'Đồ dùng bàn ăn và đồ trang trí gốm cao cấp',
  },
  {
    slug: 'mudlove',
    baseUrl: 'https://www.mudlove.com',
    shopName: 'MudLOVE',
    email: 'mudlove.importer@local.dev',
    defaultCategorySlug: 'jewelry',
    specialty: 'Vòng tay, ly sứ và quà tặng thủ công nhỏ',
  },
  {
    slug: 'pegandawl',
    baseUrl: 'https://pegandawlbuilt.com',
    shopName: 'Peg and Awl',
    email: 'pegandawl.importer@local.dev',
    defaultCategorySlug: 'paper-art',
    specialty: 'Tranh in, văn phòng phẩm và đồ thủ công',
  },
  {
    slug: 'tenthousandvillages',
    baseUrl: 'https://www.tenthousandvillages.com',
    shopName: 'Ten Thousand Villages',
    email: 'tenthousandvillages.importer@local.dev',
    defaultCategorySlug: 'wall-decor',
    specialty: 'Đồ trang trí và quà tặng thủ công thương mại công bằng',
  },
  {
    slug: 'fairtradewinds',
    baseUrl: 'https://www.fairtradewinds.net',
    shopName: 'Fair Trade Winds',
    email: 'fairtradewinds.importer@local.dev',
    defaultCategorySlug: 'gifts',
    specialty: 'Quà tặng và đồ trang trí handmade thương mại công bằng',
  },
];

const colorMap = [
  ['cobalt', 'xanh cobalt'],
  ['turquoise', 'xanh ngọc'],
  ['blue', 'xanh dương'],
  ['green', 'xanh lá'],
  ['yellow', 'vàng'],
  ['brown', 'nâu'],
  ['beige', 'be'],
  ['white', 'trắng'],
  ['black', 'đen'],
  ['multicolor', 'nhiều màu'],
  ['multi color', 'nhiều màu'],
  ['neutral', 'màu trung tính'],
  ['aqua', 'xanh nước biển'],
  ['cream', 'kem'],
  ['pink', 'hồng'],
  ['red', 'đỏ'],
  ['orange', 'cam'],
  ['gray', 'xám'],
  ['grey', 'xám'],
];

const categoryCopy = {
  ceramics: {
    name: 'Gốm sứ thủ công mỹ nghệ',
    description:
      'Cốc, bát, bình hoa và đồ trang trí gốm được làm tay, phù hợp dùng hằng ngày hoặc làm quà tặng.',
  },
  jewelry: {
    name: 'Trang sức thủ công',
    description:
      'Vòng tay, dây chuyền và phụ kiện nhỏ được chế tác thủ công, dễ phối đồ và phù hợp làm quà.',
  },
  'wall-decor': {
    name: 'Tranh và đồ trang trí thủ công',
    description:
      'Tranh, đồ treo tường, chuông gió và vật trang trí làm tay cho không gian sống ấm cúng.',
  },
  textiles: {
    name: 'Vải và túi thủ công',
    description:
      'Túi vải, phụ kiện may, vải dệt và sản phẩm textile được làm thủ công.',
  },
  candles: {
    name: 'Nến thơm thủ công',
    description:
      'Nến sáp đậu nành, nến thơm thư giãn và set quà hương liệu làm thủ công.',
  },
  'soap-cosmetics': {
    name: 'Xà phòng và mỹ phẩm thủ công',
    description:
      'Xà phòng, son dưỡng, muối tắm và sản phẩm chăm sóc cơ thể từ nguyên liệu lành tính.',
  },
  'wood-decor': {
    name: 'Đồ gỗ trang trí',
    description:
      'Khay gỗ, kệ nhỏ và đồ decor nhà cửa được làm tay từ chất liệu gỗ mộc.',
  },
  'leather-goods': {
    name: 'Đồ da thủ công',
    description:
      'Ví da, bao thẻ, móc khóa và phụ kiện da làm tay theo phong cách bền vững.',
  },
  'paper-art': {
    name: 'Thiệp và giấy nghệ thuật',
    description:
      'Thiệp, tranh in, sổ tay, scrapbook và sản phẩm giấy thủ công.',
  },
  'hair-accessories': {
    name: 'Phụ kiện tóc handmade',
    description:
      'Kẹp tóc, dây buộc tóc, băng đô và phụ kiện được may hoặc móc thủ công tỉ mỉ.',
  },
  gifts: {
    name: 'Quà tặng thủ công',
    description:
      'Các món quà handmade được chọn lọc cho sinh nhật, kỷ niệm và dịp đặc biệt.',
  },
};

const categoryItemNames = {
  ceramics: 'Sản phẩm gốm thủ công',
  jewelry: 'Trang sức thủ công',
  'wall-decor': 'Đồ trang trí thủ công',
  textiles: 'Sản phẩm vải thủ công',
  candles: 'Nến thơm thủ công',
  'soap-cosmetics': 'Xà phòng thủ công',
  'wood-decor': 'Đồ gỗ thủ công',
  'leather-goods': 'Đồ da thủ công',
  'paper-art': 'Sản phẩm giấy thủ công',
  'hair-accessories': 'Phụ kiện tóc handmade',
  gifts: 'Quà tặng handmade',
};

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
  return cleanSourceText(input)
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function cleanSourceText(input) {
  const mojibake = (codes) => String.fromCodePoint(...codes);
  return String(input || '')
    .replaceAll(mojibake([0x201a, 0x00c4, 0x00ee]), '—')
    .replaceAll(mojibake([0x201a, 0x00c4, 0x00f4]), "'")
    .replaceAll(mojibake([0x201a, 0x00c4, 0x00fa]), '"')
    .replaceAll(mojibake([0x201a, 0x00c4, 0x00f9]), '"')
    .replaceAll(mojibake([0x00c2, 0x00a0]), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function vietnameseNameFromSource(title, categorySlug, fallbackType) {
  const sourceTitle = cleanSourceText(title);
  const lower = sourceTitle.toLowerCase();
  const categoryName = categoryItemNames[categorySlug] || fallbackType || 'Sản phẩm handmade';
  const details = [];

  if (/mug|cup|coffee|tea\b|cups\b|kulhad|kulhar/.test(lower)) details.push('ly');
  if (/bowl|dish|plate/.test(lower)) details.push('bát đĩa');
  if (/vase|jug|pitcher|pot\b|planter|crock/.test(lower)) details.push('bình');
  if (/bracelet/.test(lower)) details.push('vòng tay');
  if (/necklace/.test(lower)) details.push('vòng cổ');
  if (/earring/.test(lower)) details.push('bông tai');
  if (/candle|wax/.test(lower)) details.push('nến thơm');
  if (/card|print|journal|notebook|stationery/.test(lower)) details.push('giấy nghệ thuật');
  if (/bag|tote|pouch/.test(lower)) details.push('túi vải');
  if (/signed|signature/.test(lower)) details.push('có ký tên');
  if (/vintage|antique/.test(lower)) details.push('phong cách vintage');
  if (/personalized|custom/.test(lower)) details.push('cá nhân hóa');
  if (/small|mini|miniature/.test(lower)) details.push('cỡ nhỏ');
  if (/large|wide/.test(lower)) details.push('cỡ lớn');

  const color = detectColors(sourceTitle)[0];
  if (color) details.push(color);

  return [categoryName, ...details]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255);
}

function vietnameseDescription({ name, categorySlug, material, colors, size, sourceLabel }) {
  const category = categoryCopy[categorySlug];
  const parts = [
    `${name}.`,
    category?.description ||
      'Sản phẩm handmade được tuyển chọn cho marketplace đồ thủ công local MVP.',
  ];

  if (material) parts.push(`Chất liệu chính: ${material}.`);
  if (colors?.length) parts.push(`Tông màu: ${colors.join(', ')}.`);
  if (size) parts.push(`Kích thước tham khảo: ${size}.`);
  if (sourceLabel) {
    parts.push(
      `Dữ liệu được Việt hóa từ nguồn ${sourceLabel}; ảnh và liên kết nguồn được giữ nguyên để tránh ảnh lỗi.`,
    );
  }

  return parts.join(' ').slice(0, 2000);
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
  if (/mug|coffee|cup|tea\b|cups\b|kulhad|kulhar/.test(lower)) return 'ly cốc gốm';
  if (/bowl|dish|plate/.test(lower)) return 'bát đĩa gốm';
  if (/vase|jug|pitcher|pot\b|planter|crock/.test(lower)) return 'bình lọ gốm';
  if (/ornament|decor|figurine|sculpture|bell|face/.test(lower)) return 'đồ trang trí gốm';
  return 'gốm thủ công';
}

function detectMaterial(text) {
  const lower = text.toLowerCase();
  if (lower.includes('stoneware')) return 'đất sét nung';
  if (lower.includes('ceramic')) return 'gốm sứ';
  if (lower.includes('clay')) return 'đất sét';
  if (lower.includes('raku')) return 'gốm raku';
  if (lower.includes('leather')) return 'da thật';
  if (lower.includes('cotton')) return 'vải cotton';
  if (lower.includes('wool')) return 'len';
  if (lower.includes('wood')) return 'gỗ';
  if (lower.includes('paper')) return 'giấy thủ công';
  if (lower.includes('pottery')) return 'gốm';
  return 'chất liệu thủ công';
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
    ['studio', 'xưởng thủ công'],
    ['signed', 'có ký tên'],
    ['rustic', 'mộc mạc'],
    ['art', 'nghệ thuật'],
    ['hand thrown', 'vuốt tay'],
    ['handmade', 'thủ công'],
    ['hand made', 'thủ công'],
    ['glaze', 'men gốm'],
    ['drip', 'men chảy'],
    ['fair trade', 'thương mại công bằng'],
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
      const title = cleanSourceText(item.title);
      const itemType = detectEbayItemType(title);
      const material = detectMaterial(title);
      const colors = detectColors(title);
      const styles = styleTags(title);
      const size = detectSize(title);
      const name = vietnameseNameFromSource(title, 'ceramics', itemType);
      return {
        externalId: String(item.itemId),
        sku: `EBAY-${String(item.itemId).replace(/[^a-zA-Z0-9]/g, '-').slice(0, 80)}`,
        name,
        description: vietnameseDescription({
          name,
          categorySlug: 'ceramics',
          material,
          colors,
          size,
          sourceLabel: 'eBay crawl local',
        }),
        priceVnd: Math.max(30000, Math.round(Number(item.priceValue) / 1000) * 1000),
        priceText: item.priceText,
        categorySlug: 'ceramics',
        sellerEmail: 'seller7@ecommerce.com',
        status: index === 0 ? 'PENDING' : 'APPROVED',
        stock: 4 + (index % 18),
        lowStockThreshold: 3,
        imageUrl: httpsUrl(item.imageUrl),
        tags: buildTags(
          ['du-lieu-that', 'ebay', 'thu-cong', 'anh-url', 'gom-su'],
          [itemType, material],
          colors,
          styles,
        ),
        attributes: {
          itemType,
          material,
          colors,
          size,
          styleTags: styles,
          inferredFromTitle: true,
          originalTitle: title,
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

      const title = cleanSourceText(product.title);
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
      const size = detectSize(`${title} ${description}`);
      const name = vietnameseNameFromSource(title, categorySlug, categoryItemNames[categorySlug]);

      return {
        externalId: `${source.slug}:${product.id}`,
        sku: `SHOPIFY-${source.slug}-${product.id}`,
        name,
        description: vietnameseDescription({
          name,
          categorySlug,
          material,
          colors,
          size,
          sourceLabel: 'Shopify products.json công khai',
        }),
        priceVnd,
        priceText: `${priceVnd.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} đ`,
        categorySlug,
        sellerEmail: source.email,
        status: 'APPROVED',
        stock: variant.available === false ? 0 : 4 + (Number(product.id) % 18),
        lowStockThreshold: 3,
        imageUrl,
        tags: buildTags(
          ['du-lieu-that', 'shopify', 'thu-cong', 'anh-url'],
          [source.slug, product.product_type, categorySlug, material],
          product.tags || [],
          colors,
          styles,
        ),
        attributes: {
          itemType: product.product_type || categorySlug,
          material,
          colors,
          size,
          vendor: product.vendor || source.shopName,
          variantTitle: variant.title,
          sourceCurrency: 'USD',
          vndPerUsd: VND_PER_USD,
          inferredFields: ['categorySlug', 'material', 'colors', 'size', 'stock'],
          originalTitle: title,
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
      name: 'Bộ dữ liệu sản phẩm handmade đã Việt hóa cho local MVP',
      version: 2,
      generatedFrom: [
        path.relative(ROOT_DIR, EBAY_RAW_FILE).replace(/\\/g, '/'),
        path.relative(ROOT_DIR, SHOPIFY_RAW_FILE).replace(/\\/g, '/'),
      ],
      generatedAt,
      imageStrategy: 'chỉ lưu URL ảnh; không tạo ảnh; không tải ảnh về máy',
      pricingPolicy: [
        'Giá eBay trong file nguồn đã được lưu theo VNĐ.',
        `Giá Shopify được quy đổi sang VNĐ với VND_PER_USD=${VND_PER_USD} để phù hợp checkout local.`,
      ],
      dataPolicy: [
        'Tên và mô tả sản phẩm đã được Việt hóa; URL ảnh, URL nguồn và thời điểm crawl vẫn giữ để truy vết.',
        'Mô tả Shopify được làm sạch HTML trước khi tạo mô tả tiếng Việt cho demo.',
        'Danh mục, tag và thuộc tính có thể được suy luận từ tiêu đề, loại sản phẩm hoặc tag gốc.',
        'Tài khoản người bán là wrapper local vì nguồn crawl không cung cấp đầy đủ danh tính marketplace.',
        'Không chứa PII khách hàng, đơn thật hoặc đánh giá thật.',
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
        name: categoryCopy.ceramics.name,
        description: categoryCopy.ceramics.description,
        status: 'ACTIVE',
      },
    ],
    sellers: [
      {
        email: 'seller7@ecommerce.com',
        name: 'Đồ Gốm Bát Tràng Minh Khang',
        shopName: 'Đồ Gốm Bát Tràng Minh Khang',
        sellerTitle: 'Nguồn sản phẩm gốm thủ công từ crawl local',
        sellerBio:
          'Tài khoản import local cho sản phẩm gốm thủ công đã Việt hóa, giữ nguyên URL ảnh và liên kết nguồn để tránh lỗi ảnh.',
        sellerAbout:
          'Ứng dụng dùng tài khoản này để gắn quyền sở hữu sản phẩm trong demo marketplace. Tên, mô tả và tag đã được Việt hóa cho người dùng.',
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
            'Tài khoản import local cho dữ liệu Shopify công khai; tên và mô tả đã được Việt hóa, URL ảnh và nguồn được giữ nguyên.',
          sellerAbout:
            'Chỉ dùng cho demo local MVP để gắn quyền sở hữu sản phẩm; dữ liệu vẫn có metadata nguồn để truy vết.',
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
