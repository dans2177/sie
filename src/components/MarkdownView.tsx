import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { C } from '../data/colors';

type Props = {
  text: string;
  /** Drop the [OUTCOME:...] tag the tutor prefixes onto every reply. */
  stripOutcomeTag?: boolean;
  /** Append a blinking caret while a stream is in flight. */
  streaming?: boolean;
};

/**
 * Heal common LaTeX breakage in AI-generated replies that were stored before the
 * server-side sanitizer existed (or that arrive mid-stream). Mirrors the logic in
 * `api/topic-ai.js#sanitizeMathDelimiters`.
 */
function sanitizeMathDelimiters(text: string): string {
  let out = String(text || '');

  const DOLLAR_SENTINEL = '\u0001CURRENCY\u0001';
  out = out.replace(/\\\$/g, DOLLAR_SENTINEL);

  // Strip markdown bold/italic inside math (block + inline).
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner: string) => {
    const cleaned = inner
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(?<!\\)\*([^*\n]+)\*/g, '$1');
    return `$$${cleaned}$$`;
  });
  out = out.replace(/\$([^$\n]+?)\$/g, (_m, inner: string) => {
    const cleaned = inner
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(?<!\\)\*([^*\n]+)\*/g, '$1');
    return `$${cleaned}$`;
  });

  // Unwrap math whose contents are actually prose.
  const isProse = (s: string) => {
    const t = s.trim();
    if (!t) return false;
    const hasWordPair = /[A-Za-z]{3,}\s+[A-Za-z]{2,}/.test(t);
    const hasCommonWord = /\b(?:the|and|of|or|is|are|with|for|to|from|by|than|that|this|instead|market|price|value|par)\b/i.test(t);
    const hasLatexCmd = /\\[a-zA-Z]+|\\\\|\^\{|_\{|\\frac|\\times|\\div|\\cdot|\\sqrt|\\sum|\\int|\\le|\\ge|\\neq|\\pm/.test(t);
    return (hasWordPair || hasCommonWord) && !hasLatexCmd;
  };
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (m, inner: string) => (isProse(inner) ? inner.trim() : m));
  out = out.replace(/\$([^$\n]{1,800}?)\$/g, (m, inner: string) => (isProse(inner) ? inner.trim() : m));

  // Balance unmatched `**` per line.
  out = out
    .split('\n')
    .map((line) => {
      const count = (line.match(/\*\*/g) || []).length;
      if (count > 0 && count % 2 === 1) return line.replace(/\*\*(?!.*\*\*)/, '');
      return line;
    })
    .join('\n');

  out = out.replace(/\*\*(\s*)\$/g, '$1$$').replace(/\$(\s*)\*\*/g, '$$$1');
  out = out.replace(/\*{3,}/g, '**');

  // Restore escaped dollars BEFORE the orphan-$ pass so currency counts.
  out = out.replace(new RegExp(DOLLAR_SENTINEL, 'g'), '$');

  // Drop orphan `$` only when there are 3+ and the total is odd.
  for (let i = 0; i < 3; i += 1) {
    const dollars = (out.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 === 0 || dollars < 3) break;
    out = out.replace(/\$(?!.*\$)/s, '');
  }

  return out;
}

function MarkdownViewInner({ text, stripOutcomeTag = true, streaming = false }: Props) {
  const cleaned = useMemo(() => {
    let t = String(text || '');
    if (stripOutcomeTag) {
      t = t.replace(/^\[OUTCOME:(CORRECT|NEEDS_WORK|NEUTRAL)\]\s*\n?/i, '');
    }
    t = sanitizeMathDelimiters(t);
    return t;
  }, [text, stripOutcomeTag]);

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: C.amber, textDecoration: 'underline' }} />
          ),
          code: ({ className, children, ...rest }) => {
            const isInline = !/language-/.test(className || '');
            if (isInline) {
              return (
                <code style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '1px 5px', borderRadius: '4px', fontSize: '0.92em' }} {...rest}>
                  {children}
                </code>
              );
            }
            return <code className={className} {...rest}>{children}</code>;
          },
          pre: ({ children }) => (
            <pre style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: '8px',
              padding: '10px 12px', margin: '8px 0', overflowX: 'auto', fontSize: '13px', lineHeight: 1.55,
            }}>{children}</pre>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '8px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th style={{ textAlign: 'left', padding: '7px 8px', borderBottom: `1px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 700 }}>{children}</th>
          ),
          td: ({ children }) => (
            <td style={{ padding: '7px 8px', borderBottom: `1px solid ${C.border}`, color: C.muted, verticalAlign: 'top' }}>{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{ margin: '6px 0', padding: '6px 10px', borderLeft: `3px solid ${C.borderHi}`, color: C.dim, background: C.panel, borderRadius: '4px' }}>{children}</blockquote>
          ),
          h1: ({ children }) => <div style={{ fontSize: '21px', fontWeight: 700, color: C.text, margin: '8px 0 4px' }}>{children}</div>,
          h2: ({ children }) => <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, margin: '8px 0 4px' }}>{children}</div>,
          h3: ({ children }) => <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, margin: '6px 0 3px' }}>{children}</div>,
          ul: ({ children }) => <ul style={{ margin: '6px 0', paddingLeft: '20px' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: '6px 0', paddingLeft: '20px' }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: '2px 0', lineHeight: 1.65 }}>{children}</li>,
          p: ({ children }) => <p style={{ margin: '4px 0', lineHeight: 1.7 }}>{children}</p>,
          hr: () => <div style={{ margin: '8px 0', borderTop: `1px solid ${C.border}` }} />,
        }}
      >
        {cleaned}
      </ReactMarkdown>
      {streaming && <span className="md-caret" aria-hidden>▍</span>}
    </div>
  );
}

export const MarkdownView = memo(MarkdownViewInner);
