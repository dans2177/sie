import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { C } from '../data/colors';
import type { ChatMessage } from '../types/index';

// Inline math: $...$ (single $, no spaces directly inside delimiters), or \(...\)
const INLINE_MATH_RE = /(\$[^$\n]+?\$|\\\([^\n]+?\\\))/g;

function stripInlineDelims(s: string): string {
  if (s.startsWith('$') && s.endsWith('$')) return s.slice(1, -1);
  if (s.startsWith('\\(') && s.endsWith('\\)')) return s.slice(2, -2);
  return s;
}

export function renderInlineMarkup(text: string, keyPrefix: string): React.ReactNode[] {
  // First split on inline math so we don't try to bold-parse inside LaTeX.
  const mathParts = text.split(INLINE_MATH_RE);
  const out: React.ReactNode[] = [];
  mathParts.forEach((part, mi) => {
    if (!part) return;
    const isMath = INLINE_MATH_RE.test(part);
    INLINE_MATH_RE.lastIndex = 0;
    if (isMath) {
      try {
        out.push(
          <InlineMath key={`${keyPrefix}-m-${mi}`} math={stripInlineDelims(part)} />
        );
      } catch {
        out.push(<span key={`${keyPrefix}-m-${mi}`}>{part}</span>);
      }
      return;
    }
    part.split(/(\*\*[^*]+\*\*)/g).forEach((sub, si) => {
      if (!sub) return;
      if (sub.startsWith('**') && sub.endsWith('**') && sub.length > 4) {
        out.push(<strong key={`${keyPrefix}-${mi}-${si}`}>{sub.slice(2, -2)}</strong>);
      } else {
        out.push(<span key={`${keyPrefix}-${mi}-${si}`}>{sub}</span>);
      }
    });
  });
  return out;
}

export function extractMcqOptions(content: string): Array<{ label: string; text: string }> {
  const options: Array<{ label: string; text: string }> = [];
  const seen = new Set<string>();
  for (const raw of content.split('\n')) {
    const trimmed = raw.trim();
    const m = trimmed.match(/^(?:[-*]\s*)?(?:\*\*)?([A-D])(?:\*\*)?\s*[\)\].:.\-]\s+(.+)$/i);
    if (m) {
      const label = m[1].toUpperCase();
      if (seen.has(label)) continue;
      seen.add(label);
      options.push({ label, text: m[2].replace(/\*\*/g, '').trim() });
    }
  }
  return options;
}

function renderCodeBlock(code: string, language: string, key: string) {
  const compact = code
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

  const tableLines = compact.filter((line) => line.includes('|'));
  const parseTableCells = (line: string) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  const isDivider = (line: string) => /^\|?\s*:?[-]{3,}:?\s*(\|\s*:?[-]{3,}:?\s*)+\|?$/.test(line);
  const isTable = tableLines.length >= 3 && isDivider(tableLines[1]);

  if (isTable) {
    const headers = parseTableCells(tableLines[0]);
    const rows = tableLines.slice(2).map(parseTableCells).filter((row) => row.length > 0);
    return (
      <div key={key} style={{ margin: '8px 0', background: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px' }}>
        <div style={{ fontSize: '11px', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Table
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 'min(100%, 320px)' }}>
            <thead>
              <tr>
                {headers.map((header, idx) => (
                  <th key={`${key}-h-${idx}`} style={{ textAlign: 'left', fontSize: '12px', color: C.text, borderBottom: `1px solid ${C.border}`, padding: '7px 8px', background: C.card }}>
                    {renderInlineMarkup(header, `${key}-h-t-${idx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={`${key}-r-${rowIdx}`}>
                  {headers.map((_, colIdx) => (
                    <td key={`${key}-c-${rowIdx}-${colIdx}`} style={{ fontSize: '13px', color: C.muted, borderBottom: `1px solid ${C.border}`, padding: '7px 8px', verticalAlign: 'top' }}>
                      {renderInlineMarkup(row[colIdx] ?? '', `${key}-r-t-${rowIdx}-${colIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const arrowJoined = compact.join(' ').replace(/[↓↧]/g, '->').replace(/[→]/g, '->');
  const arrowNodes = arrowJoined.split(/->|=>/).map((x) => x.trim()).filter(Boolean);
  const lineNodes = compact.filter((line) => !/^(↓|↧|->|=>|\|\/)+$/.test(line));
  const nodes = (arrowNodes.length >= 3 ? arrowNodes : lineNodes).filter((x, i, arr) => x !== arr[i - 1]);
  const isChart = nodes.length >= 3 && (arrowJoined.includes('->') || compact.some((x) => x.includes('↓') || x.includes('→')) || language === 'mermaid');

  if (isChart) {
    return (
      <div key={key} style={{ margin: '8px 0', background: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px' }}>
        <div style={{ fontSize: '11px', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Chart
        </div>
        <div style={{ display: 'grid', justifyItems: 'center', gap: '6px' }}>
          {nodes.map((node, idx) => (
            <div key={`${key}-${idx}`} style={{ display: 'grid', justifyItems: 'center', gap: '6px' }}>
              <div style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${C.borderHi}`, background: C.card, color: C.text, fontSize: '14px', textAlign: 'center' }}>
                {node}
              </div>
              {idx < nodes.length - 1 && <div style={{ color: C.dim, fontSize: '16px', lineHeight: 1 }}>↓</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <pre key={key} style={{ margin: '8px 0', background: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '13px', lineHeight: 1.5, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
      {code}
    </pre>
  );
}

export function renderChatContent(content: string) {
  const normalizedContent = String(content || '').replace(/\[OUTCOME:(CORRECT|NEEDS_WORK|NEUTRAL)\]\s*\n?/gi, '');
  const out: React.ReactNode[] = [];
  const lines = normalizedContent.split('\n');
  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];
  const parseTableCells = (line: string) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  const isDivider = (line: string) => /^\|?\s*:?[-]{3,}:?\s*(\|\s*:?[-]{3,}:?\s*)+\|?$/.test(line);

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.replace(/\[DEF\]/g, 'Definition').replace(/\[EXAM TIP\]/g, 'Exam tip');
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = trimmed.slice(3).trim().toLowerCase();
        codeLines = [];
      } else {
        out.push(renderCodeBlock(codeLines.join('\n'), codeLang, `code-${i}`));
        inCode = false;
        codeLang = '';
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(raw);
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const option = trimmed.match(/^([A-D])[\).:]\s+(.+)$/i);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const quote = trimmed.match(/^>\s+(.+)$/);
    const isQuestion = /(multiple-choice question|^question[:\s]|\?$)/i.test(trimmed) && !option;
    const isTableStart = trimmed.includes('|') && i + 1 < lines.length && isDivider(lines[i + 1].trim());

    if (!trimmed) {
      out.push(<div key={`sp-${i}`} style={{ height: '8px' }} />);
      continue;
    }

    if (trimmed === '---') {
      out.push(<div key={`hr-${i}`} style={{ margin: '8px 0', borderTop: `1px solid ${C.border}` }} />);
      continue;
    }

    // Block math: $$...$$ on a single line, or starts a multi-line block.
    if (trimmed.startsWith('$$')) {
      const rest = trimmed.slice(2);
      const closeIdx = rest.indexOf('$$');
      let math = '';
      if (closeIdx >= 0) {
        math = rest.slice(0, closeIdx).trim();
      } else {
        const buf: string[] = [rest];
        let j = i + 1;
        while (j < lines.length) {
          const r = lines[j];
          const t = r.trim();
          const k = t.indexOf('$$');
          if (k >= 0) {
            buf.push(t.slice(0, k));
            i = j;
            break;
          }
          buf.push(r);
          j += 1;
        }
        math = buf.join('\n').trim();
        if (i !== j) i = j;
      }
      if (math) {
        try {
          out.push(
            <div key={`bm-${i}`} style={{ margin: '8px 0', overflowX: 'auto' }}>
              <BlockMath math={math} />
            </div>
          );
        } catch {
          out.push(<pre key={`bm-${i}`}>{math}</pre>);
        }
        continue;
      }
    }

    if (isTableStart) {
      const header = parseTableCells(trimmed);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length) {
        const rowLine = lines[j].trim();
        if (!rowLine || !rowLine.includes('|')) break;
        rows.push(parseTableCells(rowLine));
        j += 1;
      }

      out.push(
        <div key={`tbl-${i}`} style={{ margin: '8px 0', background: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 'min(100%, 280px)' }}>
              <thead>
                <tr>
                  {header.map((cell, idx) => (
                    <th key={`th-${i}-${idx}`} style={{ textAlign: 'left', fontSize: '12px', color: C.text, borderBottom: `1px solid ${C.border}`, padding: '7px 8px', background: C.card }}>
                      {renderInlineMarkup(cell, `th-inline-${i}-${idx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={`tr-${i}-${rowIdx}`}>
                    {header.map((_, colIdx) => (
                      <td key={`td-${i}-${rowIdx}-${colIdx}`} style={{ fontSize: '13px', color: C.muted, borderBottom: `1px solid ${C.border}`, padding: '7px 8px', verticalAlign: 'top' }}>
                        {renderInlineMarkup(row[colIdx] ?? '', `td-inline-${i}-${rowIdx}-${colIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      i = j - 1;
      continue;
    }

    if (heading) {
      const level = heading[1].length;
      const size = level === 1 ? 21 : level === 2 ? 18 : 16;
      out.push(
        <div key={`h-${i}`} style={{ fontSize: `${size}px`, color: C.text, fontWeight: 700, margin: '6px 0 4px' }}>
          {renderInlineMarkup(heading[2], `h-${i}`)}
        </div>
      );
      continue;
    }

    if (option) {
      out.push(
        <div key={`opt-${i}`} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '9px 11px', marginBottom: '7px', color: C.text, fontSize: '16px', lineHeight: 1.55 }}>
          <strong>{option[1].toUpperCase()}.</strong> {renderInlineMarkup(option[2], `opt-${i}`)}
        </div>
      );
      continue;
    }

    if (bullet) {
      out.push(
        <div key={`b-${i}`} style={{ display: 'flex', gap: '8px', color: C.muted, fontSize: '16px', lineHeight: 1.65 }}>
          <span style={{ color: C.amber }}>•</span>
          <span>{renderInlineMarkup(bullet[1], `b-${i}`)}</span>
        </div>
      );
      continue;
    }

    if (quote) {
      out.push(
        <div key={`q-${i}`} style={{ margin: '4px 0', padding: '6px 10px', borderLeft: `3px solid ${C.borderHi}`, color: C.dim, background: C.panel, borderRadius: '4px' }}>
          {renderInlineMarkup(quote[1], `q-${i}`)}
        </div>
      );
      continue;
    }

    out.push(
      <div key={`p-${i}`} style={{ fontWeight: isQuestion ? 700 : 400, color: isQuestion ? C.text : 'inherit', fontSize: '16px', lineHeight: 1.7 }}>
        {renderInlineMarkup(line, `p-${i}`)}
      </div>
    );
  }

  if (inCode && codeLines.length) {
    out.push(renderCodeBlock(codeLines.join('\n'), codeLang, 'code-tail'));
  }

  return out;
}

export function parseAssistantOutcome(content: string): 'correct' | 'needsWork' | 'neutral' {
  const t = content.toLowerCase();
  const tagged = t.match(/\[outcome:(correct|needs_work|needs-work|neutral)\]/i);
  if (tagged) {
    const value = tagged[1].replace('_', '-');
    if (value === 'correct') return 'correct';
    if (value === 'needs-work') return 'needsWork';
    return 'neutral';
  }

  const explicitCorrect = /(^|\n|\s)(✅\s*correct|that'?s\s+correct|you'?re\s+correct|you\s+are\s+correct|you\s+got\s+it|great\s+job|nice\s+job|well\s+done|exactly\s+right)/i.test(t);
  const explicitWrong = /(your\s+answer\s+is\s+(incorrect|wrong)|that'?s\s+(incorrect|wrong)|you'?re\s+(incorrect|wrong)|you\s+are\s+(incorrect|wrong)|not\s+quite\s+right|not\s+correct|not\s+right|missed\s+it|close\s+but\s+not\s+quite)/i.test(t);

  if (explicitCorrect) return 'correct';
  if (explicitWrong) return 'needsWork';

  const genericCorrect = /\b(correct|right)\b/i.test(t);
  if (genericCorrect) return 'correct';
  return 'neutral';
}

export function countCorrectAnswers(messages: ChatMessage[]): number {
  return messages.reduce((total, m) => {
    if (m.role !== 'assistant') return total;
    return total + (parseAssistantOutcome(m.content) === 'correct' ? 1 : 0);
  }, 0);
}

export function upsertAssistantMessage(messages: ChatMessage[], content: string): ChatMessage[] {
  const next = [...messages];
  const last = next[next.length - 1];
  if (last?.role === 'assistant') {
    next[next.length - 1] = { ...last, role: 'assistant', content };
  } else {
    next.push({ role: 'assistant', content });
  }
  return next;
}

/** Best-effort extraction of the most recent multiple-choice stem from an assistant turn. */
export function extractMcqQuestionPrompt(content: string): string | undefined {
  const text = String(content || '').replace(/\[OUTCOME:[A-Z_]+\]\s*/gi, '').trim();
  if (!text) return undefined;
  const lines = text.split('\n');
  // Find first option line; the stem is the nearest non-empty preceding line.
  let firstOptionIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*(?:[-*]\s*)?(?:\*\*)?[A-D](?:\*\*)?\s*[\)\].:\-]\s+\S/i.test(lines[i])) {
      firstOptionIdx = i;
      break;
    }
  }
  if (firstOptionIdx === -1) return undefined;
  for (let i = firstOptionIdx - 1; i >= 0; i -= 1) {
    const t = lines[i].trim();
    if (t) return t.replace(/^#+\s*/, '').replace(/\*\*/g, '');
  }
  return undefined;
}

/** Try to read which option label the assistant flagged as correct. */
export function extractCorrectAnswerLabel(content: string): string | undefined {
  const text = String(content || '');
  // Common phrasings the model uses.
  const patterns: RegExp[] = [
    /\b(?:correct\s+answer\s+is|the\s+answer\s+is|answer\s*[:=]?\s*)\(?\s*\**([A-D])\**\s*\)?/i,
    /^\s*\(?\s*([A-D])\s*\)?\s+is\s+correct/im,
    /\bcorrect\s*[:\-]\s*\(?\s*([A-D])\s*\)?/i,
    /\b(?:option|choice)\s*\(?\s*([A-D])\s*\)?\s+is\s+correct/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].toUpperCase();
  }
  return undefined;
}
