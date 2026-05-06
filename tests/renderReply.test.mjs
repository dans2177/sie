import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderStructuredReply } from '../api/_renderReply.js';

test('basic intro + outcome tag', () => {
  const out = renderStructuredReply({
    outcome: 'NEUTRAL',
    intro: 'Current yield is annual coupon divided by market price.',
  });
  assert.match(out, /^\[OUTCOME:NEUTRAL\]\n/);
  assert.match(out, /annual coupon divided by market price/);
});

test('escapes bare $ in prose so it cannot trigger math', () => {
  const out = renderStructuredReply({
    outcome: 'NEUTRAL',
    intro: 'A bond has a par value of $1,000 and trades at $6,800.',
  });
  // Both $ should be escaped.
  assert.ok(!/(?<!\\)\$\d/.test(out), `unescaped currency in: ${out}`);
  assert.match(out, /\\\$1,000/);
  assert.match(out, /\\\$6,800/);
});

test('inline [[MATH:...]] markers become $..$ wrapped', () => {
  const out = renderStructuredReply({
    outcome: 'NEUTRAL',
    intro: 'Use [[MATH:\\frac{C}{P}]] to find current yield.',
  });
  assert.match(out, /\$\\frac\{C\}\{P\}\$/);
});

test('section.math becomes a $$..$$ display block', () => {
  const out = renderStructuredReply({
    outcome: 'NEUTRAL',
    intro: 'Step through it:',
    sections: [
      { heading: 'Formula', math: '\\text{Current Yield} = \\frac{C}{P}' },
    ],
  });
  assert.match(out, /\*\*Formula\*\*/);
  assert.match(out, /\$\$\n\\text\{Current Yield\} = \\frac\{C\}\{P\}\n\$\$/);
});

test('mcq renders 4 options on separate lines', () => {
  const out = renderStructuredReply({
    outcome: 'NEUTRAL',
    intro: 'Try this.',
    mcq: {
      stem: 'A bond has par $1,000 and trades at $6,800. Coupon is 4%. What is current yield?',
      options: [
        { label: 'A', text: '4.0%' },
        { label: 'B', text: '5.9%' },
        { label: 'C', text: '6.0%' },
        { label: 'D', text: '6.8%' },
      ],
    },
  });
  // Each option separated by blank line for markdown.
  assert.match(out, /A\) 4\.0%\n\nB\) 5\.9%\n\nC\) 6\.0%\n\nD\) 6\.8%/);
  // Currency in stem is escaped.
  assert.match(out, /\\\$1,000/);
  assert.match(out, /\\\$6,800/);
});

test('strips $..$ delimiters the model wrongly put in math fields', () => {
  const out = renderStructuredReply({
    outcome: 'NEUTRAL',
    intro: 'x',
    sections: [{ math: '$$\\frac{1}{2}$$' }],
  });
  assert.match(out, /\$\$\n\\frac\{1\}\{2\}\n\$\$/);
});

test('coerces invalid outcome to NEUTRAL', () => {
  const out = renderStructuredReply({ outcome: 'BANANAS', intro: 'hi' });
  assert.match(out, /^\[OUTCOME:NEUTRAL\]/);
});

test('full example produces clean markdown with no broken delimiters', () => {
  const out = renderStructuredReply({
    outcome: 'NEEDS_WORK',
    intro: 'Your answer of 4.5% is close, but you divided by par instead of market price.',
    sections: [
      {
        heading: 'Correct path',
        bullets: [
          'Annual coupon = [[MATH:5{,}000 \\times 0.042 = 210]]',
          'Current yield = [[MATH:\\frac{210}{4{,}650} = 4.516\\%]]',
        ],
      },
      {
        heading: '[EXAM TIP]',
        body: 'Always anchor the denominator to market price, not par. Trap: dividing $1,000 by $4,650 instead of using the actual price.',
      },
    ],
    mcq: {
      stem: 'A bond pays $50 annual coupon and trades at $1,000. Current yield?',
      options: [
        { label: 'A', text: '4.5%' },
        { label: 'B', text: '5.0%' },
        { label: 'C', text: '5.5%' },
        { label: 'D', text: '6.0%' },
      ],
    },
  });

  // No bare $digit in prose (currency must be escaped). Strip $..$ math first
  // so legit math expressions like $5{,}000 \times ...$ don't false-trigger.
  const prose = out.replace(/\$[^$\n]+?\$/g, '').replace(/\$\$[\s\S]+?\$\$/g, '');
  assert.ok(!/(?<!\\)\$\d/.test(prose), `bare currency in prose: ${prose}`);
  // MCQ split.
  assert.match(out, /A\) 4\.5%\n\nB\) 5\.0%/);
  // Math markers expanded.
  assert.match(out, /\$\\frac\{210\}\{4\{,\}650\} = 4\.516\\%\$/);
  // Outcome tag.
  assert.match(out, /^\[OUTCOME:NEEDS_WORK\]/);
});
