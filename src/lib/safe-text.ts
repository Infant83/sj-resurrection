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

export function safeMarkdownToHtml(value: string) {
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
