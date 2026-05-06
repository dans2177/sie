import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMathDelimiters } from '../api/_sanitizeMath.js';

test('strips markdown bold inside inline math', () => {
  const input = 'Current Yield = $210 ** / **4{,}650 = 4.52\\%$';
  const out = sanitizeMathDelimiters(input);
  assert.ok(!/\*\*/.test(out), `expected no ** in output, got: ${out}`);
  assert.match(out, /\$210\s*\/\s*4\{,\}650\s*=\s*4\.52\\%\$/);
});

test('unwraps inline math that is actually prose', () => {
  const input = 'students divide by par value $(5,000) instead of market price (4,650)$.';
  const out = sanitizeMathDelimiters(input);
  assert.ok(!/\$/.test(out.replace(/\\\$/g, '')), `should have no math delimiters, got: ${out}`);
  assert.match(out, /instead of market price/);
});

test('unwraps block math that is actually prose', () => {
  const input = '$$The bond is trading at a discount today$$';
  const out = sanitizeMathDelimiters(input);
  assert.equal(out, 'The bond is trading at a discount today');
});

test('keeps real math expressions intact', () => {
  const input = 'Use $\\frac{C}{P}$ to compute current yield.';
  const out = sanitizeMathDelimiters(input);
  assert.equal(out, input);
});

test('keeps single-variable math like $YTM$ intact', () => {
  const input = 'Solve for $YTM$ next.';
  const out = sanitizeMathDelimiters(input);
  assert.equal(out, input);
});

test('drops orphan trailing $ when count is odd', () => {
  // Model wrote: $5,000 \times 4.2\% = \$210$  -> after escape pass the trailing $ is orphaned.
  const input = '1. Find the annual coupon: $5{,}000 \\times 4.2\\% = \\$210$';
  const out = sanitizeMathDelimiters(input);
  // No orphan unmatched dollars.
  const dollars = (out.match(/(?<!\\)\$/g) || []).length;
  assert.equal(dollars % 2, 0, `unbalanced $ in: ${out}`);
});

test('balances unmatched ** on a single line', () => {
  const input = 'The price is **important here.';
  const out = sanitizeMathDelimiters(input);
  assert.ok(!/\*\*/.test(out), `expected no leftover ** in: ${out}`);
});

test('preserves matched **bold** prose', () => {
  const input = 'The **price** is important.';
  const out = sanitizeMathDelimiters(input);
  assert.equal(out, input);
});

test('escaped currency \\$N is preserved as plain $N', () => {
  const input = 'Pay \\$5{,}000 today.';
  const out = sanitizeMathDelimiters(input);
  assert.equal(out, 'Pay $5{,}000 today.');
});

test('does not corrupt a clean explanation block', () => {
  const input = [
    'Step 1: Annual Coupon = $5{,}000 \\times 4.21\\%$',
    'Step 2: Current Yield = $\\frac{210}{4{,}650}$',
    'Step 3: Convert to a percentage rounded to two decimal places.',
  ].join('\n');
  const out = sanitizeMathDelimiters(input);
  assert.equal(out, input);
});

test('regression: full broken tutor reply heals to no orphans', () => {
  const input = [
    "Your answer of 4.5% is very close, which tells me you had the right idea — but you likely **rounded too early** (perhaps dividing $210 by 4,700$ or a similar slip).",
    "Step 1: Annual Coupon = $5,000 \\times 4.2\\10**",
    "Step 2: Current Yield = $210 \\div **4,650**$ (the actual market price — not par)",
    "[EXAM TIP] The #1 trap here: students accidentally divide by par $(5,000) instead of market price (4,650)$ — always use what the bond is trading for.",
  ].join('\n');
  const out = sanitizeMathDelimiters(input);
  // Balanced delimiters.
  const dollars = (out.match(/(?<!\\)\$/g) || []).length;
  assert.equal(dollars % 2, 0, `unbalanced $ in: ${out}`);
  // No bold leak inside what's left of math.
  for (const m of out.matchAll(/\$([^$\n]+?)\$/g)) {
    assert.ok(!/\*\*/.test(m[1]), `bold inside math: ${m[0]}`);
  }
  // Prose phrase unwrapped.
  assert.match(out, /instead of market price/);
});

test('idempotent: running twice produces same output', () => {
  const input = 'Coupon $5,000 \\times 4.2\\% = \\$210$ instead of $par price$';
  const once = sanitizeMathDelimiters(input);
  const twice = sanitizeMathDelimiters(once);
  assert.equal(twice, once);
});

test('unwraps paired currency $1,000 ... $6,800 written as bare prose', () => {
  const input = 'A bond has a par value of $1,000 and trades at $6,800. What is its current yield?';
  const out = sanitizeMathDelimiters(input);
  // No paired math should remain that captures the prose between the two currency markers.
  // The "and trades at" must NOT be inside a $...$ pair.
  const matches = [...out.matchAll(/\$([^$\n]+?)\$/g)];
  for (const m of matches) {
    assert.ok(!/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(m[1]), `prose captured in math: ${m[0]}`);
  }
});

test('unwraps adjacent currency-only pair $1,000$', () => {
  const input = 'Pay $1,000$ today.';
  const out = sanitizeMathDelimiters(input);
  assert.match(out, /\$1,000/);
  // No math span left.
  assert.equal((out.match(/(?<!\\)\$/g) || []).length, 1);
});

test('does not unwrap real math like $x + 1$', () => {
  const input = 'Solve $x + 1 = 2$ for x.';
  const out = sanitizeMathDelimiters(input);
  assert.equal(out, input);
});

test('streaming partial: question line with A) only does not break later options', () => {
  // Mid-stream snapshot: model has emitted up through option A, with bare currency
  // earlier in the message creating an open math run.
  const input = [
    'A bond has a par value of $1,000 and trades at $6,800.',
    'A) 6.0%',
  ].join('\n');
  const out = sanitizeMathDelimiters(input);
  // Option A label must still be present (not swallowed by an unclosed math run).
  assert.match(out, /A\) 6\.0%/);
});

