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
    const exchangeIds = new Set<string>();
    for (const exchange of post.data.exchanges) {
      if (exchangeIds.has(exchange.id)) {
        throw new Error(`Duplicate exchange id in ${post.data.recordId}: ${exchange.id}`);
      }
      exchangeIds.add(exchange.id);
      for (const sourceRef of exchange.sourceRefs) {
        if (!sourceIds.has(sourceRef)) {
          throw new Error(`Unknown source ref in ${post.data.recordId}: ${sourceRef}`);
        }
      }

      const corrected = exchange.user.corrected;
      if (corrected !== undefined) {
        if (!corrected.trim()) {
          throw new Error(`Corrected user text is empty: ${post.data.recordId}/${exchange.id}`);
        }
        if (exchange.user.correctionPolicy !== 'typos-only' || exchange.user.fidelity !== 'typo-corrected') {
          throw new Error(`Corrected user text is not marked typos-only: ${post.data.recordId}/${exchange.id}`);
        }
      } else if (exchange.user.correctionPolicy || exchange.user.fidelity === 'typo-corrected') {
        throw new Error(`Correction metadata has no corrected text: ${post.data.recordId}/${exchange.id}`);
      }

      if (post.data.status === 'published') {
        const confirmedConversationSource = exchange.sourceRefs.some((sourceRef) => {
          const source = sourceById.get(sourceRef);
          return source?.type === 'chat-conversation' && source.certainty === 'confirmed';
        });

        if (!exchange.sourceVerified || !exchange.sourceVerifiedAt) {
          throw new Error(`Exchange completeness was not source-verified: ${post.data.recordId}/${exchange.id}`);
        }
        if (!confirmedConversationSource) {
          throw new Error(`Published exchange has no confirmed conversation source: ${post.data.recordId}/${exchange.id}`);
        }
        if (!['exact', 'typo-corrected'].includes(exchange.user.fidelity)) {
          throw new Error(`User original is not verified: ${post.data.recordId}/${exchange.id}`);
        }
        if (!exchange.user.original.trim() || !exchange.user.sourceMessageId || !exchange.user.originalSha256) {
          throw new Error(`User source identity is incomplete: ${post.data.recordId}/${exchange.id}`);
        }
        if (exchange.user.originalSha256 !== sha256(exchange.user.original)) {
          throw new Error(`User original hash mismatch: ${post.data.recordId}/${exchange.id}`);
        }
        if (!exchange.assistant || exchange.assistant.fidelity !== 'exact') {
          throw new Error(`GPT reply is not verified: ${post.data.recordId}/${exchange.id}`);
        }
        if (!exchange.assistant.text.trim() || !exchange.assistant.sourceMessageId || !exchange.assistant.textSha256) {
          throw new Error(`GPT source identity is incomplete: ${post.data.recordId}/${exchange.id}`);
        }
        if (exchange.assistant.textSha256 !== sha256(exchange.assistant.text)) {
          throw new Error(`GPT reply hash mismatch: ${post.data.recordId}/${exchange.id}`);
        }
      }
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

  return formatKoreanDateValue(start, precision === 'minute' || precision === 'hour', precision === 'minute');
}

function formatKoreanDateValue(value: string, includeHour = false, includeMinute = false) {
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
    options.hour12 = false;
  }
  return new Intl.DateTimeFormat('ko-KR', options).format(parsed);
}

export function monthKey(stamp: ArchiveStamp) {
  const match = stampSortKey(stamp).match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : 'unknown';
}

export function searchableText(post: ArchivePost) {
  const exchanges = post.data.exchanges
    .flatMap((exchange) => [
      exchange.user.original,
      exchange.user.corrected ?? '',
      exchange.assistant?.text ?? '',
    ])
    .join(' ');
  return [post.data.title, post.data.tags.join(' '), exchanges]
    .join(' ')
    .toLocaleLowerCase('ko-KR');
}

export function withBase(path = '') {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\//, '')}`;
}
