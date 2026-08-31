import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((item) => {
    const [key, ...value] = item.replace(/^--/, '').split('=');
    return [key, value.join('=')];
  }),
);

const required = ['phase1', 'phase1-references', 'phase2', 'phase2-turns', 'phase2-manifest', 'phase3', 'phase3-manifest', 'corrections-phase2', 'corrections-phase3', 'verified-at'];
const missingArgs = required.filter((key) => !args[key]);
if (missingArgs.length) {
  console.error(`Missing arguments: ${missingArgs.join(', ')}`);
  process.exit(1);
}

const verifiedAt = args['verified-at'];
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?\+09:00$/.test(verifiedAt)) {
  throw new Error('--verified-at must be an ISO 8601 timestamp with the +09:00 offset');
}
const publishReviewed = args['publish-reviewed'] === 'true';

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
const readText = async (path) => readFile(resolve(path), 'utf8');
const sha256Hex = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const sha256 = (value) => `sha256:${sha256Hex(value)}`;
const stableSha256 = (value) => sha256Hex(JSON.stringify(value));
const stamp = (start, precision = 'minute') => ({ start, precision, timezone: 'Asia/Seoul' });
const verificationStamp = stamp(verifiedAt);

function epochToKstMicros(epochSeconds) {
  if (!Number.isFinite(epochSeconds)) throw new Error(`Invalid source timestamp: ${epochSeconds}`);
  let wholeSeconds = Math.floor(epochSeconds);
  let micros = Math.round((epochSeconds - wholeSeconds) * 1_000_000);
  if (micros === 1_000_000) {
    wholeSeconds += 1;
    micros = 0;
  }
  const kstClock = new Date((wholeSeconds + 9 * 60 * 60) * 1000).toISOString().slice(0, 19);
  return `${kstClock}.${String(micros).padStart(6, '0')}+09:00`;
}

const [
  phase1,
  phase1References,
  phase2Raw,
  phase2TurnsRaw,
  phase2Manifest,
  phase3,
  phase3Manifest,
  phase2Corrections,
  phase3Corrections,
] = await Promise.all([
  readJson(args.phase1),
  readJson(args['phase1-references']),
  readText(args.phase2),
  readText(args['phase2-turns']),
  readJson(args['phase2-manifest']),
  readJson(args.phase3),
  readJson(args['phase3-manifest']),
  readJson(args['corrections-phase2']),
  readJson(args['corrections-phase3']),
]);
const phase2 = JSON.parse(phase2Raw);
const phase2Turns = JSON.parse(phase2TurnsRaw);

if (phase1.summary.extracted_visible_text_record_count !== phase1.messages.length) {
  throw new Error('phase1 visible message count does not match its extraction summary');
}
for (const message of phase1.messages) {
  if (message.content_sha256 !== sha256Hex(message.content)) {
    throw new Error(`phase1 source text hash mismatch: ${message.message_id}`);
  }
}

const phase2StableHash = sha256Hex(
  JSON.stringify(
    phase2.messages.map((message) => ({
      node_id: message.node_id,
      message_id: message.message_id,
      role: message.author?.role,
      create_time: message.create_time,
      content: message.content,
    })),
  ),
);
if (
  phase2.messages.length !== phase2Manifest.selected_message_count ||
  sha256Hex(phase2Raw) !== phase2Manifest.output_files?.['messages.json']?.sha256 ||
  sha256Hex(phase2TurnsRaw) !== phase2Manifest.output_files?.['turns.json']?.sha256 ||
  phase2StableHash !== phase2Manifest.selected_messages_stable_sha256
) {
  throw new Error('phase2 messages or turns do not match the verified extraction manifest');
}

const phase3SequenceBlob = phase3
  .map((message) =>
    [
      String(message.linear_index),
      message.message_id,
      message.role,
      message.channel ?? '',
      String(message.create_time),
      message.text,
    ].join('\x1f'),
  )
  .join('\x1e');
if (
  phase3.length !== phase3Manifest.visible_user_assistant_text_count ||
  sha256Hex(phase3SequenceBlob) !== phase3Manifest.hashes.visible_text_ordered_sequence_sha256
) {
  throw new Error('phase3 messages do not match the verified extraction manifest');
}

const sources = {
  phase1: {
    id: 'chatgpt-trauma-phase-1',
    type: 'chat-conversation',
    certainty: 'confirmed',
    label: '중증 외상 예후 분석',
    accessedAt: verificationStamp,
  },
  phase2: {
    id: 'chatgpt-trauma-phase-2',
    type: 'chat-conversation',
    certainty: 'confirmed',
    label: '중증 외상 예후 분석 (phase2)',
    accessedAt: verificationStamp,
  },
  phase3: {
    id: 'chatgpt-trauma-phase-3',
    type: 'chat-conversation',
    certainty: 'confirmed',
    label: '중증 외상 예후 분석 (phase 3)',
    accessedAt: verificationStamp,
  },
};

function correctionMap(entries, sourceMessages, sourceName) {
  const sourceById = new Map(sourceMessages.map((message) => [message.message_id, message]));
  const map = new Map();
  for (const correction of entries) {
    const source = sourceById.get(correction.message_id);
    if (!source) throw new Error(`${sourceName} correction refers to an unknown message: ${correction.message_id}`);
    const original = source.text;
    if (sha256Hex(original) !== correction.original_sha256) {
      throw new Error(`${sourceName} correction hash mismatch: ${correction.message_id}`);
    }
    if (correction.changed !== (correction.corrected !== original)) {
      throw new Error(`${sourceName} correction changed flag mismatch: ${correction.message_id}`);
    }
    const originalNumbers = original.match(/\d+(?:[.,:/~-]\d+)*/g) ?? [];
    const correctedNumbers = correction.corrected.match(/\d+(?:[.,:/~-]\d+)*/g) ?? [];
    const originalUrls = original.match(/https?:\/\/[^\s<)]+/g) ?? [];
    const correctedUrls = correction.corrected.match(/https?:\/\/[^\s<)]+/g) ?? [];
    if (JSON.stringify(originalNumbers) !== JSON.stringify(correctedNumbers)) {
      throw new Error(`${sourceName} correction changed a number or date token: ${correction.message_id}`);
    }
    if (JSON.stringify(originalUrls) !== JSON.stringify(correctedUrls)) {
      throw new Error(`${sourceName} correction changed a URL: ${correction.message_id}`);
    }
    map.set(correction.message_id, correction);
  }
  return map;
}

const phase2CorrectionMap = correctionMap(phase2Corrections, phase2.messages, 'phase2');
const phase3CorrectionMap = correctionMap(phase3Corrections, phase3, 'phase3');

const phase1UniqueCorrections = new Map([
  [
    '8855f146-a577-4d70-85f9-8d099e3c68e8',
    {
      corrected:
        '선진이는 내일 기관절개하면서 기관내시경도 같이 시행한대. 그래서 그에 따른 부작용들에 대해 설명 들었어.. 이걸 동의해도 괜찮은 게 맞아?',
      changed: true,
      changes: [{ from: '설명들었어', to: '설명 들었어', count: 1, reason: 'unambiguous spacing correction' }],
    },
  ],
]);

// Some shared-message search metadata is stale or belongs to another branch. Only
// message/index pairs that were manually matched to the cited sentence are allowed.
const verifiedSearchReferencePairs = new Map([
  ['b0bd2f28-7732-47d1-b52c-0b9bc45ae128', new Set(['0:8', '1:6', '1:18'])],
  ['974e7b87-a03c-4369-8204-99007c51f726', new Set(['0:2', '0:10'])],
  [
    'a4484837-19af-4ef6-b170-5b77474a12cc',
    new Set(['0:0', '0:1', '0:2', '0:3', '0:5', '0:6']),
  ],
]);

function extractReferences(metadata = {}, sourceMessageId = '') {
  const references = [];
  const add = (candidate) => {
    if (!candidate || typeof candidate.url !== 'string' || !/^https?:\/\//.test(candidate.url)) return;
    references.push({
      title: typeof candidate.title === 'string' && candidate.title ? candidate.title : candidate.url,
      url: candidate.url,
      ...(typeof candidate.attribution === 'string' && candidate.attribution
        ? { attribution: candidate.attribution }
        : {}),
    });
  };
  for (const contentReference of metadata.content_references ?? []) {
    for (const field of ['items', 'sources', 'fallback_items']) {
      for (const item of contentReference?.[field] ?? []) {
        add(item);
        for (const supporting of item?.supporting_websites ?? []) add(supporting);
      }
    }
  }
  const allowedSearchPairs = verifiedSearchReferencePairs.get(sourceMessageId) ?? new Set();
  for (const group of metadata.search_result_groups ?? []) {
    for (const entry of group?.entries ?? []) {
      const pair = `${entry?.ref_id?.turn_index}:${entry?.ref_id?.ref_index}`;
      if (entry?.ref_id?.ref_type === 'search' && allowedSearchPairs.has(pair)) {
        add(entry);
      }
    }
  }
  const seen = new Set();
  return references.filter((reference) => {
    if (seen.has(reference.url)) return false;
    seen.add(reference.url);
    return true;
  });
}

const incompletePhase2Turns = phase2Turns.turns.filter((turn) => !turn.final_assistant_message);
if (incompletePhase2Turns.length !== 1) {
  throw new Error(`Expected exactly one incomplete phase2 turn, found ${incompletePhase2Turns.length}`);
}
const withheldMessageIds = new Set();
for (const turn of incompletePhase2Turns) {
  withheldMessageIds.add(turn.user_message.message_id);
  for (const message of turn.intermediate_assistant_text_messages ?? []) withheldMessageIds.add(message.message_id);
}

const normalized = [];
const seenMessageIds = new Map();

function addNormalized(record) {
  const existing = seenMessageIds.get(record.messageId);
  if (existing) {
    if (existing.role !== record.role || existing.text !== record.text) {
      throw new Error(`Duplicate source message differs across snapshots: ${record.messageId}`);
    }
    return false;
  }
  seenMessageIds.set(record.messageId, record);
  normalized.push(record);
  return true;
}

for (const raw of phase2.messages) {
  if (withheldMessageIds.has(raw.message_id)) continue;
  addNormalized({
    sourceKey: 'phase2',
    sourceId: sources.phase2.id,
    sourceOrdinal: raw.ordinal,
    messageId: raw.message_id,
    role: raw.author.role,
    channel: raw.channel,
    recordedAt: epochToKstMicros(raw.create_time),
    turnId: raw.metadata?.turn_exchange_id,
    text: raw.text,
    raw,
    correction: phase2CorrectionMap.get(raw.message_id),
    references: extractReferences(raw.metadata, raw.message_id),
  });
}

for (const raw of phase1.messages) {
  if (raw.is_redacted || withheldMessageIds.has(raw.message_id)) continue;
  addNormalized({
    sourceKey: 'phase1',
    sourceId: sources.phase1.id,
    sourceOrdinal: raw.sequence,
    messageId: raw.message_id,
    role: raw.role,
    channel: raw.role === 'assistant' ? (raw.is_thinking_preamble_message ? 'commentary' : 'final') : null,
    recordedAt: raw.create_time_kst,
    turnId: raw.turn_exchange_id,
    text: raw.content,
    raw,
    correction: phase1UniqueCorrections.get(raw.message_id),
    references: phase1References[raw.message_id]?.references ?? [],
  });
}

for (const [index, raw] of phase3.entries()) {
  addNormalized({
    sourceKey: 'phase3',
    sourceId: sources.phase3.id,
    sourceOrdinal: index + 1,
    messageId: raw.message_id,
    role: raw.role,
    channel: raw.channel,
    recordedAt: raw.create_time_kst,
    turnId: raw.message?.metadata?.turn_exchange_id,
    text: raw.text,
    raw,
    correction: phase3CorrectionMap.get(raw.message_id),
    references: extractReferences(raw.message?.metadata, raw.message_id),
  });
}

for (const record of normalized) {
  if (!['user', 'assistant'].includes(record.role)) {
    throw new Error(`Non-public role entered the normalized archive: ${record.messageId}/${record.role}`);
  }
  if (!record.text || !record.recordedAt || !record.messageId) {
    throw new Error(`Incomplete normalized record: ${record.messageId}`);
  }
}

normalized.sort((a, b) => {
  const time = a.recordedAt.localeCompare(b.recordedAt);
  if (time) return time;
  const source = a.sourceId.localeCompare(b.sourceId);
  if (source) return source;
  return a.sourceOrdinal - b.sourceOrdinal;
});

for (const source of Object.values(sources)) {
  let previousOrdinal = 0;
  for (const message of normalized.filter((item) => item.sourceId === source.id)) {
    if (message.sourceOrdinal <= previousOrdinal) {
      throw new Error(`Source order changed while merging ${source.id}: ${message.messageId}`);
    }
    previousOrdinal = message.sourceOrdinal;
  }
}

function publicMessage(record) {
  const base = {
    id: `message-${record.messageId}`,
    role: record.role,
    recordedAt: stamp(record.recordedAt, 'second'),
    sourceVerified: true,
    sourceVerifiedAt: verificationStamp,
    sourceMessageId: record.messageId,
    sourceOrdinal: record.sourceOrdinal,
    ...(record.turnId ? { turnId: record.turnId } : {}),
    sourceRefs: [record.sourceId],
  };
  if (record.role === 'user') {
    const correction = record.correction;
    const changed = Boolean(correction?.changed && correction.corrected !== record.text);
    return {
      ...base,
      original: record.text,
      originalSha256: sha256(record.text),
      ...(changed
        ? {
            corrected: correction.corrected,
            correctionPolicy: 'typos-only',
            fidelity: 'typo-corrected',
          }
        : { fidelity: 'exact' }),
    };
  }
  return {
    ...base,
    channel: ['commentary', 'final'].includes(record.channel) ? record.channel : 'unknown',
    text: record.text,
    textSha256: sha256(record.text),
    modelLabel: 'ChatGPT',
    fidelity: 'exact',
    references: record.references,
  };
}

const byDate = new Map();
for (const record of normalized) {
  const date = record.recordedAt.slice(0, 10);
  if (!/^2026-\d{2}-\d{2}$/.test(date)) throw new Error(`Unexpected KST date: ${record.recordedAt}`);
  if (!byDate.has(date)) byDate.set(date, []);
  byDate.get(date).push(record);
}

const posts = [];
for (const [date, records] of [...byDate].sort(([a], [b]) => a.localeCompare(b))) {
  const [, month, day] = date.split('-').map(Number);
  const sourceKeys = [...new Set(records.map((record) => record.sourceKey))];
  const messages = records.map(publicMessage);
  if (!messages.some((message) => message.role === 'user') || !messages.some((message) => message.role === 'assistant')) {
    throw new Error(`Daily post has no complete user/GPT thread: ${date}`);
  }
  posts.push({
    schemaVersion: 2,
    recordId: `trauma-${date}-conversation`,
    board: 'trauma',
    entryType: 'clinical-update',
    title: `2026년 ${month}월 ${day}일 경과 기록`,
    status: publishReviewed ? 'published' : 'draft',
    sensitivity: 'highly-sensitive',
    recordedAt: stamp(date, 'day'),
    tags: ['원문 대화', '날짜별 기록'],
    sources: sourceKeys.map((key) => sources[key]),
    messages,
    amendments: [],
    media: [],
    related: [],
    privacyReviewed: publishReviewed,
  });
}

const outputDirectory = resolve('src/content/posts/trauma');
await mkdir(outputDirectory, { recursive: true });
const existing = (await readdir(outputDirectory)).filter((name) => name.endsWith('.json'));
const expected = new Set(posts.map((post) => `${post.recordedAt.start}.json`));
const unexpected = existing.filter((name) => !expected.has(name));
if (unexpected.length) {
  throw new Error(`Refusing to overwrite a directory with unrelated JSON posts: ${unexpected.join(', ')}`);
}

const redactedPhase1 = phase1.messages.find((message) => message.is_redacted);
if (!redactedPhase1) throw new Error('Expected the verified phase1 redacted placeholder');
const withheldUser = incompletePhase2Turns[0].user_message;
const visibleSequence = (items, getRole, getText, getTime) =>
  stableSha256(items.map((item) => [item.message_id, getRole(item), getTime(item), getText(item)]));
const publishedJson = posts.map((post) => JSON.stringify(post)).join('\n');
const referenceCount = posts.reduce(
  (sum, post) =>
    sum +
    post.messages.reduce(
      (messageSum, message) => messageSum + (message.role === 'assistant' ? message.references.length : 0),
      0,
    ),
  0,
);
const correctedUserCount = posts.reduce(
  (sum, post) => sum + post.messages.filter((message) => message.role === 'user' && message.corrected).length,
  0,
);

const ledgerPath = resolve('src/data/import-ledger.json');
const ledger = await readJson(ledgerPath);
ledger.schemaVersion = 2;
ledger.lastUpdated = verifiedAt.slice(0, 10);
ledger.boards.trauma = {
  status: publishReviewed ? 'published-through-2026-08-31' : 'draft-through-2026-08-31',
  sourceThreads: [sources.phase1.label, sources.phase2.label, sources.phase3.label],
  publicationRule: 'complete-visible-source-messages-only',
  sourceRequirement: 'confirmed-chatgpt-shared-conversation-snapshot',
};
const importId = 'trauma-shared-conversations-2026-08-31';
ledger.imports = (ledger.imports ?? []).filter((entry) => entry.id !== importId);
ledger.imports.push({
  id: importId,
  board: 'trauma',
  verifiedAt,
  publication: {
    status: publishReviewed ? 'published' : 'draft',
    privacyReviewed: publishReviewed,
    publicPreviewAuthorizedByUser: true,
  },
  sources: [
    {
      sourceId: sources.phase1.id,
      title: sources.phase1.label,
      rawSnapshotSha256: phase1.summary.page_html_sha256,
      visibleMessageCount: phase1.messages.length,
      visibleSequenceSha256: visibleSequence(
        phase1.messages,
        (item) => item.role,
        (item) => item.content,
        (item) => item.create_time_kst,
      ),
      currentNode: phase1.summary.current_node,
    },
    {
      sourceId: sources.phase2.id,
      title: sources.phase2.label,
      rawSnapshotSha256: phase2Manifest.source_html_sha256,
      visibleMessageCount: phase2.messages.length,
      visibleSequenceSha256:
        phase2Manifest.selected_messages_stable_sha256 ??
        visibleSequence(
          phase2.messages,
          (item) => item.author.role,
          (item) => item.text,
          (item) => item.create_time_iso_kst,
        ),
      currentNode: phase2Manifest.current_node,
    },
    {
      sourceId: sources.phase3.id,
      title: sources.phase3.label,
      rawSnapshotSha256: phase3Manifest.hashes.raw_page_html_sha256,
      visibleMessageCount: phase3.length,
      visibleSequenceSha256: visibleSequence(
        phase3,
        (item) => item.role,
        (item) => item.text,
        (item) => item.create_time_kst,
      ),
      currentNode: phase3Manifest.current_node,
    },
  ],
  merge: {
    phase1Phase2DuplicateMessageCount: phase1.messages.filter((message) =>
      phase2.messages.some((candidate) => candidate.message_id === message.message_id),
    ).length,
    publishedMessageCount: normalized.length,
    publishedUserMessageCount: normalized.filter((message) => message.role === 'user').length,
    publishedAssistantMessageCount: normalized.filter((message) => message.role === 'assistant').length,
    correctedUserMessageCount: correctedUserCount,
    retainedReferenceLinkCount: referenceCount,
    dailyPostCount: posts.length,
    publishedContentSha256: sha256Hex(publishedJson),
  },
  withheld: [
    {
      userSourceMessageId: withheldUser.message_id,
      userOriginalSha256: sha256(withheldUser.text),
      recordedAt: withheldUser.create_time_iso_kst,
      assistantSourceMessageId: redactedPhase1.message_id,
      sourcePlaceholderSha256: sha256(redactedPhase1.content),
      reason: 'complete-gpt-reply-not-present-in-shared-source',
      publicationStatus: 'withheld-pending-complete-source',
    },
  ],
  posts: posts.map((post) => post.recordId),
});
for (const post of posts) {
  const path = join(outputDirectory, `${post.recordedAt.start}.json`);
  await writeFile(path, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
}
await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      posts: posts.length,
      messages: normalized.length,
      users: normalized.filter((message) => message.role === 'user').length,
      assistants: normalized.filter((message) => message.role === 'assistant').length,
      correctedUsers: correctedUserCount,
      referenceLinks: referenceCount,
      withheld: withheldMessageIds.size,
      published: publishReviewed,
      outputDirectory,
      ledger: basename(ledgerPath),
    },
    null,
    2,
  ),
);
