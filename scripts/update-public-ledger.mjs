import { createHash } from 'node:crypto';
import { readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ledgerPath = resolve('src/data/import-ledger.json');
const postsRoot = resolve('src/content/posts');
const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));

if (ledger.auditPolicy?.mode !== 'public-safe-aggregate') {
  throw new Error('Refusing to replace a ledger that is not explicitly marked public-safe-aggregate');
}

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const aggregateCounter = /^(?:withheld|excluded).*(?:Count)$/;
const previousByBoard = new Map((ledger.imports ?? []).map((entry) => [entry.board, entry]));
const imports = [];
const throughDates = [];

for (const board of Object.keys(ledger.boards ?? {})) {
  if (board === 'media') continue;

  let filenames;
  try {
    filenames = (await readdir(join(postsRoot, board))).filter((name) => name.endsWith('.json')).sort();
  } catch (error) {
    if (error?.code === 'ENOENT') continue;
    throw error;
  }

  const posts = [];
  for (const filename of filenames) {
    const post = JSON.parse(await readFile(join(postsRoot, board, filename), 'utf8'));
    if (post.board !== board) throw new Error(`Board mismatch in ${board}/${filename}`);
    if (post.status === 'published') {
      if (!post.privacyReviewed) throw new Error(`Published post lacks privacy review: ${post.recordId}`);
      posts.push(post);
    }
  }
  if (!posts.length) continue;

  const messages = posts.flatMap((post) => post.messages);
  const throughDate = posts.map((post) => post.recordedAt.start.slice(0, 10)).sort().at(-1);
  const sourceKindCounts = {};
  for (const message of messages) {
    const sourceKind = message.sourceKind ?? 'conversation-message';
    sourceKindCounts[sourceKind] = (sourceKindCounts[sourceKind] ?? 0) + 1;
  }

  const previous = previousByBoard.get(board);
  const aggregateCounts = Object.fromEntries(
    Object.entries(previous?.selection ?? {}).filter(([key]) => aggregateCounter.test(key)),
  );
  const selection = {
    publishedPostCount: posts.length,
    publishedMessageCount: messages.length,
    publishedUserMessageCount: messages.filter((message) => message.role === 'user').length,
    publishedAssistantMessageCount: messages.filter((message) => message.role === 'assistant').length,
    correctedUserMessageCount: messages.filter((message) => message.role === 'user' && message.corrected).length,
    sourceKindCounts,
    ...aggregateCounts,
    publishedContentSha256: sha256(posts.map((post) => JSON.stringify(post)).join('\n')),
  };

  imports.push({
    id: `${board}-public-archive-${throughDate}`,
    board,
    throughDate,
    publication: previous?.publication ?? {
      status: 'published',
      privacyReviewed: true,
      publicPreviewAuthorizedByUser: true,
    },
    selection,
    posts: posts.map((post) => post.recordId),
  });
  ledger.boards[board].status = `published-through-${throughDate}`;
  throughDates.push(throughDate);
}

ledger.schemaVersion = 2;
ledger.lastUpdated = throughDates.sort().at(-1);
ledger.imports = imports;

const serialized = `${JSON.stringify(ledger, null, 2)}\n`;
const forbiddenKey = /"(?:sourceMessageId|currentNode|rawSnapshotSha256|visibleSequenceSha256|completeSequenceSha256|sourceTextSha256|sourceRecordSha256)"\s*:/;
if (forbiddenKey.test(serialized) || /chatgpt\.com\/share\//i.test(serialized)) {
  throw new Error('Refusing to write private source identifiers or locators to the public ledger');
}

const temporaryPath = `${ledgerPath}.tmp-${process.pid}`;
try {
  await writeFile(temporaryPath, serialized, { encoding: 'utf8', flag: 'wx' });
  await rename(temporaryPath, ledgerPath);
} catch (error) {
  await rm(temporaryPath, { force: true });
  throw error;
}

console.log(`Public import ledger refreshed for ${imports.length} boards through ${ledger.lastUpdated}.`);
