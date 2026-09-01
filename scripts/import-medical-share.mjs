import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const EXPECTED_SOURCE = {
  title: '의학지식 문의',
  rawSnapshotBytes: 1_608_594,
  rawSnapshotSha256: '215e5497f8b04b0dc06219df08d2dde7265c00d5ad2638be014c5d57e978587d',
  manifestFileSha256: '2c4235a0224b46afeb9a8ee97f00714c2ad3510eeeb256ae9efea2338b1e1e18',
  visibleFileSha256: '3fea4e04e40bea03d953c8879aa6569d79eb09d74e7980d3035da8dca4060baf',
  allUserAssistantFileSha256: '31d8904c7aaf98278289472dddca37420a5667274a02fd829a5c7e4e4e1ecc88',
  allMessagesFileSha256: '13a81290f8191be3d4942b468545d326eb7783b5c4ddbc94c557d7843c2da45d',
  completeFileSha256: 'defea2de18b0f19addccd558ac8e06395adf187b2653670c6ec3c803c4c8d36a',
  completeAuditFileSha256: '024f9db7d1f8da9fdc3f8ac0389c5a7d90b9b326a1973e62995f4a68fd992f3c',
  correctionsFileSha256: '71332fad99cc3b59c39730b02a32a5e1f2ceed8627a7bdf1492628802faedc59',
  visibleCount: 44,
  allUserAssistantCount: 157,
  allMessageCount: 273,
  visibleUserCount: 19,
  visibleAssistantCount: 25,
  visibleCommentaryCount: 7,
  visibleFinalCount: 18,
  visibleSequenceSha256: 'b901ce15cdb092ad62fa8c2cafe5c8197045bd845a2c335d0e406ffbaecf4e3a',
  finalStyleSequenceSha256: '2189d509a14b02897d863d58811f8c9a789ec289302a361fccbd04073740e690',
  currentNode: 'a1983b07-d99a-466e-a66a-d25de304734d',
};

const EXPECTED_COMPLETE = {
  messageCount: 57,
  regularMessageCount: 56,
  embeddedReportCount: 1,
  userCount: 23,
  assistantCount: 34,
  finalCount: 23,
  commentaryCount: 7,
  nullChannelCount: 27,
  sourceKinds: {
    conversation_message: 44,
    embedded_app_report: 1,
    voice_transcript: 12,
  },
  datesAndCounts: {
    '2026-08-01': 2,
    '2026-08-17': 4,
    '2026-08-18': 18,
    '2026-08-22': 2,
    '2026-08-25': 4,
    '2026-08-26': 21,
    '2026-08-27': 4,
    '2026-08-30': 2,
  },
  firstRecordedAt: '2026-08-01T12:10:52.771184+09:00',
  lastRecordedAt: '2026-08-30T06:04:33.966781+09:00',
  orderedSequenceSha256: '71c9b88892117e59500d3a1d9fc39e1ccce09b9cf672fbe61d259ed0c3382d56',
  embeddedSequenceSha256: '2afd763a006efcb0b8327f265d20e6b1359c7e46ef806d9569f8c538e249cc9b',
  embeddedReportMessageId: '44e34fb4-5556-47e9-bb53-ff3b2fdf4440',
  embeddedReportHostMessageId: 'b1112c09-6c49-4591-a109-e0d09eb8ae1b',
  hiddenCount: 2,
  redactedCount: 12,
  hiddenOrRedactedCount: 12,
  hiddenOrRedactedIndices: [13, 14, 33, 40, 48, 110, 121, 167, 237, 261, 264, 272],
  messagesWithReferenceEntries: 18,
  contentReferenceEntryCount: 121,
  contentReferenceTypeCounts: { grouped_webpages: 45, sources_footnote: 14, hidden: 62 },
  referenceMessagesWithRecoverableUrls: 5,
  rawReferenceUrlOccurrenceCount: 255,
  rawReferenceUniqueUrlCount: 86,
  rawReferenceUrlsWithUtmCount: 42,
  rawReferenceUrlsWithSessionMarkerCount: 0,
  exactTextSandboxLinkCount: 2,
  exactTextPersonalRecipientEmailCount: 1,
};

const EXPECTED_PUBLICATION = {
  messageCount: 52,
  userCount: 22,
  assistantCount: 30,
  finalCount: 22,
  commentaryCount: 4,
  unknownChannelCount: 4,
  dailyPostCount: 8,
  dates: Object.keys(EXPECTED_COMPLETE.datesAndCounts),
  firstRecordedAt: EXPECTED_COMPLETE.firstRecordedAt,
  lastRecordedAt: EXPECTED_COMPLETE.lastRecordedAt,
  throughDate: '2026-08-30',
  perMessageReferenceCount: 45,
  globallyUniqueReferenceCount: 44,
  referenceCountsByMessageId: {
    '44e34fb4-5556-47e9-bb53-ff3b2fdf4440': 24,
    '263673dc-4f78-43de-b043-4a923aeda8af': 5,
    '652b2819-e012-4c5c-a3b6-ed880949e40d': 6,
    '2ae5bfbd-dab2-486b-a264-1416122e45f6': 4,
    '7e62a73d-2dc8-4164-80f2-5c78288d2662': 6,
  },
};

const WITHHELD = [
  {
    sourceOrdinal: 35,
    messageId: 'dcab2305-fe27-4e4e-a5c5-d6fcd6a12c37',
    role: 'user',
    channel: null,
    recordedAt: '2026-08-26T00:43:56.878370+09:00',
    textSha256: 'f99c27d220b7860b3b85ec7c1742c2e2c8f540634964e2a907300b71476d2064',
  },
  {
    sourceOrdinal: 36,
    messageId: '472ef46a-d261-4565-82d9-30bdf2b605dd',
    role: 'assistant',
    channel: 'commentary',
    recordedAt: '2026-08-26T00:44:15.012433+09:00',
    textSha256: '56a4d2b6104454cd316384a2262be2fcd3cbf0b17864f578356be937189d06ab',
  },
  {
    sourceOrdinal: 37,
    messageId: '3b22d631-fc83-4ccc-a642-2fd4fd1c6f0d',
    role: 'assistant',
    channel: 'commentary',
    recordedAt: '2026-08-26T00:47:19.723273+09:00',
    textSha256: '9d6b2c2a21d9d17a0ef89d551fbae8728fa9a789394323ed40649a2338749355',
  },
  {
    sourceOrdinal: 38,
    messageId: 'fc5da018-a162-4e4f-b769-924d2a275bf0',
    role: 'assistant',
    channel: 'commentary',
    recordedAt: '2026-08-26T00:56:25.000020+09:00',
    textSha256: 'bcdb600c53cd22c7116fdadc4a59bae6c379d83f77e875d781f322468a13a9c5',
  },
  {
    sourceOrdinal: 39,
    messageId: '077a0f6c-0ddf-4fd0-8f1b-715db4306f69',
    role: 'assistant',
    channel: 'final',
    recordedAt: '2026-08-26T00:57:01.537452+09:00',
    textSha256: '7aef1dec0c52cdb55abf6be5773facff2926d76fe3aa2fe3dc0353b94ec0cdc9',
  },
];

const allowedArgs = new Set([
  'visible',
  'all',
  'all-messages',
  'manifest',
  'raw',
  'complete',
  'complete-audit',
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
  'visible',
  'all',
  'all-messages',
  'manifest',
  'raw',
  'complete',
  'complete-audit',
  'corrections',
  'verified-at',
  'publish-reviewed',
  'public-preview-authorized',
];
const missingArgs = requiredArgs.filter((key) => !Object.hasOwn(args, key) || !args[key]);
if (missingArgs.length) throw new Error(`Missing arguments: ${missingArgs.join(', ')}`);

function explicitBoolean(name, defaultValue) {
  if (!Object.hasOwn(args, name)) return defaultValue;
  if (!['true', 'false'].includes(args[name])) throw new Error(`--${name} must be explicitly true or false`);
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
  return { absolutePath, raw, hash: sha256Hex(raw), bytes: Buffer.byteLength(raw), value: JSON.parse(raw) };
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

function exactPartText(message) {
  const parts = message?.content?.parts ?? [];
  if (!Array.isArray(parts)) throw new Error('Source message content.parts is not an array');
  return parts
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && typeof part.text === 'string') return part.text;
      return '';
    })
    .join('');
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

function isPublicRegularRecord(record) {
  const metadata = record.message?.metadata ?? {};
  return Boolean(
    ['user', 'assistant'].includes(record.role) &&
      record.recipient === 'all' &&
      !metadata.is_visually_hidden_from_conversation &&
      !metadata.is_redacted &&
      ['text', 'multimodal_text'].includes(record.content_type) &&
      exactPartText(record.message),
  );
}

function visibleSequenceBlob(records) {
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

function completeSequenceBlob(records) {
  return records
    .map((record) =>
      [
        String(record.source_order),
        record.message_id,
        record.role,
        record.channel ?? '',
        String(record.create_time),
        record.content_type,
        record.text,
      ].join('\x1f'),
    )
    .join('\x1e');
}

function countBy(records, field, value) {
  return records.filter((record) => record[field] === value).length;
}

function validateShareLocator(manifest) {
  for (const field of ['source_url_requested', 'source_url_final']) {
    let parsed;
    try {
      parsed = new URL(manifest[field]);
    } catch {
      throw new Error(`Manifest has an invalid ${field}`);
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
      throw new Error(`Manifest ${field} is not its exact shared-conversation locator`);
    }
  }
  if (manifest.source_url_requested !== manifest.source_url_final) {
    throw new Error('Source URL changed during extraction');
  }
  if (manifest.conversation_id !== manifest.share_id) {
    throw new Error('Manifest conversation/share identifiers differ');
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
  if (!['system', 'user', 'assistant', 'tool'].includes(record.role) || record.message?.author?.role !== record.role) {
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
  } else if (
    record.update_time_utc !== epochToUtcMicros(record.update_time) ||
    record.update_time_kst !== epochToKstMicros(record.update_time)
  ) {
    throw new Error(`${sourceName} update timestamp mismatch: ${record.message_id}`);
  }
  return record.linear_index;
}

const [visibleFile, allFile, allMessagesFile, manifestFile, completeFile, completeAuditFile, correctionsFile] =
  await Promise.all([
    readJsonWithRaw(args.visible),
    readJsonWithRaw(args.all),
    readJsonWithRaw(args['all-messages']),
    readJsonWithRaw(args.manifest),
    readJsonWithRaw(args.complete),
    readJsonWithRaw(args['complete-audit']),
    readJsonWithRaw(args.corrections),
  ]);
const rawFile = await readRawSnapshot(args.raw);

for (const [label, file, expectedHash] of [
  ['visible records', visibleFile, EXPECTED_SOURCE.visibleFileSha256],
  ['all user/assistant records', allFile, EXPECTED_SOURCE.allUserAssistantFileSha256],
  ['all message records', allMessagesFile, EXPECTED_SOURCE.allMessagesFileSha256],
  ['validation manifest', manifestFile, EXPECTED_SOURCE.manifestFileSha256],
  ['complete chronology', completeFile, EXPECTED_SOURCE.completeFileSha256],
  ['complete audit manifest', completeAuditFile, EXPECTED_SOURCE.completeAuditFileSha256],
  ['audited typo corrections', correctionsFile, EXPECTED_SOURCE.correctionsFileSha256],
]) {
  if (file.hash !== expectedHash) throw new Error(`${label} file hash does not match the reviewed extraction`);
}

const visible = visibleFile.value;
const allUserAssistant = allFile.value;
const allMessages = allMessagesFile.value;
const manifest = manifestFile.value;
const complete = completeFile.value;
const completeAudit = completeAuditFile.value;
const correctionsInput = correctionsFile.value;
if (
  !Array.isArray(visible) ||
  !Array.isArray(allUserAssistant) ||
  !Array.isArray(allMessages) ||
  !Array.isArray(complete) ||
  !Array.isArray(correctionsInput)
) {
  throw new Error('Visible, all-record, complete-chronology, and correction inputs must be arrays');
}

if (manifest.title !== EXPECTED_SOURCE.title) throw new Error('Source title does not match the intended conversation');
validateShareLocator(manifest);
if (
  rawFile.hash !== EXPECTED_SOURCE.rawSnapshotSha256 ||
  rawFile.bytes !== EXPECTED_SOURCE.rawSnapshotBytes ||
  manifest.hashes?.raw_page_html_sha256 !== EXPECTED_SOURCE.rawSnapshotSha256 ||
  manifest.raw_html_bytes !== EXPECTED_SOURCE.rawSnapshotBytes
) {
  throw new Error('Raw snapshot bytes/hash do not match the reviewed extraction and its manifest');
}
if (
  allMessages.length !== EXPECTED_SOURCE.allMessageCount ||
  allMessages.length !== manifest.message_record_count ||
  allUserAssistant.length !== EXPECTED_SOURCE.allUserAssistantCount ||
  allUserAssistant.length !== manifest.user_assistant_record_count_including_hidden_internal ||
  visible.length !== EXPECTED_SOURCE.visibleCount ||
  visible.length !== manifest.visible_user_assistant_text_count
) {
  throw new Error('Source record counts do not match the reviewed extraction');
}
if (
  manifest.visible_role_counts?.user !== EXPECTED_SOURCE.visibleUserCount ||
  manifest.visible_role_counts?.assistant !== EXPECTED_SOURCE.visibleAssistantCount ||
  manifest.visible_channel_counts?.None !== EXPECTED_SOURCE.visibleUserCount ||
  manifest.visible_channel_counts?.commentary !== EXPECTED_SOURCE.visibleCommentaryCount ||
  manifest.visible_channel_counts?.final !== EXPECTED_SOURCE.visibleFinalCount ||
  countBy(visible, 'role', 'user') !== EXPECTED_SOURCE.visibleUserCount ||
  countBy(visible, 'role', 'assistant') !== EXPECTED_SOURCE.visibleAssistantCount ||
  countBy(visible, 'channel', 'commentary') !== EXPECTED_SOURCE.visibleCommentaryCount ||
  countBy(visible, 'channel', 'final') !== EXPECTED_SOURCE.visibleFinalCount
) {
  throw new Error('Visible source role/channel counts do not match the reviewed extraction');
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
  throw new Error('Extraction manifest contains a failed or missing integrity check');
}
if (manifest.current_node !== EXPECTED_SOURCE.currentNode || visible.at(-1)?.message_id !== manifest.current_node) {
  throw new Error('Current source node does not match the last visible message');
}
const calculatedVisibleSequenceHash = sha256Hex(visibleSequenceBlob(visible));
if (
  calculatedVisibleSequenceHash !== EXPECTED_SOURCE.visibleSequenceSha256 ||
  calculatedVisibleSequenceHash !== manifest.hashes?.visible_text_ordered_sequence_sha256
) {
  throw new Error('Visible ordered-sequence hash mismatch');
}
const finalStyle = visible.filter(
  (record) => record.role === 'user' || (record.role === 'assistant' && record.channel === 'final'),
);
if (
  sha256Hex(visibleSequenceBlob(finalStyle)) !== EXPECTED_SOURCE.finalStyleSequenceSha256 ||
  sha256Hex(visibleSequenceBlob(finalStyle)) !== manifest.hashes?.user_and_final_answers_ordered_sequence_sha256 ||
  finalStyle.length !== manifest.final_style_transcript_count ||
  manifest.assistant_final_answer_count !== EXPECTED_SOURCE.visibleFinalCount
) {
  throw new Error('Visible final-style transcript integrity mismatch');
}

let previousLinearIndex = -1;
const allMessageIds = new Set();
for (const record of allMessages) {
  previousLinearIndex = validateRecord(record, 'all message records', previousLinearIndex);
  if (allMessageIds.has(record.message_id)) throw new Error(`All-message input repeats ${record.message_id}`);
  allMessageIds.add(record.message_id);
}
const selectedUserAssistant = allMessages.filter((record) => ['user', 'assistant'].includes(record.role));
if (!isDeepStrictEqual(selectedUserAssistant, allUserAssistant)) {
  throw new Error('User/assistant input is not the exact role selection from all message records');
}
const selectedVisible = allUserAssistant.filter(isVisibleText);
if (!isDeepStrictEqual(selectedVisible, visible)) {
  throw new Error('Visible input is not the exact public text selection from all user/assistant records');
}
if (visible.some((record) => record.status !== 'finished_successfully')) {
  throw new Error('Visible input contains an unfinished message');
}

function reconstructEmbeddedReports(records) {
  const reports = [];
  for (const host of records) {
    const widgetState = host.message?.metadata?.chatgpt_sdk?.widget_state;
    if (typeof widgetState !== 'string') continue;
    let state;
    try {
      state = JSON.parse(widgetState);
    } catch {
      continue;
    }
    const report = state?.report_message;
    if (!report || typeof report !== 'object' || Array.isArray(report)) continue;
    const text = exactPartText(report);
    if (!text) continue;
    reports.push({
      linear_anchor_index: host.linear_index,
      source_order: `linear:${String(host.linear_index).padStart(6, '0')}:embedded-report`,
      source_kind: 'embedded_app_report',
      host_message_id: host.message_id,
      message_id: report.id,
      role: report.author?.role,
      channel: report.channel ?? null,
      recipient: report.recipient,
      status: report.status,
      end_turn: report.end_turn ?? null,
      create_time: report.create_time,
      create_time_kst: epochToKstMicros(report.create_time),
      update_time: report.update_time ?? null,
      content_type: report.content?.content_type,
      text,
      text_sha256: sha256Hex(text),
      message: report,
    });
  }
  return reports;
}

const reconstructedRegular = allMessages.filter(isPublicRegularRecord).map((record) => {
  const text = exactPartText(record.message);
  return {
    ...record,
    text,
    text_sha256: sha256Hex(text),
    source_kind: record.content_type === 'multimodal_text' ? 'voice_transcript' : 'conversation_message',
    source_order: `linear:${String(record.linear_index).padStart(6, '0')}`,
  };
});
const reconstructedReports = reconstructEmbeddedReports(allMessages);
const reconstructedComplete = [...reconstructedRegular, ...reconstructedReports].sort(
  (left, right) => left.create_time - right.create_time || left.source_order.localeCompare(right.source_order),
);
if (!isDeepStrictEqual(reconstructedComplete, complete)) {
  throw new Error('Complete chronology is not the exact text/voice/embedded-report reconstruction from all records');
}

const completeSequenceHash = sha256Hex(completeSequenceBlob(complete));
const embeddedSequenceHash = sha256Hex(completeSequenceBlob(reconstructedReports));
if (
  complete.length !== EXPECTED_COMPLETE.messageCount ||
  reconstructedRegular.length !== EXPECTED_COMPLETE.regularMessageCount ||
  reconstructedReports.length !== EXPECTED_COMPLETE.embeddedReportCount ||
  completeSequenceHash !== EXPECTED_COMPLETE.orderedSequenceSha256 ||
  completeSequenceHash !== completeAudit.hashes?.complete_public_ordered_sequence_sha256 ||
  embeddedSequenceHash !== EXPECTED_COMPLETE.embeddedSequenceSha256 ||
  embeddedSequenceHash !== completeAudit.hashes?.embedded_report_ordered_sequence_sha256
) {
  throw new Error('Complete chronology bounds or sequence hashes do not match the audited source');
}
const embeddedReport = reconstructedReports[0];
if (
  embeddedReport?.message_id !== EXPECTED_COMPLETE.embeddedReportMessageId ||
  embeddedReport?.host_message_id !== EXPECTED_COMPLETE.embeddedReportHostMessageId ||
  embeddedReport?.role !== 'assistant' ||
  embeddedReport?.channel !== 'final' ||
  embeddedReport?.recipient !== 'all' ||
  embeddedReport?.status !== 'finished_successfully' ||
  embeddedReport?.end_turn !== true
) {
  throw new Error('Deep Research embedded report or its host does not match the audited source');
}

const completeDateCounts = Object.fromEntries(
  [...new Set(complete.map((record) => record.create_time_kst.slice(0, 10)))].map((date) => [
    date,
    complete.filter((record) => record.create_time_kst.startsWith(date)).length,
  ]),
);
const completeSourceKindCounts = Object.fromEntries(
  Object.keys(EXPECTED_COMPLETE.sourceKinds).map((kind) => [kind, countBy(complete, 'source_kind', kind)]),
);
if (
  complete[0]?.create_time_kst !== EXPECTED_COMPLETE.firstRecordedAt ||
  complete.at(-1)?.create_time_kst !== EXPECTED_COMPLETE.lastRecordedAt ||
  countBy(complete, 'role', 'user') !== EXPECTED_COMPLETE.userCount ||
  countBy(complete, 'role', 'assistant') !== EXPECTED_COMPLETE.assistantCount ||
  countBy(complete, 'channel', 'final') !== EXPECTED_COMPLETE.finalCount ||
  countBy(complete, 'channel', 'commentary') !== EXPECTED_COMPLETE.commentaryCount ||
  countBy(complete, 'channel', null) !== EXPECTED_COMPLETE.nullChannelCount ||
  !jsonEqual(completeSourceKindCounts, EXPECTED_COMPLETE.sourceKinds) ||
  !jsonEqual(completeDateCounts, EXPECTED_COMPLETE.datesAndCounts)
) {
  throw new Error('Complete chronology role, channel, source-kind, date, or time bounds do not match the audit');
}

const hiddenOrRedacted = allUserAssistant.filter((record) => {
  const metadata = record.message?.metadata ?? {};
  return metadata.is_visually_hidden_from_conversation || metadata.is_redacted;
});
const hiddenRecords = allUserAssistant.filter(
  (record) => record.message?.metadata?.is_visually_hidden_from_conversation === true,
);
const redactedRecords = allUserAssistant.filter((record) => record.message?.metadata?.is_redacted === true);
if (
  hiddenRecords.length !== EXPECTED_COMPLETE.hiddenCount ||
  redactedRecords.length !== EXPECTED_COMPLETE.redactedCount ||
  hiddenOrRedacted.length !== EXPECTED_COMPLETE.hiddenOrRedactedCount ||
  !jsonEqual(
    hiddenOrRedacted.map((record) => record.linear_index),
    EXPECTED_COMPLETE.hiddenOrRedactedIndices,
  )
) {
  throw new Error('Hidden/redacted source-record evidence differs from the complete audit');
}

const requiredCompleteAuditChecks = [
  'all_complete_text_nonempty',
  'all_complete_hashes_match',
  'all_complete_message_ids_unique',
  'all_regular_records_finished_successfully',
  'embedded_reports_are_assistant_final',
];
if (
  requiredCompleteAuditChecks.some((key) => completeAudit.checks?.[key] !== true) ||
  completeAudit.complete_public_message_count !== EXPECTED_COMPLETE.messageCount ||
  completeAudit.regular_text_and_voice_message_count !== EXPECTED_COMPLETE.regularMessageCount ||
  completeAudit.embedded_app_report_count !== EXPECTED_COMPLETE.embeddedReportCount ||
  !jsonEqual(completeAudit.role_counts, { user: 23, assistant: 34 }) ||
  !jsonEqual(completeAudit.channel_counts, { None: 27, final: 23, commentary: 7 }) ||
  !jsonEqual(completeAudit.source_kind_counts, EXPECTED_COMPLETE.sourceKinds) ||
  !jsonEqual(completeAudit.counts_by_kst_date, EXPECTED_COMPLETE.datesAndCounts) ||
  completeAudit.first_create_time_kst !== EXPECTED_COMPLETE.firstRecordedAt ||
  completeAudit.last_create_time_kst !== EXPECTED_COMPLETE.lastRecordedAt ||
  completeAudit.hidden_user_assistant_record_count !== EXPECTED_COMPLETE.hiddenCount ||
  completeAudit.redacted_user_assistant_record_count !== EXPECTED_COMPLETE.redactedCount ||
  completeAudit.hidden_or_redacted_user_assistant_record_count !== EXPECTED_COMPLETE.hiddenOrRedactedCount ||
  !jsonEqual(completeAudit.hidden_or_redacted_indices, EXPECTED_COMPLETE.hiddenOrRedactedIndices) ||
  completeAudit.message_count_with_content_reference_entries !== EXPECTED_COMPLETE.messagesWithReferenceEntries ||
  completeAudit.content_reference_entry_count !== EXPECTED_COMPLETE.contentReferenceEntryCount ||
  !jsonEqual(completeAudit.content_reference_type_counts, EXPECTED_COMPLETE.contentReferenceTypeCounts) ||
  completeAudit.reference_message_count_with_recoverable_urls !== EXPECTED_COMPLETE.referenceMessagesWithRecoverableUrls ||
  completeAudit.reference_url_occurrence_count !== EXPECTED_COMPLETE.rawReferenceUrlOccurrenceCount ||
  completeAudit.reference_unique_url_count !== EXPECTED_COMPLETE.rawReferenceUniqueUrlCount ||
  completeAudit.reference_urls_with_utm_count !== EXPECTED_COMPLETE.rawReferenceUrlsWithUtmCount ||
  completeAudit.reference_urls_with_session_marker_count !== EXPECTED_COMPLETE.rawReferenceUrlsWithSessionMarkerCount ||
  completeAudit.sandbox_link_occurrence_count_in_exact_text !== EXPECTED_COMPLETE.exactTextSandboxLinkCount ||
  completeAudit.personal_recipient_email_occurrence_count_in_exact_text !==
    EXPECTED_COMPLETE.exactTextPersonalRecipientEmailCount
) {
  throw new Error('Complete-audit manifest does not match the reviewed source invariants');
}

function sanitizeReference(candidate) {
  if (!candidate || typeof candidate.url !== 'string') return null;
  if (/^sandbox:/i.test(candidate.url)) {
    throw new Error('Temporary sandbox artifact URLs cannot be published as references');
  }
  let normalizedUrl = candidate.url
    .replace(/%3Bjsessionid%3D[^/?#]+/gi, '')
    .replace(/;jsessionid=[^/?#]+/gi, '');
  let parsed;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    throw new Error(`Invalid content-reference URL: ${candidate.url}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  if (parsed.username || parsed.password) throw new Error('Credential-bearing reference URLs cannot be published');
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^utm_/i.test(key)) parsed.searchParams.delete(key);
  }
  for (const [key, value] of parsed.searchParams.entries()) {
    if (value && /^(?:sid|session(?:id)?|token|access_token|auth|signature|sig|x-amz-.+)$/i.test(key)) {
      throw new Error(`Session- or token-bearing reference URL cannot be published: ${candidate.url}`);
    }
  }
  normalizedUrl = parsed.toString();
  let decoded = normalizedUrl;
  try {
    decoded = decodeURIComponent(normalizedUrl);
  } catch {
    // Inspect the encoded form when a syntactically valid URL cannot be fully decoded.
  }
  if (
    /jsessionid|sandbox:\/|chatgpt\.com\/share\//i.test(decoded) ||
    /(?:^|\.)oaiusercontent\.com$/i.test(parsed.hostname)
  ) {
    throw new Error(`Sensitive or temporary content-reference URL cannot be published: ${candidate.url}`);
  }
  return {
    title: typeof candidate.title === 'string' && candidate.title ? candidate.title : normalizedUrl,
    url: normalizedUrl,
    ...(typeof candidate.attribution === 'string' && candidate.attribution
      ? { attribution: candidate.attribution }
      : {}),
  };
}

function extractReferences(metadata = {}) {
  const references = [];
  const addCandidate = (candidate) => {
    const reference = sanitizeReference(candidate);
    if (reference) references.push(reference);
    const supporting = candidate?.supporting_websites ?? [];
    if (!Array.isArray(supporting)) throw new Error('content reference supporting_websites is not an array');
    for (const website of supporting) addCandidate(website);
  };
  const contentReferences = metadata.content_references ?? [];
  if (!Array.isArray(contentReferences)) throw new Error('content_references is not an array');
  for (const contentReference of contentReferences) {
    for (const field of ['items', 'sources', 'fallback_items']) {
      const candidates = contentReference?.[field] ?? [];
      if (!Array.isArray(candidates)) throw new Error(`content_references.${field} is not an array`);
      for (const candidate of candidates) addCandidate(candidate);
    }
  }
  const seen = new Set();
  return references.filter((reference) => {
    if (seen.has(reference.url)) return false;
    seen.add(reference.url);
    return true;
  });
}

const withheldIds = new Set(WITHHELD.map((entry) => entry.messageId));
if (withheldIds.size !== WITHHELD.length) throw new Error('Withheld-message policy repeats a source id');
for (const expected of WITHHELD) {
  const actual = complete[expected.sourceOrdinal - 1];
  if (
    !actual ||
    actual.message_id !== expected.messageId ||
    actual.role !== expected.role ||
    actual.channel !== expected.channel ||
    actual.create_time_kst !== expected.recordedAt ||
    actual.text_sha256 !== expected.textSha256 ||
    sha256Hex(actual.text) !== expected.textSha256 ||
    actual.source_kind !== 'conversation_message'
  ) {
    throw new Error(`Withheld source evidence mismatch: ${expected.messageId}`);
  }
}
const withheldRecords = complete.filter((record) => withheldIds.has(record.message_id));
if (withheldRecords.length !== WITHHELD.length) throw new Error('Not every reviewed sensitive-turn message was withheld');
const sensitiveTurnIds = new Set(
  withheldRecords.map((record) => record.message?.metadata?.turn_exchange_id).filter(Boolean),
);
if (sensitiveTurnIds.size !== 1) throw new Error('The withheld document/email messages are not one complete source turn');
const sensitiveFinal = withheldRecords.find((record) => record.channel === 'final');
if (
  !sensitiveFinal ||
  !/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(sensitiveFinal.text) ||
  (sensitiveFinal.text.match(/sandbox:\//gi) ?? []).length !== EXPECTED_COMPLETE.exactTextSandboxLinkCount
) {
  throw new Error('The sensitive document/email turn no longer contains the reviewed withholding triggers');
}

const source = {
  id: 'chatgpt-medical-knowledge-2026',
  type: 'chat-conversation',
  certainty: 'confirmed',
  label: EXPECTED_SOURCE.title,
  accessedAt: verificationStamp,
};
const hostById = new Map(allMessages.map((record) => [record.message_id, record]));
const sourceKindMap = {
  conversation_message: 'conversation-message',
  voice_transcript: 'voice-transcript',
  embedded_app_report: 'embedded-app-report',
};
const normalized = complete
  .map((raw, index) => {
    const sourceKind = sourceKindMap[raw.source_kind];
    if (!sourceKind) throw new Error(`Unsupported complete-chronology source kind: ${raw.source_kind}`);
    const hostTurnId = raw.host_message_id
      ? hostById.get(raw.host_message_id)?.message?.metadata?.turn_exchange_id
      : undefined;
    return {
      sourceId: source.id,
      sourceOrdinal: index + 1,
      sourceKind,
      rawSourceKind: raw.source_kind,
      messageId: raw.message_id,
      role: raw.role,
      channel: raw.channel,
      recordedAt: raw.create_time_kst,
      turnId: raw.message?.metadata?.turn_exchange_id ?? hostTurnId,
      text: raw.text,
      references: extractReferences(raw.message?.metadata),
    };
  })
  .filter((record) => !withheldIds.has(record.messageId));

const userRecords = normalized.filter((record) => record.role === 'user');
const assistantRecords = normalized.filter((record) => record.role === 'assistant');
if (
  normalized.length !== EXPECTED_PUBLICATION.messageCount ||
  userRecords.length !== EXPECTED_PUBLICATION.userCount ||
  assistantRecords.length !== EXPECTED_PUBLICATION.assistantCount ||
  assistantRecords.filter((record) => record.channel === 'final').length !== EXPECTED_PUBLICATION.finalCount ||
  assistantRecords.filter((record) => record.channel === 'commentary').length !==
    EXPECTED_PUBLICATION.commentaryCount ||
  assistantRecords.filter((record) => record.channel == null).length !== EXPECTED_PUBLICATION.unknownChannelCount ||
  assistantRecords.some((record) => !['final', 'commentary', null].includes(record.channel)) ||
  normalized[0]?.recordedAt !== EXPECTED_PUBLICATION.firstRecordedAt ||
  normalized.at(-1)?.recordedAt !== EXPECTED_PUBLICATION.lastRecordedAt
) {
  throw new Error('Public message selection does not match the reviewed publication counts or bounds');
}

const actualReferenceCounts = Object.fromEntries(
  normalized
    .filter((record) => record.references.length)
    .map((record) => [record.messageId, record.references.length]),
);
const allReferenceUrls = normalized.flatMap((record) => record.references.map((reference) => reference.url));
if (
  !jsonEqual(actualReferenceCounts, EXPECTED_PUBLICATION.referenceCountsByMessageId) ||
  allReferenceUrls.length !== EXPECTED_PUBLICATION.perMessageReferenceCount ||
  new Set(allReferenceUrls).size !== EXPECTED_PUBLICATION.globallyUniqueReferenceCount
) {
  throw new Error('Sanitized retained-reference counts do not match the audited public selection');
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

const expectedCorrectionIds = userRecords.map((record) => record.messageId);
if (!jsonEqual(correctionsInput.map((correction) => correction?.message_id), expectedCorrectionIds)) {
  throw new Error('Correction manifest must contain exactly the published user messages in source order');
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
  const sourceRecord = sourceUsersById.get(correction.message_id);
  if (!sourceRecord) throw new Error(`Correction refers to an unpublished/non-user message: ${correction.message_id}`);
  if (!isHexHash(correction.original_sha256) || correction.original_sha256 !== sha256Hex(sourceRecord.text)) {
    throw new Error(`Correction original hash mismatch: ${correction.message_id}`);
  }
  if (correction.source_timestamp_kst !== sourceRecord.recordedAt) {
    throw new Error(`Correction source timestamp mismatch: ${correction.message_id}`);
  }
  if (typeof correction.corrected !== 'string' || !correction.corrected) {
    throw new Error(`Correction display text is empty: ${correction.message_id}`);
  }
  if (typeof correction.changed !== 'boolean' || correction.changed !== (correction.corrected !== sourceRecord.text)) {
    throw new Error(`Correction changed flag mismatch: ${correction.message_id}`);
  }
  const replayed = replayChanges(sourceRecord.text, correction);
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
    if (!jsonEqual(sourceRecord.text.match(pattern) ?? [], correction.corrected.match(pattern) ?? [])) {
      throw new Error(`Correction changed a protected ${label}: ${correction.message_id}`);
    }
  }
  corrections.set(correction.message_id, correction);
}
if (corrections.size !== EXPECTED_PUBLICATION.userCount) {
  throw new Error(`Expected corrections for exactly ${EXPECTED_PUBLICATION.userCount} published user messages`);
}

function publicMessage(record) {
  const base = {
    id: `message-${record.messageId}`,
    role: record.role,
    sourceKind: record.sourceKind,
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
    channel: record.channel ?? 'unknown',
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
  if (!messages.some((message) => message.role === 'user') || !messages.some((message) => message.role === 'assistant')) {
    throw new Error(`Daily medical-knowledge post does not contain a complete visible exchange: ${date}`);
  }
  posts.push({
    schemaVersion: 2,
    recordId: `medical-${date}-conversation`,
    board: 'medical',
    entryType: 'medical-knowledge',
    title: `2026년 ${month}월 ${day}일 의학지식 문의`,
    status: published ? 'published' : 'draft',
    sensitivity: 'highly-sensitive',
    recordedAt: stamp(date, 'day'),
    tags: ['의학 지식', '원문 질의응답', '날짜별 기록'],
    sources: [source],
    messages,
    amendments: [],
    media: [],
    related: [],
    privacyReviewed: publishReviewed,
  });
}
if (
  posts.length !== EXPECTED_PUBLICATION.dailyPostCount ||
  !jsonEqual(
    posts.map((post) => post.recordedAt.start),
    EXPECTED_PUBLICATION.dates,
  ) ||
  posts[0]?.recordedAt.start !== EXPECTED_PUBLICATION.firstRecordedAt.slice(0, 10) ||
  posts.at(-1)?.recordedAt.start !== EXPECTED_PUBLICATION.throughDate
) {
  throw new Error('Daily medical-post grouping does not match the reviewed date range');
}

const correctedUserCount = posts.reduce(
  (sum, post) => sum + post.messages.filter((message) => message.role === 'user' && message.corrected).length,
  0,
);
const sourceKindCounts = Object.fromEntries(
  Object.values(sourceKindMap).map((kind) => [kind, normalized.filter((record) => record.sourceKind === kind).length]),
);
const publishedJson = posts.map((post) => JSON.stringify(post)).join('\n');
const ledgerPath = resolve('src/data/import-ledger.json');
const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
const importId = 'medical-shared-conversation-2026-09-01';
const previousImport = (ledger.imports ?? []).find((entry) => entry.id === importId);
if (previousImport && !replaceExisting) {
  throw new Error(`Import ledger already contains ${importId}; rerun with --replace=true only after explicit review`);
}

ledger.schemaVersion = 2;
ledger.lastUpdated = verifiedAt.slice(0, 10);
ledger.boards ??= {};
ledger.boards.medical = {
  status: published
    ? `published-through-${EXPECTED_PUBLICATION.throughDate}`
    : `draft-through-${EXPECTED_PUBLICATION.throughDate}`,
  sourceThreads: [EXPECTED_SOURCE.title],
  publicationRule: 'complete-public-source-messages-only',
  sourceRequirement: 'confirmed-chatgpt-shared-conversation-snapshot-with-complete-audit',
};
ledger.imports = (ledger.imports ?? []).filter((entry) => entry.id !== importId);
ledger.imports.push({
  id: importId,
  board: 'medical',
  verifiedAt,
  publication: {
    status: published ? 'published' : 'draft',
    privacyReviewed: publishReviewed,
    publicPreviewAuthorizedByUser: publicPreviewAuthorized,
  },
  source: {
    sourceId: source.id,
    title: EXPECTED_SOURCE.title,
    rawSnapshotSha256: rawFile.hash,
    rawSnapshotBytes: rawFile.bytes,
    visibleRecordsFileSha256: visibleFile.hash,
    allUserAssistantRecordsFileSha256: allFile.hash,
    allMessageRecordsFileSha256: allMessagesFile.hash,
    extractionManifestFileSha256: manifestFile.hash,
    completeChronologyFileSha256: completeFile.hash,
    completeAuditManifestFileSha256: completeAuditFile.hash,
    correctionsFileSha256: correctionsFile.hash,
    visibleMessageCount: visible.length,
    allUserAssistantRecordCount: allUserAssistant.length,
    allMessageRecordCount: allMessages.length,
    completePublicMessageCount: complete.length,
    visibleSequenceSha256: calculatedVisibleSequenceHash,
    completeSequenceSha256: completeSequenceHash,
    embeddedReportSequenceSha256: embeddedSequenceHash,
    currentNode: manifest.current_node,
  },
  selection: {
    publishedMessageCount: normalized.length,
    publishedUserMessageCount: userRecords.length,
    publishedAssistantMessageCount: assistantRecords.length,
    publishedAssistantCommentaryCount: EXPECTED_PUBLICATION.commentaryCount,
    publishedAssistantFinalCount: EXPECTED_PUBLICATION.finalCount,
    publishedAssistantUnknownChannelCount: EXPECTED_PUBLICATION.unknownChannelCount,
    sourceKindCounts,
    correctedUserMessageCount: correctedUserCount,
    retainedReferenceLinkCount: allReferenceUrls.length,
    globallyUniqueReferenceLinkCount: new Set(allReferenceUrls).size,
    referenceUrlPolicy: 'session-identifiers-and-tracking-query-parameters-removed',
    dailyPostCount: posts.length,
    firstRecordedAt: EXPECTED_PUBLICATION.firstRecordedAt,
    lastRecordedAt: EXPECTED_PUBLICATION.lastRecordedAt,
    publishedContentSha256: sha256Hex(publishedJson),
  },
  withheld: WITHHELD.map((expected) => {
    const record = complete[expected.sourceOrdinal - 1];
    return {
      sourceMessageId: expected.messageId,
      sourceOrdinal: expected.sourceOrdinal,
      role: expected.role,
      ...(expected.channel ? { channel: expected.channel } : {}),
      recordedAt: expected.recordedAt,
      sourceTextSha256: `sha256:${expected.textSha256}`,
      sourceRecordSha256: sha256(JSON.stringify(record)),
      reason: 'complete-document-email-turn-contains-personal-email-and-temporary-artifact-links',
      publicationStatus: 'withheld-without-text',
    };
  }),
  excludedSourceRecords: hiddenOrRedacted.map((record) => ({
    sourceMessageId: record.message_id,
    role: record.role,
    recordedAt: record.create_time_kst,
    contentType: record.content_type,
    sourceTextSha256: `sha256:${record.text_sha256}`,
    sourceRecordSha256: sha256(JSON.stringify(record)),
    visibility: {
      visuallyHidden: record.message?.metadata?.is_visually_hidden_from_conversation === true,
      redacted: record.message?.metadata?.is_redacted === true,
    },
    reason: 'source-record-is-visually-hidden-or-redacted',
    publicationStatus: 'excluded-without-text',
  })),
  posts: posts.map((post) => post.recordId),
});

const serializedPosts = posts.map((post) => `${JSON.stringify(post, null, 2)}\n`);
const serializedLedger = `${JSON.stringify(ledger, null, 2)}\n`;
const committedPayload = `${serializedPosts.join('')}\n${serializedLedger}`;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
if (
  /chatgpt\.com\/share\//i.test(committedPayload) ||
  committedPayload.includes(manifest.share_id) ||
  emailPattern.test(committedPayload) ||
  /sandbox:\//i.test(committedPayload) ||
  /(?:^|[/:.])oaiusercontent\.com(?:[/:]|$)/im.test(committedPayload)
) {
  throw new Error('Refusing to install a payload containing a share locator, email, or temporary artifact URL');
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

const outputDirectory = resolve('src/content/posts/medical');
if (await exists(outputDirectory)) {
  const existing = (await readdir(outputDirectory)).sort();
  if (!replaceExisting) {
    throw new Error(
      `Refusing to overwrite the medical post directory${existing.length ? ` (${existing.join(', ')})` : ''}; use --replace=true only after explicit review`,
    );
  }
  if (!previousImport || !Array.isArray(previousImport.posts)) {
    throw new Error('Replace mode requires a prior ledger-managed medical import');
  }
  const managedByFile = new Map(
    previousImport.posts.map((recordId) => {
      const match = /^medical-(\d{4}-\d{2}-\d{2})-conversation$/.exec(recordId);
      if (!match) throw new Error(`Prior medical import contains an invalid record id: ${recordId}`);
      return [`${match[1]}.json`, recordId];
    }),
  );
  if (managedByFile.size !== previousImport.posts.length) {
    throw new Error('Prior medical import repeats a managed post id');
  }
  const managedFiles = [...managedByFile.keys()].sort();
  if (!jsonEqual(existing, managedFiles)) {
    throw new Error('Replace mode refused: the medical directory contains files not owned by the prior import');
  }
  const currentManagedPosts = [];
  for (const name of existing) {
    const current = JSON.parse(await readFile(join(outputDirectory, name), 'utf8'));
    if (current.recordId !== managedByFile.get(name) || current.board !== 'medical') {
      throw new Error(`Replace mode refused: existing post identity differs from the prior ledger (${name})`);
    }
    currentManagedPosts.push(current);
  }
  const currentManagedHash = sha256Hex(currentManagedPosts.map((post) => JSON.stringify(post)).join('\n'));
  if (
    !isHexHash(previousImport.selection?.publishedContentSha256) ||
    currentManagedHash !== previousImport.selection.publishedContentSha256
  ) {
    throw new Error('Replace mode refused: a previously imported medical post was edited after publication');
  }
}

const transactionId = `${process.pid}-${randomUUID()}`;
const stageDirectory = join(dirname(outputDirectory), `.medical-import-${transactionId}`);
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
      assistantCommentary: EXPECTED_PUBLICATION.commentaryCount,
      assistantFinal: EXPECTED_PUBLICATION.finalCount,
      assistantUnknownChannel: EXPECTED_PUBLICATION.unknownChannelCount,
      correctedUsers: correctedUserCount,
      referenceLinks: allReferenceUrls.length,
      uniqueReferenceLinks: new Set(allReferenceUrls).size,
      withheldSensitiveTurnMessages: WITHHELD.length,
      excludedHiddenOrRedactedRecords: hiddenOrRedacted.length,
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
