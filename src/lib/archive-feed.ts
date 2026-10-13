import { findSearchMatches, indexSearchText, openSearchAncestors, searchSnippet, SearchHighlights } from './search-highlight.ts';
import type { SearchMatch } from './search-highlight.ts';

export function initializeArchiveFeed(feed: HTMLElement) {
  const document = feed.ownerDocument;
  const list = feed.querySelector<HTMLElement>('[data-feed-list]')!;
  const cards = Array.from(feed.querySelectorAll<HTMLElement>('[data-post-card]'));
  const search = feed.querySelector<HTMLInputElement>('[data-feed-search]')!;
  const month = feed.querySelector<HTMLSelectElement>('[data-month-filter]')!;
  const hospital = feed.querySelector<HTMLSelectElement>('[data-hospital-filter]');
  const phase = feed.querySelector<HTMLSelectElement>('[data-rehab-phase-filter]');
  const sortButtons = Array.from(feed.querySelectorAll<HTMLButtonElement>('[data-sort]'));
  const loadMore = feed.querySelector<HTMLButtonElement>('[data-load-more]')!;
  const empty = feed.querySelector<HTMLElement>('[data-feed-empty]')!;
  const resultStatus = feed.querySelector<HTMLElement>('[data-result-status]')!;
  const resultsPanel = feed.querySelector<HTMLElement>('[data-search-results]')!;
  const resultsList = feed.querySelector<HTMLOListElement>('[data-search-result-list]')!;
  const resultsCount = feed.querySelector<HTMLElement>('[data-search-count]')!;
  const resultsMore = feed.querySelector<HTMLButtonElement>('[data-results-more]')!;
  const index = new Map(cards.map(card => [card, {
    ...indexSearchText(card), title: card.querySelector('.card-title')?.textContent?.trim() ?? '기록',
  }]));
  const highlights = new SearchHighlights();
  const matches = new Map<HTMLElement, SearchMatch[]>();
  const batchSize = 8, resultsBatchSize = 20;
  let visibleCount = batchSize, resultsVisible = resultsBatchSize, direction = 'desc', query = '';
  let composing = false, searchTimer: ReturnType<typeof setTimeout> | undefined;
  let hits: { card: HTMLElement; match: SearchMatch; ordinal: number }[] = [];

  function filteredCards() {
    return cards.filter(card =>
      (!query || (matches.get(card)?.length ?? 0) > 0)
      && (month.value === 'all' || card.dataset.month === month.value)
      && (!hospital || hospital.value === 'all' || (card.dataset.hospitals ?? '').split(' ').includes(hospital.value))
      && (!phase || phase.value === 'all' || (card.dataset.rehabPhases ?? '').split(' ').includes(phase.value)),
    ).sort((a, b) => {
      const order = (a.dataset.recordedAt ?? '').localeCompare(b.dataset.recordedAt ?? '');
      return direction === 'desc' ? -order : order;
    });
  }

  function renderFeed() {
    const filtered = filteredCards();
    const shown = new Set(filtered.slice(0, visibleCount));
    cards.forEach(card => { card.hidden = !shown.has(card); });
    filtered.forEach(card => list.append(card));
    // Only the visible batch needs DOM wrappers; the complete index stays searchable.
    highlights.retain(shown);
    shown.forEach(card => highlights.apply(card, query));
    empty.hidden = filtered.length !== 0;
    loadMore.hidden = filtered.length <= visibleCount;
    if (loadMore.firstChild) loadMore.firstChild.textContent = direction === 'desc' ? ' 이전 기록 더 보기 ' : ' 다음 기록 더 보기 ';
    resultStatus.textContent = filtered.length
      ? `${filtered.length}개 중 ${Math.min(visibleCount, filtered.length)}개 기록 표시`
      : '표시할 기록 없음';
    return filtered;
  }

  function jumpToHit(hit: typeof hits[number]) {
    const filtered = filteredCards();
    const cardIndex = filtered.indexOf(hit.card);
    if (cardIndex < 0) return;
    visibleCount = Math.max(visibleCount, cardIndex + 1);
    renderFeed();
    const target = highlights.apply(hit.card, query).get(hit.ordinal);
    if (!target) return;
    openSearchAncestors(target, hit.card);
    feed.querySelectorAll('[data-search-current]').forEach(mark => mark.removeAttribute('data-search-current'));
    target.dataset.searchCurrent = 'true';
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function renderResults() {
    resultsPanel.hidden = !query;
    resultsList.replaceChildren();
    resultsCount.textContent = `${hits.length}곳 · ${filteredCards().length}개 기록`;
    resultsMore.hidden = hits.length <= resultsVisible;
    if (!query) return;
    const fragment = document.createDocumentFragment();
    hits.slice(0, resultsVisible).forEach(hit => {
      const entry = index.get(hit.card)!;
      const label = entry.segments.find(segment => segment.end > hit.match.start)?.label ?? '기록';
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-result-link';
      const meta = document.createElement('span');
      meta.className = 'search-result-meta';
      meta.textContent = `${entry.title} · ${label}`;
      const snippet = document.createElement('span');
      snippet.className = 'search-result-snippet';
      snippet.append(searchSnippet(document, entry.text, hit.match));
      button.append(meta, snippet);
      button.addEventListener('click', () => jumpToHit(hit));
      item.append(button);
      fragment.append(item);
    });
    resultsList.append(fragment);
  }

  function resetAndRender() {
    clearTimeout(searchTimer);
    const nextQuery = search.value.trim();
    if (query !== nextQuery) {
      query = nextQuery;
      matches.clear();
      if (query) cards.forEach(card => matches.set(card, findSearchMatches(index.get(card)!.text, query)));
    }
    visibleCount = batchSize;
    resultsVisible = resultsBatchSize;
    const filtered = renderFeed();
    hits = query ? filtered.flatMap(card => (matches.get(card) ?? []).map((match, ordinal) => ({ card, match, ordinal }))) : [];
    renderResults();
    if (hospital && phase) {
      const url = new URL(window.location.href);
      for (const [control, key] of [[hospital, 'hospital'], [phase, 'phase']] as const) {
        if (control.value === 'all') url.searchParams.delete(key);
        else url.searchParams.set(key, control.value);
      }
      window.history.replaceState(null, '', url);
    }
  }

  function scheduleSearch() {
    clearTimeout(searchTimer);
    if (!composing) searchTimer = setTimeout(resetAndRender, 150);
  }
  search.addEventListener('compositionstart', () => { composing = true; clearTimeout(searchTimer); });
  search.addEventListener('compositionend', () => { composing = false; scheduleSearch(); });
  search.addEventListener('input', scheduleSearch);
  month.addEventListener('change', resetAndRender);
  hospital?.addEventListener('change', resetAndRender);
  phase?.addEventListener('change', resetAndRender);
  feed.querySelector('[data-feed-reset]')?.addEventListener('click', () => {
    search.value = '';
    for (const select of [month, hospital, phase]) if (select) select.value = 'all';
    resetAndRender();
  });
  sortButtons.forEach(button => button.addEventListener('click', () => {
    direction = button.dataset.sort === 'asc' ? 'asc' : 'desc';
    sortButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    resetAndRender();
  }));
  loadMore.addEventListener('click', () => { visibleCount += batchSize; renderFeed(); });
  resultsMore.addEventListener('click', () => {
    const nextIndex = resultsVisible;
    resultsVisible += resultsBatchSize;
    renderResults();
    resultsList.children[nextIndex]?.querySelector('button')?.focus();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !loadMore.hidden) { visibleCount += batchSize; renderFeed(); }
    }, { rootMargin: '0px 0px 480px 0px' }).observe(loadMore);
  }

  const params = new URLSearchParams(window.location.search);
  for (const [control, key] of [[hospital, 'hospital'], [phase, 'phase']] as const) {
    const requested = params.get(key);
    if (control && requested && Array.from(control.options).some(option => option.value === requested)) control.value = requested;
  }
  let targetId = '';
  try { targetId = decodeURIComponent(window.location.hash.replace('#', '')); } catch { /* Ignore an invalid fragment. */ }
  resetAndRender();
  if (targetId) {
    const targetIndex = filteredCards().findIndex(card => card.id === targetId);
    if (targetIndex >= 0) { visibleCount = Math.max(visibleCount, targetIndex + 1); renderFeed(); }
    document.getElementById(targetId)?.scrollIntoView({ block: 'center' });
  }
}
