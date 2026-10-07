// Read-only regression checks for the reviewed October 8 archive update.
// No shared conversation locators, raw snapshots or private hashes belong here.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = 'src/content/posts';
const files = readdirSync(root, { recursive: true }).filter(f => f.endsWith('.json'));
const posts = files.map(f => JSON.parse(readFileSync(`${root}/${f}`, 'utf8')));
const ledger = JSON.parse(readFileSync('src/data/import-ledger.json', 'utf8'));
const hash = text => 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex');
const records = new Set([...files.map(f => f.replace(/\.json$/, '')), ...posts.map(p => p.recordId)]);
const ids = new Set(), ordinals = new Set();
let messageCount = 0;
for (const post of posts) {
  assert(post.privacyReviewed && post.status === 'published');
  for (const related of post.related) assert(records.has(related), `Unknown related record: ${related}`);
  for (const m of post.messages) {
    messageCount++;
    assert(!ids.has(m.sourceMessageId), 'Duplicate source message'); ids.add(m.sourceMessageId);
    const key = m.sourceRefs[0] + ':' + m.sourceOrdinal;
    assert(!ordinals.has(key), 'Duplicate source ordinal'); ordinals.add(key);
    const text = m.role === 'assistant' ? m.text : m.publicText ?? m.original;
    assert.equal(m.role === 'assistant' ? m.textSha256 : m.publicTextSha256 ?? m.originalSha256, hash(text));
  }
}
assert.equal(posts.length, 133);
assert.equal(messageCount, 798);
for (const entry of ledger.imports) {
  const boardPosts = posts.filter(p => p.board === entry.board);
  assert.equal(entry.selection.publishedPostCount, boardPosts.length);
  assert.equal(entry.selection.publishedMessageCount, boardPosts.reduce((n,p) => n+p.messages.length,0));
}
assert.equal(ledger.imports.find(e => e.board === 'medical').selection.withheldIncompleteExchangeCount, 1);
assert.equal(ledger.imports.find(e => e.board === 'medical').selection.withheldIncompleteMessageCount, 2);
assert.equal(ledger.imports.find(e => e.board === 'life').selection.withheldIncompleteExchangeCount, undefined);
const hospitalData = JSON.parse(readFileSync('src/data/rehab-hospitals.json', 'utf8'));
assert.equal(hospitalData.reviewedAsOf, '2026-10-07');
assert.equal(hospitalData.hospitals.find(h => h.id === 'asan').appointment.label, '외래 취소 완료 기록');
assert.match(hospitalData.hospitals.find(h => h.id === 'hanyang').appointment.label, /잠정/);
assert.match(hospitalData.hospitals.find(h => h.id === 'nrc').appointment.label, /대기/);
for (const hospital of hospitalData.hospitals) for (const source of hospital.sources) {
  const post = JSON.parse(readFileSync(`${root}/${source.postId}.json`, 'utf8'));
  assert(post.messages.some(m => m.id === source.messageId));
}
console.log(`Reviewed update verified: ${posts.length} posts / ${messageCount} messages; hospital status links valid.`);
