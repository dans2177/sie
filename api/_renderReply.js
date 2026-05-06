// Render a structured `submit_reply` tool result into clean markdown.
// This is the ONLY place LaTeX/markdown delimiters are produced server-side,
// so the output is guaranteed well-formed regardless of what the model said.

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
  t = t.replace(/^\$\$|\$\$$/g, '').replace(/^\$|\$$/g, '').trim();
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(?<!\\)\*([^*\n]+)\*/g, '$1');
  return t;
}

function renderInline(text) {
  // Inline math comes in as a marker `[[MATH:latex]]` from the structured prose
  // field; everything else is escaped prose.
  if (!text) return '';
  const parts = String(text).split(/(\[\[MATH:[^\]]+\]\])/g);
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
  if (section.body) {
    lines.push(renderInline(section.body));
  }
  if (Array.isArray(section.bullets) && section.bullets.length) {
    for (const b of section.bullets) {
      if (!b) continue;
      lines.push(`- ${renderInline(b)}`);
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
  // Markdown-friendly: blank lines between blocks so options render on separate lines.
  return lines.join('\n\n');
}

export function renderStructuredReply(reply) {
  const outcome = normalizeOutcome(reply?.outcome);
  const blocks = [];

  if (reply?.intro) {
    blocks.push(renderInline(reply.intro));
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

// Schema description shared with the prompt + Anthropic tool definition.
export const SUBMIT_REPLY_TOOL = {
  name: 'submit_reply',
  description:
    'Return your reply as a structured object. The host renders it to markdown — do NOT format with LaTeX delimiters or markdown bold/italic; use the schema fields instead.',
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
        type: 'string',
        description:
          'Opening prose paragraph. Plain text. For inline math, use the marker [[MATH:latex]] (e.g. "Use [[MATH:\\\\frac{C}{P}]] to find current yield"). Do NOT write $..$ or **bold** here.',
      },
      sections: {
        type: 'array',
        description: 'Body sections rendered in order.',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string', description: 'Optional bold section title.' },
            body: {
              type: 'string',
              description:
                'Prose paragraph. Use [[MATH:latex]] for inline math. No $.. delimiters, no **bold**.',
            },
            bullets: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional bullet list. Each bullet is plain prose; use [[MATH:latex]] for inline math.',
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
          stem: { type: 'string', description: 'Question prose. Use [[MATH:latex]] for inline math.' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                text: { type: 'string' },
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
