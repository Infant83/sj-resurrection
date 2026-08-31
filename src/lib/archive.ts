import type { CollectionEntry } from 'astro:content';
import { createHash } from 'node:crypto';

export type ArchivePost = CollectionEntry<'posts'>;
type ArchiveStamp = ArchivePost['data']['recordedAt'];

function stampSortKey(stamp: ArchiveStamp) {
  return stamp.end ?? stamp.start;
}

function sha256(value: string) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

export function isPublicPost(data: ArchivePost['data']) {
  return data.privacyReviewed && data.status === 'published';
}

export function assertArchiveIntegrity(posts: ArchivePost[]) {
  const recordIds = new Set<string>();
  const messageIds = new Set<string>();
  const sourceMessageIds = new Set<string>();
  const sourceOrdinals = new Set<string>();

  for (const post of posts) {
    if (recordIds.has(post.data.recordId)) {
      throw new Error(`Duplicate recordId: ${post.data.recordId}`);
    }
    recordIds.add(post.data.recordId);

    if (post.data.status !== 'draft' && !post.data.privacyReviewed) {
      throw new Error(`Visible post has not passed privacy review: ${post.data.recordId}`);
    }

    const sourceIds = new Set(post.data.sources.map((source) => source.id));
    const sourceById = new Map(post.data.sources.map((source) => [source.id, source]));
    let previousMessageTime = '';
    let userMessageCount = 0;
    let assistantMessageCount = 0;
    for (const message of post.data.messages) {
      if (messageIds.has(message.id)) {
        throw new Error(`Duplicate archive message id: ${message.id}`);
      }
      messageIds.add(message.id);
      for (const sourceRef of message.sourceRefs) {
        if (!sourceIds.has(sourceRef)) {
          throw new Error(`Unknown source ref in ${post.data.recordId}: ${sourceRef}`);
        }
      }

      if (previousMessageTime && message.recordedAt.start.localeCompare(previousMessageTime) < 0) {
        throw new Error(`Messages are not chronological: ${post.data.recordId}/${message.id}`);
      }
      previousMessageTime = message.recordedAt.start;

      if (message.role === 'user') {
        userMessageCount += 1;
        const corrected = message.corrected;
        if (corrected !== undefined) {
          if (!corrected.trim()) {
            throw new Error(`Corrected user text is empty: ${post.data.recordId}/${message.id}`);
          }
          if (message.correctionPolicy !== 'typos-only' || message.fidelity !== 'typo-corrected') {
            throw new Error(`Corrected user text is not marked typos-only: ${post.data.recordId}/${message.id}`);
          }
        } else if (message.correctionPolicy || message.fidelity === 'typo-corrected') {
          throw new Error(`Correction metadata has no corrected text: ${post.data.recordId}/${message.id}`);
        }
      } else {
        assistantMessageCount += 1;
        const referenceUrls = new Set<string>();
        for (const reference of message.references) {
          if (referenceUrls.has(reference.url)) {
            throw new Error(`Duplicate reply reference: ${post.data.recordId}/${message.id}/${reference.url}`);
          }
          referenceUrls.add(reference.url);
        }
      }

      if (post.data.status === 'published') {
        const confirmedConversationSource = message.sourceRefs.some((sourceRef) => {
          const source = sourceById.get(sourceRef);
          return source?.type === 'chat-conversation' && source.certainty === 'confirmed';
        });

        if (!message.sourceVerified || !message.sourceVerifiedAt) {
          throw new Error(`Message completeness was not source-verified: ${post.data.recordId}/${message.id}`);
        }
        if (!confirmedConversationSource) {
          throw new Error(`Published message has no confirmed conversation source: ${post.data.recordId}/${message.id}`);
        }
        if (!message.sourceMessageId || !message.sourceOrdinal) {
          throw new Error(`Published message has no source identity: ${post.data.recordId}/${message.id}`);
        }
        if (message.sourceRefs.length !== 1) {
          throw new Error(`Published message must have exactly one canonical source: ${post.data.recordId}/${message.id}`);
        }
        if (sourceMessageIds.has(message.sourceMessageId)) {
          throw new Error(`Duplicate source message id: ${message.sourceMessageId}`);
        }
        sourceMessageIds.add(message.sourceMessageId);
        const sourceOrdinalKey = `${message.sourceRefs[0]}:${message.sourceOrdinal}`;
        if (sourceOrdinals.has(sourceOrdinalKey)) {
          throw new Error(`Duplicate source ordinal: ${sourceOrdinalKey}`);
        }
        sourceOrdinals.add(sourceOrdinalKey);

        if (message.role === 'user') {
          if (!['exact', 'typo-corrected'].includes(message.fidelity)) {
            throw new Error(`User original is not verified: ${post.data.recordId}/${message.id}`);
          }
          if (!message.original.trim() || !message.originalSha256) {
            throw new Error(`User source identity is incomplete: ${post.data.recordId}/${message.id}`);
          }
          if (message.originalSha256 !== sha256(message.original)) {
            throw new Error(`User original hash mismatch: ${post.data.recordId}/${message.id}`);
          }
        } else {
          if (!message.text.trim() || !message.textSha256 || message.fidelity !== 'exact') {
            throw new Error(`GPT source identity is incomplete: ${post.data.recordId}/${message.id}`);
          }
          if (message.textSha256 !== sha256(message.text)) {
            throw new Error(`GPT reply hash mismatch: ${post.data.recordId}/${message.id}`);
          }
        }
      }
    }

    if (post.data.status === 'published' && (!userMessageCount || !assistantMessageCount)) {
      throw new Error(`Published post must contain both user and GPT messages: ${post.data.recordId}`);
    }

    for (const amendment of post.data.amendments) {
      for (const sourceRef of amendment.sourceRefs) {
        if (!sourceIds.has(sourceRef)) {
          throw new Error(`Unknown amendment source ref in ${post.data.recordId}: ${sourceRef}`);
        }
      }
    }
  }
}

export function sortPosts(posts: ArchivePost[], direction: 'asc' | 'desc' = 'desc') {
  const factor = direction === 'desc' ? -1 : 1;
  return [...posts].sort((a, b) => {
    const recordedCompare = stampSortKey(a.data.recordedAt).localeCompare(stampSortKey(b.data.recordedAt));
    if (recordedCompare !== 0) return recordedCompare * factor;
    return a.data.recordId.localeCompare(b.data.recordId) * factor;
  });
}

export function formatKoreanStamp(stamp: ArchiveStamp) {
  const { start, precision } = stamp;
  if (precision === 'unknown') return '시점 미상';

  if (precision === 'range' && stamp.end) {
    return `${formatKoreanDateValue(start)}–${formatKoreanDateValue(stamp.end)}`;
  }

  return formatKoreanDateValue(
    start,
    precision === 'second' || precision === 'minute' || precision === 'hour',
    precision === 'second' || precision === 'minute',
    precision === 'second',
  );
}

function formatKoreanDateValue(
  value: string,
  includeHour = false,
  includeMinute = false,
  includeSecond = false,
) {
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return `${Number(dateOnly[1])}년 ${Number(dateOnly[2])}월 ${Number(dateOnly[3])}일`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  if (includeHour) {
    options.hour = '2-digit';
    if (includeMinute) options.minute = '2-digit';
    if (includeSecond) options.second = '2-digit';
    options.hour12 = false;
  }
  return new Intl.DateTimeFormat('ko-KR', options).format(parsed);
}

export function monthKey(stamp: ArchiveStamp) {
  const match = stampSortKey(stamp).match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : 'unknown';
}

export function searchableText(post: ArchivePost) {
  const messages = post.data.messages
    .flatMap((message) =>
      message.role === 'user'
        ? [message.original, message.corrected ?? '']
        : [message.text, message.references.map((reference) => reference.title).join(' ')],
    )
    .join(' ');
  return [post.data.title, post.data.tags.join(' '), messages]
    .join(' ')
    .toLocaleLowerCase('ko-KR');
}

export function withBase(path = '') {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\//, '')}`;
}
