import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionStatus, formatCountdown } from '../src/scripts/app.js';

test('Exam mode helpers format countdown values', () => {
  const label = formatCountdown('2026-03-17T11:00:00Z', new Date('2026-03-17T10:59:01Z'));
  assert.equal(label, '00:59');
});

test('Exam mode helpers describe hidden feedback', () => {
  assert.match(buildSessionStatus({ mode: 'exam' }), /hides feedback/);
});
