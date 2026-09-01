import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['src/content', 'src/data', 'public'];
const extensions = new Set(['.md', '.mdx', '.json', '.yml', '.yaml', '.txt', '.html', '.xml']);
const findings = [];
// Exact institutional contacts retained from source-reviewed hospital/rehab replies.
// Personal or unverified numbers remain blocked.
const allowedPublicInstitutionalContacts = new Set([
  '010-8048-5200',
  '02-2030-7080',
  '02-2030-7083',
  '02-2072-1002',
  '02-2228-3763',
  '02-2228-7700',
  '02-3010-7769',
  '02-901-1705',
  '031-799-3882',
  '031-820-3425',
  '031-820-3470',
  '031-820-3665',
  '031-820-5432',
  '031-851-0112',
  '031-851-0712',
  '031-900-0057',
  '1577-0013',
  '1577-3622',
  '1661-7500',
  '1811-7755',
]);
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['GitHub token', /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g],
  ['OpenAI token', /\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['Korean resident number', /\b\d{6}-[1-4]\d{6}\b/g],
  ['Korean mobile number', /\b01[016789]-?\d{3,4}-?\d{4}\b/g],
  ['Korean phone number', /\b0\d{1,2}-\d{3,4}-\d{4}\b/g],
  ['email address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['summary or reconstruction marker', /(?:summary-reconstruction|대화\s*요약\s*복원본)/g],
  [
    'unverified conversation marker',
    /(?:^\s*(?:fidelity:\s*pending-original|status:\s*needs-original-check)\s*$|"(?:fidelity|status)"\s*:\s*"(?:pending-original|needs-original-check)")/gm,
  ],
];

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extensions.has(extname(entry.name))) {
      const text = await readFile(path, 'utf8');
      for (const [label, pattern] of rules) {
        pattern.lastIndex = 0;
        if (label === 'Korean mobile number' || label === 'Korean phone number') {
          const unapproved = [...text.matchAll(pattern)].some(
            (match) => !allowedPublicInstitutionalContacts.has(match[0]),
          );
          if (unapproved) findings.push(`${path}: ${label}`);
          continue;
        }
        if (pattern.test(text)) findings.push(`${path}: ${label}`);
      }
    }
  }
}

for (const root of roots) await walk(root);

if (findings.length) {
  console.error('Potential sensitive values found:\n' + findings.join('\n'));
  process.exit(1);
}

console.log('Privacy scan passed. Manual medical-record review is still required.');
