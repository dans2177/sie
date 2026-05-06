// Render a structured `submit_reply` tool result into clean markdown.
// This is the ONLY place LaTeX/markdown delimiters are produced server-side,
// so the output is guaranteed well-formed regardless of what the model said.
//
// SCHEMA DESIGN: prose fields are arrays of typed parts
//   { type: "text", value: "..." }   -> rendered as escaped prose
//   { type: "math", value: "latex" } -> rendered as $latex$ (inline) or $$latex$$ (block)
// This makes it structurally impossible for raw LaTeX to leak into prose.

const OUTCOMES = new Set(['CORRECT', 'NEEDS_WORK', 'NEUTRAL']);

function normalizeOutcome(v) {
  const s = String(v || '').trim().toUpperCase();
  return OUTCOMES.has(s) ? s : 'NEUTRAL';
}

// Escape `$` so it never participates in math pairing. Used for prose only.
function escapeProseDollars(s) {
  return String(s || '').replace(/\$/g, '\\$');
}

// Strip wrapping `$$` or `$...$` from a model-supplied LaTeX field so we can
// re-wrap it ourselves with the right delimiter. Also drops any markdown
// formatting the model accidentally placed inside the math.
function cleanLatex(s) {
  let t = String(s || '').trim();
  t = t.replace(/^\$\$([\s\S]*)\$\$$/, '$1').replace(/^\$([\s\S]*)\$$/, '$1').trim();
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(?<!\\)\*([^*\n]+)\*/g, '$1');
  return t;
}

// Render a value that may be:
//   - a string (legacy / fallback): escape prose; also support inline [[MATH:..]] markers.
//   - an array of { type, value } parts.
function renderInline(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (!part) return '';
        if (typeof part === 'string') return renderInline(part);
        const type = String(part.type || 'text').toLowerCase();
        const v = part.value ?? part.text ?? '';
        if (type === 'math') {
          const latex = cleanLatex(v);
          return latex ? `$${latex}$` : '';
        }
        return escapeProseDollars(v);
      })
      .join('');
  }
  // String fallback: support legacy [[MATH:..]] markers.
  const parts = String(value).split(/(\[\[MATH:[^\]]+\]\])/g);
  return parts
    .map((p) => {
      const m = p.match(/^\[\[MATH:([^\]]+)\]\]$/);
      if (m) return `$${cleanLatex(m[1])}$`;
      return escapeProseDollars(p);
    })
    .join('');
}

function renderSection(section) {
  if (!section) return '';
  const lines = [];
  if (section.heading) {
    lines.push(`**${escapeProseDollars(section.heading)}**`);
  }
  if (section.body !== undefined && section.body !== null) {
    const rendered = renderInline(section.body);
    if (rendered) lines.push(rendered);
  }
  if (Array.isArray(section.bullets) && section.bullets.length) {
    for (const b of section.bullets) {
      if (b == null) continue;
      const rendered = renderInline(b);
      if (rendered) lines.push(`- ${rendered}`);
    }
  }
  if (section.math) {
    const latex = cleanLatex(section.math);
    if (latex) lines.push(`$$\n${latex}\n$$`);
  }
  return lines.join('\n');
}

function renderMcq(mcq) {
  if (!mcq || !mcq.stem) return '';
  const stem = renderInline(mcq.stem);
  const opts = Array.isArray(mcq.options) ? mcq.options : [];
  const lines = ['**Practice Question**', stem];
  const labels = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < Math.min(opts.length, 4); i += 1) {
    const o = opts[i];
    const label = (o && typeof o.label === 'string' && /^[A-D]$/i.test(o.label.trim())
      ? o.label.trim().toUpperCase()
      : labels[i]);
    const txt = renderInline(o?.text ?? '');
    lines.push(`${label}) ${txt}`);
  }
  return lines.join('\n\n');
}

export function renderStructuredReply(reply) {
  const outcome = normalizeOutcome(reply?.outcome);
  const blocks = [];

  if (reply?.intro !== undefined && reply?.intro !== null) {
    const rendered = renderInline(reply.intro);
    if (rendered) blocks.push(rendered);
  }
  if (Array.isArray(reply?.sections)) {
    for (const s of reply.sections) {
      const rendered = renderSection(s);
      if (rendered) blocks.push(rendered);
    }
  }
  if (reply?.mcq) {
    const rendered = renderMcq(reply.mcq);
    if (rendered) blocks.push(rendered);
  }

  const body = blocks.filter(Boolean).join('\n\n').trim();
  return `[OUTCOME:${outcome}]\n${body}`;
}

// Reusable inline-prose schema: array of typed parts so the model literally
// cannot smuggle raw LaTeX into prose. Strings are also accepted at render
// time for backward compatibility, but the schema steers toward array form.
const INLINE_PROSE_SCHEMA = {
  type: 'array',
  description:
    'Inline prose as an ordered list of parts. Use {type:"text"} for words/punctuation/currency and {type:"math"} for any LaTeX expression. NEVER put LaTeX inside a text part.',
  items: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['text', 'math'] },
      value: {
        type: 'string',
        description:
          'For type=text: plain prose, e.g. "The current yield equals ". For type=math: raw LaTeX with no $ wrappers, e.g. "\\\\frac{C}{P}".',
      },
    },
    required: ['type', 'value'],
  },
};

export const SUBMIT_REPLY_TOOL = {
  name: 'submit_reply',
  description:
    'Return your reply as a structured object. The host renders it to markdown. All prose fields are arrays of {type, value} parts: use type="text" for words and type="math" for any LaTeX expression. The host wraps math in $..$ and escapes currency. NEVER write $..$, $$..$$, **bold**, or *italic* in any string.',
  input_schema: {
    type: 'object',
    properties: {
      outcome: {
        type: 'string',
        enum: ['CORRECT', 'NEEDS_WORK', 'NEUTRAL'],
        description:
          'CORRECT/NEEDS_WORK only when grading a learner answer; otherwise NEUTRAL.',
      },
      intro: {
        ...INLINE_PROSE_SCHEMA,
        description:
          'Opening paragraph as parts. Example: [{"type":"text","value":"Use "},{"type":"math","value":"\\\\frac{C}{P}"},{"type":"text","value":" to find current yield."}]',
      },
      sections: {
        type: 'array',
        description: 'Body sections rendered in order.',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string', description: 'Optional section title (plain text).' },
            body: {
              ...INLINE_PROSE_SCHEMA,
              description:
                'Paragraph as parts. Use type="math" for any LaTeX (no $ wrappers). Currency like "$1,000" goes in a text part.',
            },
            bullets: {
              type: 'array',
              description: 'Optional bullet list. Each bullet is an inline-prose parts array.',
              items: INLINE_PROSE_SCHEMA,
            },
            math: {
              type: 'string',
              description:
                'Optional displayed equation in raw LaTeX (no $$ wrapper, no markdown). The host wraps it in $$..$$.',
            },
          },
        },
      },
      mcq: {
        type: 'object',
        description: 'Optional ending multiple-choice question (4 options A-D).',
        properties: {
          stem: {
            ...INLINE_PROSE_SCHEMA,
            description: 'Question stem as parts. Use type="math" for inline LaTeX.',
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                text: {
                  ...INLINE_PROSE_SCHEMA,
                  description: 'Option text as parts. Use type="math" for inline LaTeX.',
                },
              },
              required: ['label', 'text'],
            },
            minItems: 4,
            maxItems: 4,
          },
        },
        required: ['stem', 'options'],
      },
    },
    required: ['outcome', 'intro'],
  },
};
