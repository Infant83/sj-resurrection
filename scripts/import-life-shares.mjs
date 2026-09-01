import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const EXPECTED = {
  phase1: {
    title: '선진이와 함께하는 삶 (phase1)',
    visibleCount: 14,
    allUserAssistantCount: 35,
    userCount: 6,
    assistantCount: 8,
    commentaryCount: 1,
    finalCount: 7,
    visibleSequenceSha256: '38c424a55571860a7e6d045f8482fb466a8661dda7c01a805ba225a9bcab9003',
  },
  phase2: {
    title: '선진이와 함께하는 삶 (phase2)',
    visibleCount: 39,
    allUserAssistantCount: 112,
    userCount: 16,
    assistantCount: 23,
    commentaryCount: 6,
    finalCount: 17,
    visibleSequenceSha256: '0652753c7edded5178375d0abfb455b4c71b5dc950f47fd75a246e8893da64e3',
  },
  phase3: {
    title: '선진이와 함께하는 삶 (phase 3)',
    visibleCount: 45,
    allUserAssistantCount: 135,
    userCount: 18,
    assistantCount: 27,
    commentaryCount: 8,
    finalCount: 19,
    visibleSequenceSha256: '6f91440b8cf2be1d179f978f3dd2f0533be41bade8d9424b0bf166cbd290d1d8',
  },
};

const EXPECTED_ARCHIVE = {
  firstRecordedAt: '2026-07-29T11:21:30.541809+09:00',
  lastRecordedAt: '2026-08-28T21:54:50.380062+09:00',
  throughDate: '2026-08-28',
  dailyPostCount: 19,
  visibleMessageCount: 48,
  userMessageCount: 19,
  assistantMessageCount: 29,
  commentaryCount: 9,
  finalCount: 20,
  referenceCount: 13,
  hiddenRedactedUserCount: 2,
  hiddenRedactedUserTimestamps: [
    '2026-07-31T22:04:16.787863+09:00',
    '2026-08-08T07:26:44.884561+09:00',
  ],
  dates: [
    '2026-07-29',
    '2026-07-30',
    '2026-07-31',
    '2026-08-01',
    '2026-08-03',
    '2026-08-04',
    '2026-08-05',
    '2026-08-07',
    '2026-08-08',
    '2026-08-11',
    '2026-08-13',
    '2026-08-15',
    '2026-08-17',
    '2026-08-20',
    '2026-08-22',
    '2026-08-23',
    '2026-08-26',
    '2026-08-27',
    '2026-08-28',
  ],
  phase1Phase2Overlap: 11,
  phase1Phase3Overlap: 11,
  phase2Phase3Overlap: 39,
  duplicateOccurrencesRemoved: 50,
};

const allowedArgs = new Set([
  'phase1',
  'phase1-all',
  'phase1-manifest',
  'phase1-raw',
  'phase2',
  'phase2-all',
  'phase2-manifest',
  'phase2-raw',
  'phase3',
  'phase3-all',
  'phase3-manifest',
  'phase3-raw',
  'corrections',
  'verified-at',
  'publish-reviewed',
  'public-preview-authorized',
  'replace',
]);

function parseArgs(argv) {
  const parsed = {};
  for (const item of argv) {
    if (!item.startsWith('--') || !item.includes('=')) {
      throw new Error(`Arguments must use --name=value form: ${item}`);
    }
    const [rawKey, ...valueParts] = item.slice(2).split('=');
    if (!allowedArgs.has(rawKey)) throw new Error(`Unknown argument: --${rawKey}`);
    if (Object.hasOwn(parsed, rawKey)) throw new Error(`Duplicate argument: --${rawKey}`);
    parsed[rawKey] = valueParts.join('=');
  }
  return parsed;
}

const args = parseArgs(process.argv.slice(2));
const requiredArgs = [
  'phase1',
  'phase1-all',
  'phase1-manifest',
  'phase1-raw',
  'phase2',
  'phase2-all',
  'phase2-manifest',
  'phase2-raw',
  'phase3',
  'phase3-all',
  'phase3-manifest',
  'phase3-raw',
  'corrections',
  'verified-at',
  'publish-reviewed',
  'public-preview-authorized',
];
const missingArgs = requiredArgs.filter((key) => !Object.hasOwn(args, key) || !args[key]);
if (missingArgs.length) throw new Error(`Missing arguments: ${missingArgs.join(', ')}`);

function explicitBoolean(name, defaultValue) {
  if (!Object.hasOwn(args, name)) return defaultValue;
  if (!['true', 'false'].includes(args[name])) {
    throw new Error(`--${name} must be explicitly true or false`);
  }
  return args[name] === 'true';
}

const publishReviewed = explicitBoolean('publish-reviewed');
const publicPreviewAuthorized = explicitBoolean('public-preview-authorized');
const replaceExisting = explicitBoolean('replace', false);
if (publicPreviewAuthorized && !publishReviewed) {
  throw new Error('Public preview authorization cannot publish an import before privacy review');
}
const published = publishReviewed && publicPreviewAuthorized;

const verifiedAt = args['verified-at'];
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?\+09:00$/.test(verifiedAt)) {
  throw new Error('--verified-at must be an ISO 8601 timestamp with the +09:00 offset');
}
if (Number.isNaN(Date.parse(verifiedAt))) throw new Error('--verified-at is not a real timestamp');

const sha256Hex = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const sha256 = (value) => `sha256:${sha256Hex(value)}`;
const isHexHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const stamp = (start, precision = 'minute') => ({ start, precision, timezone: 'Asia/Seoul' });
const verificationStamp = stamp(verifiedAt, 'second');
const jsonEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

async function readJsonWithRaw(path) {
  const absolutePath = resolve(path);
  const raw = await readFile(absolutePath, 'utf8');
  return { absolutePath, raw, hash: sha256Hex(raw), value: JSON.parse(raw) };
}

async function readRawSnapshot(path) {
  const absolutePath = resolve(path);
  const raw = await readFile(absolutePath);
  return { absolutePath, hash: createHash('sha256').update(raw).digest('hex'), bytes: raw.length };
}

function epochParts(epochSeconds, offsetHours) {
  if (!Number.isFinite(epochSeconds)) throw new Error(`Invalid source timestamp: ${epochSeconds}`);
  let wholeSeconds = Math.floor(epochSeconds);
  let micros = Math.round((epochSeconds - wholeSeconds) * 1_000_000);
  if (micros === 1_000_000) {
    wholeSeconds += 1;
    micros = 0;
  }
  const clock = new Date((wholeSeconds + offsetHours * 60 * 60) * 1000).toISOString().slice(0, 19);
  const offset = offsetHours === 0 ? '+00:00' : `${offsetHours > 0 ? '+' : '-'}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
  return `${clock}.${String(micros).padStart(6, '0')}${offset}`;
}

const epochToUtcMicros = (epochSeconds) => epochParts(epochSeconds, 0);
const epochToKstMicros = (epochSeconds) => epochParts(epochSeconds, 9);

function sourceText(message) {
  const parts = message?.content?.parts ?? [];
  if (!Array.isArray(parts)) throw new Error('Source message content.parts is not an array');
  return parts.filter((part) => typeof part === 'string').join('');
}

function isVisibleText(record) {
  const metadata = record.message?.metadata ?? {};
  return Boolean(
    ['user', 'assistant'].includes(record.role) &&
      record.content_type === 'text' &&
      record.recipient === 'all' &&
      !metadata.is_visually_hidden_from_conversation &&
      !metadata.is_redacted &&
      record.text,
  );
}

function sequenceBlob(records) {
  return records
    .map((record) =>
      [
        String(record.linear_index),
        record.message_id,
        record.role,
        record.channel ?? '',
        String(record.create_time),
        record.text,
      ].join('\x1f'),
    )
    .join('\x1e');
}

function countBy(records, field, value) {
  return records.filter((record) => record[field] === value).length;
}

function validateShareLocator(manifest, sourceName) {
  for (const field of ['source_url_requested', 'source_url_final']) {
    let parsed;
    try {
      parsed = new URL(manifest[field]);
    } catch {
      throw new Error(`${sourceName} manifest has an invalid ${field}`);
    }
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'chatgpt.com' ||
      pathParts.length !== 2 ||
      pathParts[0] !== 'share' ||
      pathParts[1] !== manifest.share_id ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(`${sourceName} manifest ${field} is not its exact shared-conversation locator`);
    }
  }
  if (manifest.source_url_requested !== manifest.source_url_final) {
    throw new Error(`${sourceName} source URL changed during extraction`);
  }
  if (manifest.conversation_id !== manifest.share_id) {
    throw new Error(`${sourceName} manifest conversation/share identifiers differ`);
  }
}

function validateRecord(record, sourceName, previousLinearIndex) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`${sourceName} contains a non-object record`);
  }
  if (!Number.isInteger(record.linear_index) || record.linear_index <= previousLinearIndex) {
    throw new Error(`${sourceName} linear order is invalid at ${record.message_id ?? 'unknown'}`);
  }
  if (!record.message_id || record.node_id !== record.message_id || record.message?.id !== record.message_id) {
    throw new Error(`${sourceName} node/message identifier mismatch: ${record.message_id ?? 'unknown'}`);
  }
  if (!['user', 'assistant'].includes(record.role) || record.message?.author?.role !== record.role) {
    throw new Error(`${sourceName} role mismatch: ${record.message_id}`);
  }
  if (record.channel !== (record.message.channel ?? null)) {
    throw new Error(`${sourceName} channel mismatch: ${record.message_id}`);
  }
  if (record.recipient !== record.message.recipient || record.status !== record.message.status) {
    throw new Error(`${sourceName} recipient/status mismatch: ${record.message_id}`);
  }
  if (record.end_turn !== (record.message.end_turn ?? null)) {
    throw new Error(`${sourceName} end-turn mismatch: ${record.message_id}`);
  }
  if (record.content_type !== record.message?.content?.content_type) {
    throw new Error(`${sourceName} content type mismatch: ${record.message_id}`);
  }
  if (record.text !== sourceText(record.message) || sha256Hex(record.text) !== record.text_sha256) {
    throw new Error(`${sourceName} source text/hash mismatch: ${record.message_id}`);
  }
  if (
    record.create_time !== record.message.create_time ||
    record.create_time_utc !== epochToUtcMicros(record.create_time) ||
    record.create_time_kst !== epochToKstMicros(record.create_time)
  ) {
    throw new Error(`${sourceName} creation timestamp mismatch: ${record.message_id}`);
  }
  const embeddedUpdateTime = record.message.update_time ?? null;
  if (record.update_time !== embeddedUpdateTime) {
    throw new Error(`${sourceName} embedded update timestamp mismatch: ${record.message_id}`);
  }
  if (record.update_time == null) {
    if (record.update_time_utc !== null || record.update_time_kst !== null) {
      throw new Error(`${sourceName} null update timestamp has derived values: ${record.message_id}`);
    }
  } else {
    if (
      record.update_time_utc !== epochToUtcMicros(record.update_time) ||
      record.update_time_kst !== epochToKstMicros(record.update_time)
    ) {
      throw new Error(`${sourceName} update timestamp mismatch: ${record.message_id}`);
    }
  }
  return record.linear_index;
}

function validateSource(sourceKey, visibleFile, allFile, manifestFile, rawFile) {
  const expectation = EXPECTED[sourceKey];
  const visible = visibleFile.value;
  const all = allFile.value;
  const manifest = manifestFile.value;
  if (!Array.isArray(visible) || !Array.isArray(all)) {
    throw new Error(`${sourceKey} visible/all-record inputs must be arrays`);
  }
  if (manifest.title !== expectation.title) throw new Error(`${sourceKey} title does not match the intended source`);
  validateShareLocator(manifest, sourceKey);
  if (all.length !== expectation.allUserAssistantCount || all.length !== manifest.user_assistant_record_count_including_hidden_internal) {
    throw new Error(`${sourceKey} all-record count mismatch`);
  }
  if (visible.length !== expectation.visibleCount || visible.length !== manifest.visible_user_assistant_text_count) {
    throw new Error(`${sourceKey} visible-record count mismatch`);
  }
  if (
    manifest.visible_role_counts?.user !== expectation.userCount ||
    manifest.visible_role_counts?.assistant !== expectation.assistantCount ||
    manifest.visible_channel_counts?.None !== expectation.userCount ||
    manifest.visible_channel_counts?.commentary !== expectation.commentaryCount ||
    manifest.visible_channel_counts?.final !== expectation.finalCount
  ) {
    throw new Error(`${sourceKey} manifest role/channel counts do not match the verified snapshot`);
  }
  if (
    countBy(visible, 'role', 'user') !== expectation.userCount ||
    countBy(visible, 'role', 'assistant') !== expectation.assistantCount ||
    countBy(visible, 'channel', 'commentary') !== expectation.commentaryCount ||
    countBy(visible, 'channel', 'final') !== expectation.finalCount
  ) {
    throw new Error(`${sourceKey} visible role/channel counts do not match the verified snapshot`);
  }
  const requiredManifestChecks = [
    'html_stream_closed',
    'current_node_is_last_linear_node',
    'mapping_ids_match_linear_ids',
    'parent_chain_is_contiguous',
    'node_ids_equal_message_ids_when_message_exists',
    'all_visible_text_records_have_nonempty_text',
    'all_assistant_final_records_are_end_turn',
  ];
  if (!manifest.checks || requiredManifestChecks.some((key) => manifest.checks[key] !== true)) {
    throw new Error(`${sourceKey} extraction manifest contains a failed or missing integrity check`);
  }
  if (!isHexHash(manifest.hashes?.raw_page_html_sha256) || !Number.isInteger(manifest.raw_html_bytes) || manifest.raw_html_bytes <= 0) {
    throw new Error(`${sourceKey} raw snapshot metadata is invalid`);
  }
  if (rawFile.hash !== manifest.hashes.raw_page_html_sha256 || rawFile.bytes !== manifest.raw_html_bytes) {
    throw new Error(`${sourceKey} raw snapshot bytes/hash do not match the extraction manifest`);
  }
  const calculatedSequenceHash = sha256Hex(sequenceBlob(visible));
  if (
    calculatedSequenceHash !== expectation.visibleSequenceSha256 ||
    calculatedSequenceHash !== manifest.hashes?.visible_text_ordered_sequence_sha256
  ) {
    throw new Error(`${sourceKey} visible ordered-sequence hash mismatch`);
  }
  const finalStyle = visible.filter(
    (record) => record.role === 'user' || (record.role === 'assistant' && record.channel === 'final'),
  );
  if (
    sha256Hex(sequenceBlob(finalStyle)) !== manifest.hashes?.user_and_final_answers_ordered_sequence_sha256 ||
    finalStyle.length !== manifest.final_style_transcript_count ||
    expectation.finalCount !== manifest.assistant_final_answer_count
  ) {
    throw new Error(`${sourceKey} final-style transcript integrity mismatch`);
  }

  let previousLinearIndex = -1;
  const ids = new Set();
  for (const record of all) {
    previousLinearIndex = validateRecord(record, `${sourceKey} all records`, previousLinearIndex);
    if (ids.has(record.message_id)) throw new Error(`${sourceKey} repeats message id ${record.message_id}`);
    ids.add(record.message_id);
  }
  const selectedVisible = all.filter(isVisibleText);
  if (!jsonEqual(selectedVisible, visible)) {
    throw new Error(`${sourceKey} visible input is not the exact public selection from all records`);
  }
  if (visible.some((record) => record.status !== 'finished_successfully')) {
    throw new Error(`${sourceKey} contains a visible message that did not finish successfully`);
  }
  if (visible.at(-1)?.message_id !== manifest.current_node) {
    throw new Error(`${sourceKey} current node does not match the last visible source message`);
  }
  for (let index = 1; index < visible.length; index += 1) {
    if (visible[index - 1].create_time_kst > visible[index].create_time_kst) {
      throw new Error(`${sourceKey} visible timestamps are out of source order`);
    }
  }
  return {
    sourceKey,
    expectation,
    visible,
    all,
    manifest,
    files: { visible: visibleFile, all: allFile, manifest: manifestFile, raw: rawFile },
  };
}

const inputFiles = await Promise.all([
  readJsonWithRaw(args.phase1),
  readJsonWithRaw(args['phase1-all']),
  readJsonWithRaw(args['phase1-manifest']),
  readJsonWithRaw(args.phase2),
  readJsonWithRaw(args['phase2-all']),
  readJsonWithRaw(args['phase2-manifest']),
  readJsonWithRaw(args.phase3),
  readJsonWithRaw(args['phase3-all']),
  readJsonWithRaw(args['phase3-manifest']),
  readJsonWithRaw(args.corrections),
]);
const rawSnapshotFiles = await Promise.all([
  readRawSnapshot(args['phase1-raw']),
  readRawSnapshot(args['phase2-raw']),
  readRawSnapshot(args['phase3-raw']),
]);

const sourceSnapshots = [
  validateSource('phase1', inputFiles[0], inputFiles[1], inputFiles[2], rawSnapshotFiles[0]),
  validateSource('phase2', inputFiles[3], inputFiles[4], inputFiles[5], rawSnapshotFiles[1]),
  validateSource('phase3', inputFiles[6], inputFiles[7], inputFiles[8], rawSnapshotFiles[2]),
];
const correctionsInput = inputFiles[9].value;
if (!Array.isArray(correctionsInput)) throw new Error('The corrections manifest must be an array');

const sources = Object.fromEntries(
  sourceSnapshots.map((snapshot, index) => [
    snapshot.sourceKey,
    {
      id: `chatgpt-life-phase-${index + 1}`,
      type: 'chat-conversation',
      certainty: 'confirmed',
      label: snapshot.expectation.title,
      accessedAt: verificationStamp,
    },
  ]),
);

function extractReferences(metadata = {}) {
  const references = [];
  const add = (candidate) => {
    if (!candidate || typeof candidate.url !== 'string') return;
    let normalizedUrl = candidate.url
      .replace(/%3Bjsessionid%3D[^?#]+/gi, '')
      .replace(/;jsessionid=[^?#/]+/gi, '');
    let parsed;
    try {
      parsed = new URL(normalizedUrl);
    } catch {
      throw new Error(`Invalid content-reference URL: ${candidate.url}`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return;
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_/i.test(key)) parsed.searchParams.delete(key);
    }
    normalizedUrl = parsed.toString();
    let sessionInspection = normalizedUrl;
    try {
      sessionInspection = decodeURIComponent(normalizedUrl);
    } catch {
      // The URL constructor accepted it; inspect the encoded form if percent-decoding is not possible.
    }
    if (/jsessionid|(?:^|[?&])(?:sid|session|token)=/i.test(sessionInspection)) {
      throw new Error(`Session-bearing content-reference URL cannot be published: ${candidate.url}`);
    }
    references.push({
      title: typeof candidate.title === 'string' && candidate.title ? candidate.title : candidate.url,
      url: normalizedUrl,
      ...(typeof candidate.attribution === 'string' && candidate.attribution
        ? { attribution: candidate.attribution }
        : {}),
    });
  };
  for (const contentReference of metadata.content_references ?? []) {
    for (const field of ['items', 'sources', 'fallback_items']) {
      const candidates = contentReference?.[field] ?? [];
      if (!Array.isArray(candidates)) throw new Error(`content_references.${field} is not an array`);
      for (const candidate of candidates) {
        add(candidate);
        const supporting = candidate?.supporting_websites ?? [];
        if (!Array.isArray(supporting)) throw new Error('content reference supporting_websites is not an array');
        for (const website of supporting) add(website);
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

function duplicateSignature(record) {
  const snapshotSpecificMetadata = new Set([
    'shared_conversation_id',
    'branching_from_conversation_id',
    'branching_from_conversation_title',
    'branching_from_conversation_owner',
  ]);
  const canonicalize = (value, parentKey = '') => {
    if (Array.isArray(value)) return value.map((item) => canonicalize(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => parentKey !== 'metadata' || !snapshotSpecificMetadata.has(key))
        .sort()
        .map((key) => [key, canonicalize(value[key], key)]),
    );
  };
  return JSON.stringify({
    linearIndex: record.linear_index,
    nodeId: record.node_id,
    parentNodeId: record.parent_node_id,
    messageId: record.message_id,
    role: record.role,
    channel: record.channel,
    recipient: record.recipient,
    status: record.status,
    endTurn: record.end_turn,
    createTime: record.create_time,
    createTimeUtc: record.create_time_utc,
    createTimeKst: record.create_time_kst,
    updateTime: record.update_time,
    updateTimeUtc: record.update_time_utc,
    updateTimeKst: record.update_time_kst,
    contentType: record.content_type,
    text: record.text,
    textSha256: record.text_sha256,
    author: canonicalize(record.message?.author ?? null),
    metadata: canonicalize(record.message?.metadata ?? {}, 'metadata'),
    references: extractReferences(record.message?.metadata),
  });
}

function overlapCount(left, right) {
  const rightIds = new Set(right.visible.map((record) => record.message_id));
  return left.visible.filter((record) => rightIds.has(record.message_id)).length;
}

const overlap12 = overlapCount(sourceSnapshots[0], sourceSnapshots[1]);
const overlap13 = overlapCount(sourceSnapshots[0], sourceSnapshots[2]);
const overlap23 = overlapCount(sourceSnapshots[1], sourceSnapshots[2]);
if (
  overlap12 !== EXPECTED_ARCHIVE.phase1Phase2Overlap ||
  overlap13 !== EXPECTED_ARCHIVE.phase1Phase3Overlap ||
  overlap23 !== EXPECTED_ARCHIVE.phase2Phase3Overlap
) {
  throw new Error(`Unexpected source overlap counts: ${overlap12}/${overlap13}/${overlap23}`);
}

const normalized = [];
const seenMessages = new Map();
let duplicateOccurrencesRemoved = 0;
let firstSeenOrder = 0;
for (const snapshot of sourceSnapshots) {
  for (const [index, raw] of snapshot.visible.entries()) {
    const existing = seenMessages.get(raw.message_id);
    if (existing) {
      duplicateOccurrencesRemoved += 1;
      if (existing.signature !== duplicateSignature(raw)) {
        throw new Error(`Duplicate source message metadata differs across snapshots: ${raw.message_id}`);
      }
      continue;
    }
    const record = {
      sourceKey: snapshot.sourceKey,
      sourceId: sources[snapshot.sourceKey].id,
      sourceOrdinal: index + 1,
      messageId: raw.message_id,
      role: raw.role,
      channel: raw.channel,
      recordedAt: raw.create_time_kst,
      turnId: raw.message?.metadata?.turn_exchange_id,
      text: raw.text,
      references: extractReferences(raw.message?.metadata),
      signature: duplicateSignature(raw),
      firstSeenOrder: firstSeenOrder++,
    };
    seenMessages.set(record.messageId, record);
    normalized.push(record);
  }
}
if (duplicateOccurrencesRemoved !== EXPECTED_ARCHIVE.duplicateOccurrencesRemoved) {
  throw new Error(`Expected ${EXPECTED_ARCHIVE.duplicateOccurrencesRemoved} duplicate occurrences, found ${duplicateOccurrencesRemoved}`);
}

normalized.sort((left, right) => {
  const time = left.recordedAt.localeCompare(right.recordedAt);
  return time || left.firstSeenOrder - right.firstSeenOrder;
});
if (
  normalized.length !== EXPECTED_ARCHIVE.visibleMessageCount ||
  normalized[0]?.recordedAt !== EXPECTED_ARCHIVE.firstRecordedAt ||
  normalized.at(-1)?.recordedAt !== EXPECTED_ARCHIVE.lastRecordedAt
) {
  throw new Error('Merged visible chronology does not match the verified archive bounds');
}

const hiddenRedactedUsers = new Map();
for (const snapshot of sourceSnapshots) {
  for (const record of snapshot.all) {
    const metadata = record.message?.metadata ?? {};
    if (record.role !== 'user' || (!metadata.is_visually_hidden_from_conversation && !metadata.is_redacted)) continue;
    if (!(metadata.is_visually_hidden_from_conversation === true && metadata.is_redacted === true)) {
      throw new Error(`Partially hidden/redacted user record cannot be classified: ${record.message_id}`);
    }
    if (isVisibleText(record)) throw new Error(`Hidden user record entered visible selection: ${record.message_id}`);
    const existing = hiddenRedactedUsers.get(record.message_id);
    if (existing && existing.signature !== duplicateSignature(record)) {
      throw new Error(`Hidden user record differs across snapshots: ${record.message_id}`);
    }
    if (!existing) hiddenRedactedUsers.set(record.message_id, { record, signature: duplicateSignature(record) });
  }
}
if (hiddenRedactedUsers.size !== EXPECTED_ARCHIVE.hiddenRedactedUserCount) {
  throw new Error(`Expected exactly ${EXPECTED_ARCHIVE.hiddenRedactedUserCount} hidden+redacted user records`);
}
const hiddenTimestamps = [...hiddenRedactedUsers.values()]
  .map(({ record }) => record.create_time_kst)
  .sort();
if (!jsonEqual(hiddenTimestamps, EXPECTED_ARCHIVE.hiddenRedactedUserTimestamps)) {
  throw new Error('Hidden+redacted user record timestamps do not match the verified exclusions');
}

const userRecords = normalized.filter((record) => record.role === 'user');
const assistantRecords = normalized.filter((record) => record.role === 'assistant');
if (
  userRecords.length !== EXPECTED_ARCHIVE.userMessageCount ||
  assistantRecords.length !== EXPECTED_ARCHIVE.assistantMessageCount ||
  assistantRecords.filter((record) => record.channel === 'commentary').length !== EXPECTED_ARCHIVE.commentaryCount ||
  assistantRecords.filter((record) => record.channel === 'final').length !== EXPECTED_ARCHIVE.finalCount ||
  assistantRecords.some((record) => !['commentary', 'final'].includes(record.channel))
) {
  throw new Error('Merged role/channel counts do not match the verified archive');
}

function occurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function replayChanges(original, correction) {
  if (!Array.isArray(correction.changes)) {
    throw new Error(`Correction audit is missing for ${correction.message_id}`);
  }
  let replayed = original;
  for (const [index, change] of correction.changes.entries()) {
    if (
      !change ||
      typeof change.from !== 'string' ||
      !change.from ||
      typeof change.to !== 'string' ||
      change.from === change.to ||
      !Number.isInteger(change.count) ||
      change.count <= 0 ||
      typeof change.reason !== 'string' ||
      !change.reason.trim()
    ) {
      throw new Error(`Invalid correction audit item ${index + 1} for ${correction.message_id}`);
    }
    const found = occurrences(replayed, change.from);
    if (found !== change.count) {
      throw new Error(
        `Correction audit item ${index + 1} for ${correction.message_id} expected ${change.count} occurrence(s), found ${found}`,
      );
    }
    replayed = replayed.split(change.from).join(change.to);
  }
  return replayed;
}

const sourceUsersById = new Map(userRecords.map((record) => [record.messageId, record]));
const corrections = new Map();
for (const correction of correctionsInput) {
  if (!correction || typeof correction !== 'object' || Array.isArray(correction)) {
    throw new Error('Correction manifest entries must be objects');
  }
  if (!correction.message_id || corrections.has(correction.message_id)) {
    throw new Error(`Missing or duplicate correction message id: ${correction.message_id ?? 'unknown'}`);
  }
  const source = sourceUsersById.get(correction.message_id);
  if (!source) throw new Error(`Correction refers to an unknown/non-user message: ${correction.message_id}`);
  if (!isHexHash(correction.original_sha256) || correction.original_sha256 !== sha256Hex(source.text)) {
    throw new Error(`Correction original hash mismatch: ${correction.message_id}`);
  }
  if (typeof correction.corrected !== 'string' || !correction.corrected) {
    throw new Error(`Correction display text is empty: ${correction.message_id}`);
  }
  if (typeof correction.changed !== 'boolean' || correction.changed !== (correction.corrected !== source.text)) {
    throw new Error(`Correction changed flag mismatch: ${correction.message_id}`);
  }
  const replayed = replayChanges(source.text, correction);
  if (replayed !== correction.corrected) {
    throw new Error(`Correction audit does not replay to corrected text: ${correction.message_id}`);
  }
  if (correction.changed !== (correction.changes.length > 0)) {
    throw new Error(`Correction audit presence disagrees with changed flag: ${correction.message_id}`);
  }
  const digitPattern = /\d+(?:[.,:/~–—-]\d+)*/g;
  const urlPattern = /https?:\/\/[^\s<]+/g;
  const newlinePattern = /\r\n|\r|\n/g;
  const punctuationPattern = /[\p{P}\p{S}]/gu;
  for (const [label, pattern] of [
    ['number/date token', digitPattern],
    ['URL', urlPattern],
    ['newline sequence', newlinePattern],
    ['punctuation/symbol sequence', punctuationPattern],
  ]) {
    if (!jsonEqual(source.text.match(pattern) ?? [], correction.corrected.match(pattern) ?? [])) {
      throw new Error(`Correction changed a protected ${label}: ${correction.message_id}`);
    }
  }
  corrections.set(correction.message_id, correction);
}
if (corrections.size !== sourceUsersById.size) {
  const missing = [...sourceUsersById.keys()].filter((messageId) => !corrections.has(messageId));
  throw new Error(`Correction manifest is incomplete; missing: ${missing.join(', ')}`);
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
    const correction = corrections.get(record.messageId);
    return {
      ...base,
      original: record.text,
      originalSha256: sha256(record.text),
      ...(correction.changed
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
    channel: record.channel,
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
for (const [date, records] of [...byDate].sort(([left], [right]) => left.localeCompare(right))) {
  const [, month, day] = date.split('-').map(Number);
  const messages = records.map(publicMessage);
  if (messages.filter((message) => message.role === 'user').length !== 1 || !messages.some((message) => message.role === 'assistant')) {
    throw new Error(`Daily life post does not contain its exact one-user visible exchange: ${date}`);
  }
  const sourceKeys = [...new Set(records.map((record) => record.sourceKey))];
  posts.push({
    schemaVersion: 2,
    recordId: `life-${date}-conversation`,
    board: 'life',
    entryType: 'letter',
    title: `2026년 ${month}월 ${day}일 선진과 함께하는 삶`,
    status: published ? 'published' : 'draft',
    sensitivity: 'highly-sensitive',
    recordedAt: stamp(date, 'day'),
    tags: ['원문 편지', '날짜별 기록'],
    sources: sourceKeys.map((key) => sources[key]),
    messages,
    amendments: [],
    media: [],
    related: [],
    privacyReviewed: publishReviewed,
  });
}
if (
  posts.length !== EXPECTED_ARCHIVE.dailyPostCount ||
  posts[0]?.recordedAt.start !== EXPECTED_ARCHIVE.firstRecordedAt.slice(0, 10) ||
  posts.at(-1)?.recordedAt.start !== EXPECTED_ARCHIVE.throughDate ||
  !jsonEqual(
    posts.map((post) => post.recordedAt.start),
    EXPECTED_ARCHIVE.dates,
  )
) {
  throw new Error('Daily life-post grouping does not match the verified date range');
}

const referenceUrls = posts.flatMap((post) =>
  post.messages.flatMap((message) => (message.role === 'assistant' ? message.references.map((reference) => reference.url) : [])),
);
if (
  referenceUrls.length !== EXPECTED_ARCHIVE.referenceCount ||
  new Set(referenceUrls).size !== EXPECTED_ARCHIVE.referenceCount
) {
  throw new Error(`Expected exactly ${EXPECTED_ARCHIVE.referenceCount} retained unique content-reference links`);
}

const correctedUserCount = posts.reduce(
  (sum, post) => sum + post.messages.filter((message) => message.role === 'user' && message.corrected).length,
  0,
);
const publishedJson = posts.map((post) => JSON.stringify(post)).join('\n');
const ledgerPath = resolve('src/data/import-ledger.json');
const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
const importId = 'life-shared-conversations-2026-09-01';
const previousImport = (ledger.imports ?? []).find((entry) => entry.id === importId);
if (previousImport && !replaceExisting) {
  throw new Error(`Import ledger already contains ${importId}; rerun with --replace=true only after explicit review`);
}

ledger.schemaVersion = 2;
ledger.lastUpdated = verifiedAt.slice(0, 10);
ledger.boards ??= {};
ledger.boards.life = {
  status: published
    ? `published-through-${EXPECTED_ARCHIVE.throughDate}`
    : `draft-through-${EXPECTED_ARCHIVE.throughDate}`,
  sourceThreads: sourceSnapshots.map((snapshot) => snapshot.expectation.title),
  publicationRule: 'complete-visible-source-messages-only',
  sourceRequirement: 'confirmed-chatgpt-shared-conversation-snapshot',
};
ledger.imports = (ledger.imports ?? []).filter((entry) => entry.id !== importId);
ledger.imports.push({
  id: importId,
  board: 'life',
  verifiedAt,
  publication: {
    status: published ? 'published' : 'draft',
    privacyReviewed: publishReviewed,
    publicPreviewAuthorizedByUser: publicPreviewAuthorized,
  },
  sources: sourceSnapshots.map((snapshot) => ({
    sourceId: sources[snapshot.sourceKey].id,
    title: snapshot.expectation.title,
    rawSnapshotSha256: snapshot.files.raw.hash,
    rawSnapshotBytes: snapshot.files.raw.bytes,
    visibleRecordsFileSha256: snapshot.files.visible.hash,
    allRecordsFileSha256: snapshot.files.all.hash,
    manifestFileSha256: snapshot.files.manifest.hash,
    visibleMessageCount: snapshot.visible.length,
    allUserAssistantRecordCount: snapshot.all.length,
    visibleSequenceSha256: snapshot.manifest.hashes.visible_text_ordered_sequence_sha256,
    currentNode: snapshot.manifest.current_node,
  })),
  merge: {
    phase1Phase2DuplicateMessageCount: overlap12,
    phase1Phase3DuplicateMessageCount: overlap13,
    phase2Phase3DuplicateMessageCount: overlap23,
    duplicateOccurrencesRemoved,
    publishedMessageCount: normalized.length,
    publishedUserMessageCount: userRecords.length,
    publishedAssistantMessageCount: assistantRecords.length,
    publishedAssistantCommentaryCount: EXPECTED_ARCHIVE.commentaryCount,
    publishedAssistantFinalCount: EXPECTED_ARCHIVE.finalCount,
    correctedUserMessageCount: correctedUserCount,
    retainedReferenceLinkCount: referenceUrls.length,
    referenceUrlPolicy: 'session-identifiers-and-tracking-query-parameters-removed',
    dailyPostCount: posts.length,
    firstRecordedAt: EXPECTED_ARCHIVE.firstRecordedAt,
    lastRecordedAt: EXPECTED_ARCHIVE.lastRecordedAt,
    publishedContentSha256: sha256Hex(publishedJson),
  },
  withheld: [],
  excludedSourceRecords: [...hiddenRedactedUsers.values()]
    .map(({ record }) => ({
      sourceMessageId: record.message_id,
      role: 'user',
      recordedAt: record.create_time_kst,
      reason: 'source-record-is-visually-hidden-and-redacted',
      publicationStatus: 'excluded-without-text',
    }))
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt)),
  posts: posts.map((post) => post.recordId),
});

const serializedPosts = posts.map((post) => `${JSON.stringify(post, null, 2)}\n`);
const serializedLedger = `${JSON.stringify(ledger, null, 2)}\n`;
const committedPayload = `${serializedPosts.join('')}\n${serializedLedger}`;
if (/chatgpt\.com\/share\//i.test(committedPayload)) {
  throw new Error('Refusing to commit a shared-conversation locator');
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

const outputDirectory = resolve('src/content/posts/life');
if (await exists(outputDirectory)) {
  const existing = (await readdir(outputDirectory)).sort();
  if (!replaceExisting) {
    throw new Error(
      `Refusing to overwrite the life post directory${existing.length ? ` (${existing.join(', ')})` : ''}; use --replace=true only after explicit review`,
    );
  }
  if (!previousImport || !Array.isArray(previousImport.posts)) {
    throw new Error('Replace mode requires a prior ledger-managed life import');
  }
  const managedByFile = new Map(
    previousImport.posts.map((recordId) => {
      const match = /^life-(\d{4}-\d{2}-\d{2})-conversation$/.exec(recordId);
      if (!match) throw new Error(`Prior life import contains an invalid record id: ${recordId}`);
      return [`${match[1]}.json`, recordId];
    }),
  );
  if (managedByFile.size !== previousImport.posts.length) {
    throw new Error('Prior life import repeats a managed post id');
  }
  const managedFiles = [...managedByFile.keys()].sort();
  if (!jsonEqual(existing, managedFiles)) {
    throw new Error('Replace mode refused: the life directory contains files not owned by the prior import');
  }
  const currentManagedPosts = [];
  for (const name of existing) {
    const current = JSON.parse(await readFile(join(outputDirectory, name), 'utf8'));
    if (current.recordId !== managedByFile.get(name) || current.board !== 'life') {
      throw new Error(`Replace mode refused: existing post identity differs from the prior ledger (${name})`);
    }
    currentManagedPosts.push(current);
  }
  const currentManagedHash = sha256Hex(currentManagedPosts.map((post) => JSON.stringify(post)).join('\n'));
  if (
    !isHexHash(previousImport.merge?.publishedContentSha256) ||
    currentManagedHash !== previousImport.merge.publishedContentSha256
  ) {
    throw new Error('Replace mode refused: a previously imported life post was edited after publication');
  }
}

const transactionId = `${process.pid}-${randomUUID()}`;
const stageDirectory = join(dirname(outputDirectory), `.life-import-${transactionId}`);
const stagedLedgerPath = join(dirname(ledgerPath), `.import-ledger-${transactionId}.json`);
const backupDirectory = `${outputDirectory}.backup-${transactionId}`;
const backupLedgerPath = `${ledgerPath}.backup-${transactionId}`;
let outputBackedUp = false;
let ledgerBackedUp = false;
let outputInstalled = false;
let ledgerInstalled = false;

try {
  await mkdir(dirname(outputDirectory), { recursive: true });
  await mkdir(stageDirectory, { recursive: false });
  for (const [index, post] of posts.entries()) {
    await writeFile(join(stageDirectory, `${post.recordedAt.start}.json`), serializedPosts[index], {
      encoding: 'utf8',
      flag: 'wx',
    });
  }
  await writeFile(stagedLedgerPath, serializedLedger, { encoding: 'utf8', flag: 'wx' });

  if (await exists(outputDirectory)) {
    await rename(outputDirectory, backupDirectory);
    outputBackedUp = true;
  }
  await rename(ledgerPath, backupLedgerPath);
  ledgerBackedUp = true;
  await rename(stageDirectory, outputDirectory);
  outputInstalled = true;
  await rename(stagedLedgerPath, ledgerPath);
  ledgerInstalled = true;
} catch (error) {
  if (ledgerInstalled && (await exists(ledgerPath))) await rm(ledgerPath, { force: true });
  if (outputInstalled && (await exists(outputDirectory))) await rm(outputDirectory, { recursive: true, force: true });
  if (ledgerBackedUp && (await exists(backupLedgerPath))) await rename(backupLedgerPath, ledgerPath);
  if (outputBackedUp && (await exists(backupDirectory))) await rename(backupDirectory, outputDirectory);
  await rm(stageDirectory, { recursive: true, force: true });
  await rm(stagedLedgerPath, { force: true });
  throw error;
}

const cleanupResults = await Promise.allSettled([
  ...(outputBackedUp ? [rm(backupDirectory, { recursive: true, force: true })] : []),
  rm(backupLedgerPath, { force: true }),
]);
for (const result of cleanupResults) {
  if (result.status === 'rejected') {
    console.warn(`Import committed, but a transaction backup could not be removed: ${result.reason}`);
  }
}

console.log(
  JSON.stringify(
    {
      posts: posts.length,
      messages: normalized.length,
      users: userRecords.length,
      assistantCommentary: EXPECTED_ARCHIVE.commentaryCount,
      assistantFinal: EXPECTED_ARCHIVE.finalCount,
      correctedUsers: correctedUserCount,
      referenceLinks: referenceUrls.length,
      excludedHiddenRedactedUsers: hiddenRedactedUsers.size,
      published,
      publicPreviewAuthorized,
      replaced: replaceExisting,
      outputDirectory,
      ledger: basename(ledgerPath),
    },
    null,
    2,
  ),
);
