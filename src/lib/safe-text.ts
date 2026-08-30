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

export function safeTextToHtml(value: string) {
  const escaped = escapeHtml(value);
  const links: string[] = [];
  const withMarkdownLinks = escaped.replace(MARKDOWN_LINK_PATTERN, (_match, label, url) => {
    const token = `__SAFE_LINK_${links.length}__`;
    links.push(
      `<a href="${url}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${label}</a>`,
    );
    return token;
  });

  const withUrls = withMarkdownLinks.replace(URL_PATTERN, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${url}</a>`;
  });

  const restored = links.reduce((html, link, index) => html.replace(`__SAFE_LINK_${index}__`, link), withUrls);
  return restored.replaceAll('\n', '<br />');
}
