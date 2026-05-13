import { sanitizeRichTextHtml } from './html-sanitizer';

describe('sanitizeRichTextHtml', () => {
  it('removes script blocks, event handlers, and unsafe URL attributes', () => {
    const result = sanitizeRichTextHtml(
      '<p onclick="alert(1)">Nice</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
    );

    expect(result).toContain('Nice');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('javascript:');
  });
});
