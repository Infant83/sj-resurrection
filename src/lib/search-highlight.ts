export interface SearchMatch { start: number; end: number }

function literalPattern(query: string, all = false) {
  const value = query.trim();
  return value ? new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), all ? 'giu' : 'iu') : null;
}

export function findSearchMatches(text: string, query: string): SearchMatch[] {
  const pattern = literalPattern(query, true);
  return pattern ? Array.from(text.matchAll(pattern), match => ({ start: match.index, end: match.index + match[0].length })) : [];
}

export function matchesSearch(text: string, query: string) {
  return literalPattern(query)?.test(text) ?? true;
}

const excluded = 'script, style, noscript, button, input, textarea, select, svg, [aria-hidden="true"], .sr-only, .reply-action, .permalink';

export function indexSearchText(root: HTMLElement) {
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* SHOW_TEXT */);
  const segments: { node: Text; start: number; end: number; label: string }[] = [];
  let text = '';
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.data || node.parentElement?.closest(excluded)) continue;
    const message = node.parentElement?.closest('.conversation-message');
    segments.push({ node, start: text.length, end: text.length + node.data.length,
      label: message?.classList.contains('assistant-message') ? 'GPT 답변' : message ? '보호자 기록' : '제목·기록 정보' });
    text += node.data;
  }
  return { text, segments };
}

// All rendering uses text nodes, never HTML made from the user's query.
export function searchSnippet(document: Document, text: string, match: SearchMatch) {
  const fragment = document.createDocumentFragment();
  const start = Math.max(0, match.start - 42), end = Math.min(text.length, match.end + 68);
  fragment.append(document.createTextNode((start ? '…' : '') + text.slice(start, match.start)));
  const mark = document.createElement('mark');
  mark.className = 'search-highlight';
  mark.textContent = text.slice(match.start, match.end);
  fragment.append(mark, document.createTextNode(text.slice(match.end, end) + (end < text.length ? '…' : '')));
  return fragment;
}

export function openSearchAncestors(element: HTMLElement, root: HTMLElement) {
  const opened: HTMLDetailsElement[] = [];
  let detail = element.closest('details');
  while (detail && root.contains(detail)) {
    if (!detail.hasAttribute('open')) { detail.setAttribute('open', ''); opened.push(detail); }
    detail = detail.parentElement?.closest('details') ?? null;
  }
  return opened;
}

export class SearchHighlights {
  private states = new Map<HTMLElement, { query: string; marks: HTMLElement[]; firstMarks: Map<number, HTMLElement>; opened: HTMLDetailsElement[] }>();

  clear(root: HTMLElement) {
    const state = this.states.get(root);
    if (!state) return;
    const parents = new Set<Node>();
    for (const mark of state.marks) {
      if (mark.parentNode) parents.add(mark.parentNode);
      mark.replaceWith(root.ownerDocument.createTextNode(mark.textContent ?? ''));
    }
    parents.forEach(parent => parent.normalize());
    state.opened.forEach(detail => { detail.removeAttribute('open'); });
    this.states.delete(root);
  }

  retain(roots: Set<HTMLElement>) {
    for (const root of this.states.keys()) if (!roots.has(root)) this.clear(root);
  }

  apply(root: HTMLElement, query: string) {
    query = query.trim();
    const existing = this.states.get(root);
    if (existing?.query === query) return existing.firstMarks;
    this.clear(root);
    const firstMarks = new Map<number, HTMLElement>();
    if (!query) return firstMarks;
    const { text, segments } = indexSearchText(root);
    const matches = findSearchMatches(text, query);
    const state = { query, marks: [] as HTMLElement[], firstMarks, opened: [] as HTMLDetailsElement[] };
    let cursor = 0;
    for (const segment of segments) {
      while (cursor < matches.length && matches[cursor].end <= segment.start) cursor++;
      if (!matches[cursor] || matches[cursor].start >= segment.end) continue;
      const fragment = root.ownerDocument.createDocumentFragment();
      let position = 0;
      for (let i = cursor; i < matches.length && matches[i].start < segment.end; i++) {
        const start = Math.max(matches[i].start, segment.start) - segment.start;
        const end = Math.min(matches[i].end, segment.end) - segment.start;
        fragment.append(root.ownerDocument.createTextNode(segment.node.data.slice(position, start)));
        const mark = root.ownerDocument.createElement('mark');
        mark.className = 'search-highlight';
        mark.dataset.searchHit = String(i);
        mark.tabIndex = -1;
        mark.textContent = segment.node.data.slice(start, end);
        fragment.append(mark);
        state.marks.push(mark);
        if (!firstMarks.has(i)) firstMarks.set(i, mark);
        position = end;
      }
      fragment.append(root.ownerDocument.createTextNode(segment.node.data.slice(position)));
      segment.node.replaceWith(fragment);
    }
    for (const mark of state.marks) state.opened.push(...openSearchAncestors(mark, root));
    this.states.set(root, state);
    return firstMarks;
  }
}
