import type { CollectionEntry } from 'astro:content';

export type ArchivePost = CollectionEntry<'posts'>;

export function assertArchiveIntegrity(posts: ArchivePost[]) {
  const recordIds = new Set<string>();

  for (const post of posts) {
    if (recordIds.has(post.data.recordId)) {
      throw new Error(`Duplicate recordId: ${post.data.recordId}`);
    }
    recordIds.add(post.data.recordId);

    if (post.data.status === 'published' && !post.data.privacyReviewed) {
      throw new Error(`Published post has not passed privacy review: ${post.data.recordId}`);
    }

    const sourceIds = new Set(post.data.sources.map((source) => source.id));
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
      if (
        post.data.status === 'published' &&
        [exchange.user.fidelity, exchange.assistant?.fidelity].some(
          (fidelity) => fidelity === 'summary-reconstruction' || fidelity === 'pending-original',
        )
      ) {
        throw new Error(`Unverified exchange cannot be published: ${post.data.recordId}/${exchange.id}`);
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
    const eventCompare = a.data.eventAt.start.localeCompare(b.data.eventAt.start);
    if (eventCompare !== 0) return eventCompare * factor;
    return a.data.recordedAt.start.localeCompare(b.data.recordedAt.start) * factor;
  });
}

export function formatKoreanStamp(stamp: ArchivePost['data']['eventAt']) {
  const { start, precision } = stamp;
  if (precision === 'unknown') return '시점 미상';

  const dateOnly = start.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return `${Number(dateOnly[1])}년 ${Number(dateOnly[2])}월 ${Number(dateOnly[3])}일`;
  }

  const parsed = new Date(start);
  if (Number.isNaN(parsed.getTime())) return start;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  if (precision === 'minute' || precision === 'hour') {
    options.hour = '2-digit';
    if (precision === 'minute') options.minute = '2-digit';
    options.hour12 = false;
  }
  return new Intl.DateTimeFormat('ko-KR', options).format(parsed);
}

export function monthKey(stamp: ArchivePost['data']['eventAt']) {
  const match = stamp.start.match(/^(\d{4})-(\d{2})/);
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
  return [post.data.title, post.data.summary, post.data.tags.join(' '), exchanges]
    .join(' ')
    .toLocaleLowerCase('ko-KR');
}

export function withBase(path = '') {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\//, '')}`;
}
