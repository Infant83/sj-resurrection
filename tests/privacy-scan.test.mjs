import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scanner = fileURLToPath(new URL('../scripts/privacy-check.mjs', import.meta.url));
function scan(text, json = false) {
  const directory = mkdtempSync(join(tmpdir(), 'sj-privacy-test-'));
  try {
    mkdirSync(join(directory, 'src/content'), { recursive: true });
    writeFileSync(join(directory, 'src/content', json ? 'fixture.json' : 'fixture.md'), json ? JSON.stringify({ text }) : text);
    return spawnSync(process.execPath, [scanner], { cwd: directory, encoding: 'utf8' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const json of [false, true]) {
  test(`rejects account values in ${json ? 'JSON' : 'plain text'} without printing them`, () => {
    for (const line of ['ID example-account', 'PW example-secret', '비밀번호: example-secret']) {
      const result = scan('설명\n' + line + '\n', json);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /account credential/);
      assert.doesNotMatch(result.stdout + result.stderr, /example-account|example-secret/);
    }
  });
  test(`accepts redaction placeholders in ${json ? 'JSON' : 'plain text'}`, () => {
    assert.equal(scan('ID [계정정보 비공개]\nPW [계정정보 비공개]\n[생년월일 비공개]\n[연락처 비공개]', json).status, 0);
  });
}

test('rejects an exact personal birth date', () => {
  const result = scan('가상 인물 (2001년 2월 3일생)', true);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /personal birth date/);
  assert.doesNotMatch(result.stderr, /2001년/);
});
