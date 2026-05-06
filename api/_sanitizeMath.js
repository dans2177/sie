// Heal common LaTeX/markdown breakage in AI-generated tutor replies before
// sending them to the client. Kept ASCII-safe and dependency-free so it can
// run in both the Vercel function and in unit tests.
//
// Mirror logic in `src/components/MarkdownView.tsx` — keep both in sync.

export function sanitizeMathDelimiters(text) {
  let out = String(text || '');

  // 0) Pre-pass: neutralize escaped dollars (currency the model already escaped).
  const DOLLAR_SENTINEL = '\u0001CURRENCY\u0001';
  out = out.replace(/\\\$/g, DOLLAR_SENTINEL);

  // 1) Strip markdown bold/italic that appears INSIDE math (block first, then inline).
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner) => {
    const cleaned = inner
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(?<!\\)\*([^*\n]+)\*/g, '$1');
    return `$$${cleaned}$$`;
  });
  out = out.replace(/\$([^$\n]+?)\$/g, (_m, inner) => {
    const cleaned = inner
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(?<!\\)\*([^*\n]+)\*/g, '$1');
    return `$${cleaned}$`;
  });

  // 2) Unwrap math whose contents are actually prose.
  const isProse = (s) => {
    const t = s.trim();
    if (!t) return false;
    const hasWordPair = /[A-Za-z]{3,}\s+[A-Za-z]{2,}/.test(t);
    const hasCommonWord = /\b(?:the|and|of|or|is|are|with|for|to|from|by|than|that|this|instead|market|price|value|par)\b/i.test(t);
    const hasLatexCmd = /\\[a-zA-Z]+|\\\\|\^\{|_\{|\\frac|\\times|\\div|\\cdot|\\sqrt|\\sum|\\int|\\le|\\ge|\\neq|\\pm/.test(t);
    return (hasWordPair || hasCommonWord) && !hasLatexCmd;
  };
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (m, inner) => (isProse(inner) ? inner.trim() : m));
  out = out.replace(/\$([^$\n]{1,800}?)\$/g, (m, inner) => (isProse(inner) ? inner.trim() : m));

  // 2b) Currency-shaped pairs: when the model wrote bare currency like
  //     "...par value of $1,000, and $6,800..." those two $ pair up and KaTeX
  //     renders the comma+text between them as math. Detect any `$<currency>$`
  //     run (digits/commas/decimals only) and unwrap, restoring a plain `$`
  //     in front of the number.
  const isCurrency = (s) => /^[0-9][0-9,\.\s]*[0-9kKmMbB]?$/.test(s.trim()) && s.trim().length > 0;
  // Repeat to catch chained pairs.
  for (let i = 0; i < 4; i += 1) {
    const before = out;
    out = out.replace(/\$([^$\n]{1,80}?)\$/g, (m, inner) => (isCurrency(inner) ? `$${inner.trim()}` : m));
    if (out === before) break;
  }

  // 3) Balance unmatched `**` per line (keeps bold from leaking across paragraphs).
  out = out
    .split('\n')
    .map((line) => {
      const count = (line.match(/\*\*/g) || []).length;
      if (count > 0 && count % 2 === 1) return line.replace(/\*\*(?!.*\*\*)/, '');
      return line;
    })
    .join('\n');

  // 4) Remove stray ** adjacent to math delimiters; collapse 3+ asterisk runs.
  out = out.replace(/\*\*(\s*)\$/g, '$1$$').replace(/\$(\s*)\*\*/g, '$$$1');
  out = out.replace(/\*{3,}/g, '**');

  // 5) Restore escaped dollars as plain currency. Must happen BEFORE the orphan-$
  //    pass so newly-revealed `$` chars are counted in the balance check.
  out = out.replace(new RegExp(DOLLAR_SENTINEL, 'g'), '$');

  // 6) Drop orphan inline `$` if total count is odd AND >= 3 (avoids spurious math).
  //    A single lone `$` is just currency — leave it alone.
  for (let i = 0; i < 3; i += 1) {
    const dollars = (out.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 === 0 || dollars < 3) break;
    out = out.replace(/\$(?!.*\$)/s, '');
  }

  return out;
}
