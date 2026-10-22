import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertArchiveIntegrity } from '../src/lib/archive.ts';
import { safeMarkdownToHtml } from '../src/lib/safe-text.ts';

const fixture = () => ({data: JSON.parse(fs.readFileSync(new URL('../src/content/posts/life/2026-09-21.json', import.meta.url), 'utf8'))});

const letterFixture = () => {
  const p = fixture();
  p.data.entryType = 'letter';
  p.data.sources = [{ id: 'reviewed-handwritten-letter', type: 'user-recollection', certainty: 'confirmed', label: '자필 원본 대조 판독본' }];
  p.data.messages = [{ ...p.data.messages[0], sourceKind: 'letter-transcript', sourceRefs: [p.data.sources[0].id], sourceMessageId: 'reviewed-handwritten-letter-text', sourceOrdinal: 1 }];
  p.data.amendments = [];
  return p;
};

test('a complete original-checked handwritten letter may stand alone without a GPT reply', () => {
  assert.doesNotThrow(() => assertArchiveIntegrity([letterFixture()]));
});

test('ordinary conversation inputs still cannot be published without a reply', () => {
  const p = fixture();
  p.data.messages = [p.data.messages[0]];
  p.data.amendments = [];
  assert.throws(() => assertArchiveIntegrity([p]), /must contain a complete conversation/);
});

test('the handwritten-letter exception requires its dedicated source authority and entry type', () => {
  for (const mutate of [
    (p) => { p.data.entryType = 'clinical-update'; },
    (p) => { p.data.sources[0].type = 'caregiver-observation'; },
    (p) => { p.data.sources[0].type = 'chat-conversation'; },
    (p) => { p.data.sources[0].certainty = 'reported'; },
  ]) {
    const p = letterFixture();
    mutate(p);
    assert.throws(() => assertArchiveIntegrity([p]), /no verified archival source/);
  }
});

test('a letter transcript cannot be reassigned to a GPT role', () => {
  const p = letterFixture();
  const m = p.data.messages[0];
  Object.assign(m, { role: 'assistant', text: m.original, textSha256: m.originalSha256, references: [] });
  assert.throws(() => assertArchiveIntegrity([p]), /no verified archival source/);
});

test('standalone letters retain the source-verification and complete-text hash requirements', () => {
  const unverified = letterFixture();
  unverified.data.messages[0].sourceVerified = false;
  assert.throws(() => assertArchiveIntegrity([unverified]), /completeness was not source-verified/);
  const changed = letterFixture();
  changed.data.messages[0].original += '\n추가된 문장';
  assert.throws(() => assertArchiveIntegrity([changed]), /original hash mismatch/);
});

test('a privacy-reviewed letter may keep only its public transcription, never a private original', () => {
  const p = letterFixture();
  const m = p.data.messages[0];
  Object.assign(m, {
    fidelity: 'privacy-redacted',
    publicText: m.original,
    publicTextSha256: m.originalSha256,
    privacyRedactions: ['image'],
    privacyNote: '자필 원본 사진은 비공개이며 공개용 판독본만 보존했습니다.',
  });
  for (const field of ['original', 'originalSha256', 'corrected', 'correctionPolicy']) delete m[field];
  assert.doesNotThrow(() => assertArchiveIntegrity([p]));
  m.original = '공개하면 안 되는 비공개 원문';
  assert.throws(() => assertArchiveIntegrity([p]), /must contain only a verified public copy/);
});

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

test('a complete writing block inside an answer renders without its UI wrapper', () => {
  const original = '앞의 설명\n\n:::writing{variant="standard" id="84219"}\n선진아, 힘내자.\n\n<script>비공개 실행</script>\n:::\n\n뒤의 설명';
  const html = safeMarkdownToHtml(original);
  assert.match(html, /앞의 설명/);
  assert.match(html, /선진아, 힘내자/);
  assert.match(html, /뒤의 설명/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /:::writing|variant=|84219|<script>/);
  assert.match(original, /:::writing/);
  assert.match(safeMarkdownToHtml(':::writing{variant="standard"}\n닫히지 않은 블록'), /:::writing/);
});

test('GenUI citations resolve without changing the archived source text', () => {
  const marker = 'genui{"citation":{"refs":["turn1view0","turn2view0"]}}';
  const original = '설명 ' + marker;
  const html = safeMarkdownToHtml(original, [{marker, urls: ['https://example.org/one', 'https://example.org/two']}]);
  assert.match(html, /href="https:\/\/example.org\/one"/);
  assert.match(html, /href="https:\/\/example.org\/two"/);
  assert.doesNotMatch(html, /genui|turn1view0|turn2view0/);
  assert.equal(original, '설명 ' + marker);
});

test('unresolved GenUI citations are disclosed rather than silently removed', () => {
  const original = '설명 genui{"citation":{"ref":"turn1view0"}}';
  for (const markers of [undefined, [{marker: original.slice(3), urls: []}]]) {
    const html = safeMarkdownToHtml(original, markers);
    assert.match(html, /당시 출처 연결 미확인/);
    assert.doesNotMatch(html, /genui|turn1view0/);
  }
});
