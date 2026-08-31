import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['src/content', 'src/data', 'public'];
const extensions = new Set(['.md', '.mdx', '.json', '.yml', '.yaml', '.txt', '.html', '.xml']);
const findings = [];
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['GitHub token', /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g],
  ['OpenAI token', /\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['Korean resident number', /\b\d{6}-[1-4]\d{6}\b/g],
  ['patient full name', /김\s*선진/g],
  ['Korean mobile number', /\b01[016789]-?\d{3,4}-?\d{4}\b/g],
  ['Korean phone number', /\b0\d{1,2}-\d{3,4}-\d{4}\b/g],
  ['email address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extensions.has(extname(entry.name))) {
      const text = await readFile(path, 'utf8');
      for (const [label, pattern] of rules) {
        pattern.lastIndex = 0;
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
