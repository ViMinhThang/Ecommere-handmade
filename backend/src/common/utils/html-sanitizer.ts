const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
]);

const DANGEROUS_BLOCKS =
  /<\s*(script|style|iframe|object|embed|svg|math|link|meta)[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_TAGS =
  /<\s*\/?\s*(script|style|iframe|object|embed|svg|math|link|meta)[^>]*>/gi;
const EVENT_ATTRIBUTES = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const UNSAFE_URL_ATTRIBUTES =
  /\s+(href|src|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const TAG_PATTERN = /<\/?([a-zA-Z0-9-]+)(?:\s[^>]*)?>/g;

function stripUnsafeUrlAttributes(value: string) {
  return value.replace(UNSAFE_URL_ATTRIBUTES, (_match, name, rawValue) => {
    const unquoted = String(rawValue).replace(/^['"]|['"]$/g, '').trim();
    return /^(javascript|data|vbscript):/i.test(unquoted)
      ? ''
      : ` ${name}="${unquoted.replace(/"/g, '&quot;')}"`;
  });
}

export function sanitizeRichTextHtml(value?: string | null): string {
  if (!value) {
    return '';
  }

  return value
    .replace(DANGEROUS_BLOCKS, '')
    .replace(DANGEROUS_TAGS, '')
    .replace(EVENT_ATTRIBUTES, '')
    .replace(UNSAFE_URL_ATTRIBUTES, '')
    .replace(TAG_PATTERN, (match, rawTag) => {
      const tag = String(rawTag).toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        return '';
      }
      return stripUnsafeUrlAttributes(match);
    })
    .trim();
}
