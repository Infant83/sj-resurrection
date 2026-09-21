import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function safePlainTextToHtml(value: string) {
  const escaped = escapeHtml(value);
  const linkifyUrls = (text: string) =>
    text.replace(URL_PATTERN, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${url}</a>`;
    });
  let output = '';
  let cursor = 0;
  for (const match of escaped.matchAll(MARKDOWN_LINK_PATTERN)) {
    output += linkifyUrls(escaped.slice(cursor, match.index));
    output += `<a href="${match[2]}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${match[1]}</a>`;
    cursor = (match.index ?? 0) + match[0].length;
  }
  output += linkifyUrls(escaped.slice(cursor));
  return output.replaceAll('\n', '<br />');
}

export function safeMarkdownToHtml(value: string, citationMarkers?: { marker: string; urls: string[] }[]) {
  // Keep the archived source unchanged; resolve only its presentation markup.
  const escapeMarkdownLabel = (label: string) => label.replace(/[\\`*_\[\]{}()#+.!|<>]/g, '\\$&');
  if (citationMarkers) {
    const urls = [...new Set(citationMarkers.flatMap((item) => item.urls))];
    for (const item of citationMarkers) {
      if (item.marker.startsWith('\uE200url\uE202')) {
        const label = escapeMarkdownLabel(item.marker.split('\uE202')[1] ?? '참고 링크');
        const url = item.urls.find((url) => /^https?:\/\//i.test(url));
        value = value.replaceAll(item.marker, url ? `[${label}](<${url}>)` : `${label} (당시 출처 연결 미확인)`);
        continue;
      }
      const links = item.urls.filter((url) => /^https?:\/\//i.test(url)).map((url) => `[출처 ${urls.indexOf(url) + 1}](<${url}>)`);
      value = value.replaceAll(item.marker, links.length ? `(${links.join(', ')})` : item.marker.includes('memcite') ? '(이전 대화 참조 · 연결 미확인)' : '(당시 출처 연결 미확인)');
    }
  }
  // Shared conversations include map cards and interface-only controls.
  // Preserve place names, while omitting those controls from the reading view.
  value = value.replace(/\uE200entity\uE202([^\uE201]*)\uE201/g, (_marker, payload) => {
    try {
      const entity = JSON.parse(payload);
      return Array.isArray(entity) && typeof entity[1] === 'string'
        ? escapeMarkdownLabel(entity[1])
        : '(당시 장소 표시 확인 불가)';
    } catch {
      return '(당시 장소 표시 확인 불가)';
    }
  });
  value = value.replace(/\uE200(?:map|entity_metadata|genui)(?:\uE202[^\uE201]*)?\uE201/g, '');
  value = value.replace(/\uE200filecite(?:\uE202[^\uE201]*)?\uE201/g, '(당시 첨부 참조 · 원본 비공개)');
  value = value.replace(/^:::writing\{[^\n]*\}\r?\n([\s\S]*?)\r?\n:::\s*$/, '$1');
  let html = micromark(value, {
    allowDangerousHtml: false,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

  html = html.replace(/<img\b([^>]*)>/gi, (_match, attributes) => {
    const source = attributes.match(/\bsrc="([^"]*)"/i)?.[1];
    const alt = attributes.match(/\balt="([^"]*)"/i)?.[1] || '이미지 링크';
    return source ? `<a href="${source}">${alt}</a>` : alt;
  });

  return html.replace(
    /<a href="([^"]+)"([^>]*)>/g,
    '<a href="$1"$2 target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">',
  );
}
