const DANGEROUS_BLOCKS =
  /<\s*(script|style|iframe|object|embed|svg|math|link|meta)[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_TAGS =
  /<\s*\/?\s*(script|style|iframe|object|embed|svg|math|link|meta)[^>]*>/gi;
const EVENT_ATTRIBUTES = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const UNSAFE_URL_ATTRIBUTES =
  /\s+(href|src|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

export function sanitizeRichTextHtml(value: string) {
  return value
    .replace(DANGEROUS_BLOCKS, "")
    .replace(DANGEROUS_TAGS, "")
    .replace(EVENT_ATTRIBUTES, "")
    .replace(UNSAFE_URL_ATTRIBUTES, "")
    .trim();
}

export function richTextToPlainText(value: string) {
  return sanitizeRichTextHtml(value)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
