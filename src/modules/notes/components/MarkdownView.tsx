import { useMemo } from 'react';
import { renderMarkdown } from '../lib/markdown';

/** Sanitised Markdown preview (DOMPurify runs inside renderMarkdown; raw HTML never reaches the DOM). */
export function MarkdownView({ source, empty }: { source: string; empty: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  if (!source.trim()) return <p className="text-text-muted">{empty}</p>;
  // Safe: sanitised by DOMPurify in renderMarkdown.
  return <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
