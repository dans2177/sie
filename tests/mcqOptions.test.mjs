import { test } from 'node:test';
import assert from 'node:assert/strict';

// Re-implement the same MCQ-splitting transform from api/topic-ai.js so we can
// unit-test it without importing the full handler (which has runtime deps).
function splitMcqOptions(text) {
  let out = String(text || '');
  out = out
    .split('\n')
    .map((line) => {
      const labels = line.match(/(?:^|\s)[A-D]\)\s/g) || [];
      if (labels.length >= 2) {
        return line.replace(/\s+([A-D]\)\s)/g, '\n$1').trim();
      }
      return line;
    })
    .join('\n');
  out = out.replace(/([^\n])\n([A-D]\) )/g, '$1\n\n$2');
  out = out.replace(/^([A-D]\) .+)\n([A-D]\) )/gm, '$1\n\n$2');
  return out;
}

test('splits A) B) C) D) joined on a single line', () => {
  const input = 'Which party? A) Common B) Subordinated C) Trade creditors D) Mortgage';
  const out = splitMcqOptions(input);
  const lines = out.split('\n').filter(Boolean);
  // First line is the question, then each option on its own line separated by blanks.
  assert.match(out, /Which party\?\n\nA\) Common/);
  assert.match(out, /A\) Common\n\nB\) Subordinated/);
  assert.match(out, /B\) Subordinated\n\nC\) Trade creditors/);
  assert.match(out, /C\) Trade creditors\n\nD\) Mortgage/);
  // 5 non-empty content blocks.
  assert.equal(lines.length, 5);
});

test('leaves already-formatted options alone', () => {
  const input = ['Question?', 'A) one', 'B) two', 'C) three', 'D) four'].join('\n');
  const out = splitMcqOptions(input);
  // Should still have each option on its own line (with blanks between).
  assert.match(out, /A\) one\n\nB\) two/);
  assert.match(out, /C\) three\n\nD\) four/);
});

test('does not split a single option mention in prose', () => {
  const input = 'Choose A) carefully and consider context.';
  const out = splitMcqOptions(input);
  assert.equal(out, input);
});
