import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

// Links from notes always open in a new tab without leaking the opener.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** Renders Markdown to sanitised HTML. Raw HTML in the source is stripped, never trusted. */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false });
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['img', 'style', 'form', 'iframe', 'object', 'embed', 'svg', 'math'],
    FORBID_ATTR: ['style'],
  });
}
