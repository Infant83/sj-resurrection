import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { findSearchMatches, matchesSearch, indexSearchText, searchSnippet, SearchHighlights } from '../src/lib/search-highlight.ts';
import { initializeArchiveFeed } from '../src/lib/archive-feed.ts';

const dom = html => parseHTML(`<html><body>${html}</body></html>`);
const waitForSearch = () => new Promise(resolve => setTimeout(resolve, 190));

test('literal Korean, English, sentences, emoji and regex characters have exact offsets', () => {
  assert.deepEqual(findSearchMatches('한양대 한양대', '한양대'), [{ start: 0, end: 3 }, { start: 4, end: 7 }]);
  assert.deepEqual(findSearchMatches('A+B [x] (.*) A+B', 'A+B'), [{ start: 0, end: 3 }, { start: 13, end: 16 }]);
  assert.equal(findSearchMatches('CRE cre Cre', 'cre').length, 3);
  assert.deepEqual(findSearchMatches('İ🙂기관절개', '기관절개'), [{ start: 3, end: 7 }]);
  assert.equal(matchesSearch('기관절개 이후 회복', '절개 이후'), true);
  assert.equal(matchesSearch('기관절개', '다른 내용'), false);
  assert.deepEqual(findSearchMatches('내용', '   '), []);
});

test('highlights cross inline formatting without changing content, links or listeners', () => {
  const { document } = dom('<article><p>기관<strong>절개</strong> 후 <a href="/care">기관절개</a></p></article>');
  const root = document.querySelector('article'), link = root.querySelector('a');
  let clicked = 0; link.addEventListener('click', () => clicked++);
  const before = root.innerHTML, text = root.textContent;
  const highlights = new SearchHighlights();
  const marks = highlights.apply(root, '기관절개');
  assert.equal(marks.size, 2);
  assert.equal(root.querySelectorAll('mark').length, 3);
  assert.equal(root.textContent, text);
  link.click(); assert.equal(clicked, 1); assert.equal(link.getAttribute('href'), '/care');
  highlights.apply(root, '기관절개'); assert.equal(root.querySelectorAll('mark').length, 3);
  highlights.clear(root); assert.equal(root.innerHTML, before);
});

test('search opens matching replies and originals, then preserves previously open details', () => {
  const { document } = dom('<article><details><summary>답변</summary><p>회복 기록</p><details><summary>원문</summary>회복 원문</details></details><details open><summary>답변</summary>회복 중</details></article>');
  const root = document.querySelector('article'), details = [...root.querySelectorAll('details')];
  const highlights = new SearchHighlights();
  highlights.apply(root, '회복'); assert(details.every(d => d.hasAttribute('open')));
  highlights.apply(root, '없는말'); assert.deepEqual(details.map(d => d.hasAttribute('open')), [false, false, true]);
  highlights.apply(root, '회복'); highlights.apply(root, '');
  assert.deepEqual(details.map(d => d.hasAttribute('open')), [false, false, true]);
  assert.equal(root.querySelectorAll('mark').length, 0);
});

test('queries and snippets are text only, and controls are excluded from the index', () => {
  const { document } = dom('<article><p>&lt;img src=x onerror=alert(1)&gt; &amp; [x]</p><script>privateScript</script><button>control</button><span aria-hidden="true">decorative</span></article>');
  const root = document.querySelector('article');
  const index = indexSearchText(root);
  assert.equal(index.text, '<img src=x onerror=alert(1)> & [x]');
  const match = findSearchMatches(index.text, '<img src=x onerror=alert(1)>')[0];
  const snippet = document.createElement('div'); snippet.append(searchSnippet(document, index.text, match));
  assert.equal(snippet.querySelector('img'), null);
  new SearchHighlights().apply(root, '[x]');
  assert.equal(root.querySelector('mark').textContent, '[x]');
  assert.equal(root.querySelector('img'), null);
});

test('changing queries restores exact text and never nests marks', () => {
  const { document } = dom('<article><p>한양대에서 회복하는 선진. 한양대 재활</p></article>');
  const root = document.querySelector('article'), before = root.innerHTML;
  const highlights = new SearchHighlights();
  for (const query of ['한', '한양', '한양대', '회복', '선진', '', '한양대']) {
    highlights.apply(root, query);
    assert.equal(root.querySelector('mark mark'), null);
  }
  highlights.retain(new Set()); assert.equal(root.innerHTML, before);
});

test('feed lists hits, paginates results, jumps beyond first batch, filters and clears', async () => {
  const cards = Array.from({ length: 12 }, (_, i) => `<article data-post-card data-recorded-at="2026-10-${String(12-i).padStart(2,'0')}" data-month="2026-10" data-hospitals="${i%2?'nrc':'hanyang'}" data-rehab-phases="inpatient"><h2 class="card-title">기록 ${i}</h2><section class="conversation-message user-message"><p>찾기 보호자 ${i}</p></section><section class="conversation-message assistant-message"><details><summary>답변</summary><p>찾기 답변 ${i}</p></details></section></article>`).join('');
  const { document, window } = dom(`<section data-archive-feed><input data-feed-search><select data-month-filter></select><select data-hospital-filter></select><select data-rehab-phase-filter></select><button data-feed-reset>초기화</button><button data-sort="desc"></button><button data-sort="asc"></button><p data-result-status></p><section data-search-results hidden><span data-search-count></span><ol data-search-result-list></ol><button data-results-more></button></section><div data-feed-list>${cards}</div><div data-feed-empty hidden></div><button data-load-more>이전 기록 더 보기</button></section>`);
  const previousWindow = globalThis.window;
  Object.defineProperty(window, 'location', { value: { href: 'https://example.org/board/', search: '', hash: '' }, configurable: true });
  Object.defineProperty(window, 'history', { value: { replaceState() {} }, configurable: true });
  window.matchMedia = () => ({ matches: true });
  let scrolled;
  window.HTMLElement.prototype.scrollIntoView = function () { scrolled = this; };
  globalThis.window = window;
  for (const select of document.querySelectorAll('select')) Object.defineProperty(select, 'value', { value: 'all', writable: true });
  try {
    const feed = document.querySelector('[data-archive-feed]');
    initializeArchiveFeed(feed);
    const search = feed.querySelector('input');
    search.dispatchEvent(new window.Event('compositionstart'));
    search.value = '찾'; search.dispatchEvent(new window.Event('input')); await waitForSearch();
    assert.equal(feed.querySelector('[data-search-results]').hidden, true);
    search.dispatchEvent(new window.Event('compositionend')); await waitForSearch();
    assert.equal(feed.querySelector('[data-search-results]').hidden, false);
    search.value = '찾기'; search.dispatchEvent(new window.Event('input')); await waitForSearch();
    assert.equal(feed.querySelector('[data-search-results]').hidden, false);
    assert.match(feed.querySelector('[data-search-count]').textContent, /24곳 · 12개/);
    assert.equal(feed.querySelectorAll('.search-result-link').length, 20);
    feed.querySelector('[data-results-more]').click();
    assert.equal(feed.querySelectorAll('.search-result-link').length, 24);
    assert.equal(feed.querySelector('[data-results-more]').hidden, true);
    feed.querySelectorAll('.search-result-link')[23].click();
    assert.equal(scrolled.textContent, '찾기');
    assert.equal(scrolled.closest('article').hidden, false);
    assert.equal(scrolled.closest('details').hasAttribute('open'), true);
    assert.equal(scrolled.hasAttribute('data-search-current'), true);
    assert.match(scrolled.closest('article').textContent, /답변 11/);
    feed.querySelector('[data-sort="asc"]').click();
    assert.match(feed.querySelector('.search-result-meta').textContent, /기록 11/);
    feed.querySelector('[data-sort="desc"]').click();
    assert.match(feed.querySelector('.search-result-meta').textContent, /기록 0/);
    const hospital = feed.querySelector('[data-hospital-filter]');
    hospital.value = 'hanyang'; hospital.dispatchEvent(new window.Event('change'));
    assert.match(feed.querySelector('[data-search-count]').textContent, /12곳 · 6개/);
    const month = feed.querySelector('[data-month-filter]');
    month.value = '2026-09'; month.dispatchEvent(new window.Event('change'));
    assert.equal(feed.querySelector('[data-feed-empty]').hidden, false);
    assert.equal(feed.querySelectorAll('.search-result-link').length, 0);
    feed.querySelector('[data-feed-reset]').click();
    assert.equal(search.value, '');
    assert.equal(feed.querySelector('[data-search-results]').hidden, true);
    assert.equal(feed.querySelectorAll('mark').length, 0);
    assert.equal(feed.querySelectorAll('details[open]').length, 0);
    assert.equal([...feed.querySelectorAll('article')].filter(c=>!c.hidden).length, 8);
  } finally { globalThis.window = previousWindow; }
});
