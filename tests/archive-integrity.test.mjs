import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertArchiveIntegrity } from '../src/lib/archive.ts';
import { safeMarkdownToHtml } from '../src/lib/safe-text.ts';

const fixture = () => ({data: JSON.parse(fs.readFileSync(new URL('../src/content/posts/life/2026-09-21.json', import.meta.url), 'utf8'))});

test('verified source sequence may preserve a disclosed timestamp inversion', () => {
  const p = fixture();
  p.data.messages[1].recordedAt.start = '2026-09-21T23:37:30+09:00';
  p.data.messages[1].sourceOrderNote = '원문 순서와 시각을 각각 보존했습니다.';
  assert.doesNotThrow(() => assertArchiveIntegrity([p]));
});

test('timestamp inversion without review remains invalid', () => {
  const p = fixture();
  p.data.messages[1].recordedAt.start = '2026-09-21T23:37:30+09:00';
  assert.throws(() => assertArchiveIntegrity([p]), /not chronological/);
});

test('a note cannot authorize reversed source ordinals', () => {
  const p = fixture();
  p.data.messages[1].sourceOrdinal = 3;
  p.data.messages[1].sourceOrderNote = '순서 검토';
  assert.throws(() => assertArchiveIntegrity([p]), /contradict source order/);
});

test('a note cannot authorize cross-source timestamp inversion', () => {
  const p = fixture();
  const source = {...p.data.sources[0], id: 'different-source'};
  p.data.sources.push(source);
  p.data.messages[1].sourceRefs = [source.id];
  p.data.messages[1].recordedAt.start = '2026-09-21T23:37:30+09:00';
  p.data.messages[1].sourceOrderNote = '순서 검토';
  assert.throws(() => assertArchiveIntegrity([p]), /not chronological/);
});

test('private attachment citation is a disclosure, not a dangling UI token', () => {
  const original = '내용 fileciteturn4file0';
  const html = safeMarkdownToHtml(original);
  assert.match(html, /당시 첨부 참조 · 원본 비공개/);
  assert.doesNotMatch(html, /filecite|turn4file0/);
  assert.equal(original, '내용 fileciteturn4file0');
});

test('source presentation keeps HTML escaped and omits interface controls', () => {
  const html = safeMarkdownToHtml('<script>alert(1)</script>\ngenui{"suggest_automation":{"label":"시험"}}');
  assert.doesNotMatch(html, /<script>|genui|suggest_automation/);
  assert.match(html, /&lt;script&gt;/);
});
