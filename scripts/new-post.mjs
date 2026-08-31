import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((item) => {
    const [key, ...value] = item.replace(/^--/, '').split('=');
    return [key, value.join('=')];
  }),
);

const allowedBoards = new Set(['trauma', 'life', 'medical', 'rehabilitation', 'media']);
const board = args.board;
const date = args.date;
const slug = args.slug;
const title = args.title;

if (!allowedBoards.has(board) || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !/^[a-z0-9-]+$/.test(slug ?? '') || !title) {
  console.error(
    'Usage: npm run new:post -- --board=trauma --date=2026-08-30 --slug=status-update --title="제목"',
  );
  process.exit(1);
}

const [year, month] = date.split('-');
const directory = join('src', 'content', 'posts', year, month);
const file = join(directory, `${date}-${slug}.json`);
const recordId = `${board}-${date}-${slug}`;
const entryType = {
  trauma: 'clinical-update',
  life: 'letter',
  medical: 'medical-knowledge',
  rehabilitation: 'rehabilitation-plan',
  media: 'media-record',
}[board];

const sourceId = `source-${recordId}`;
const template = {
  schemaVersion: 2,
  recordId,
  board,
  entryType,
  title,
  status: 'draft',
  sensitivity: 'highly-sensitive',
  recordedAt: { start: date, precision: 'day', timezone: 'Asia/Seoul' },
  tags: [],
  sources: [
    {
      id: sourceId,
      type: 'chat-conversation',
      certainty: 'reported',
      label: '원본 대화 확인 필요',
    },
  ],
  messages: [
    {
      id: `message-${recordId}-001`,
      role: 'user',
      recordedAt: { start: date, precision: 'day', timezone: 'Asia/Seoul' },
      sourceVerified: false,
      sourceRefs: [sourceId],
      original: '원문을 입력하세요.',
      fidelity: 'pending-original',
    },
  ],
  amendments: [],
  media: [],
  related: [],
  privacyReviewed: false,
};

await mkdir(directory, { recursive: true });
await writeFile(file, `${JSON.stringify(template, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
console.log(file);
