import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertArchiveIntegrity } from '../src/lib/archive.ts';
import { rehabHospitals, rehabPhases } from '../src/data/rehab.ts';

const root = new URL('../src/content/posts/', import.meta.url);
const fixture = () => ({data: JSON.parse(fs.readFileSync(new URL('rehab-care/2026-09-30.json', root), 'utf8'))});

test('published rehabilitation records require hospital and stage labels', () => {
  const p=fixture();
  assert.doesNotThrow(() => assertArchiveIntegrity([p]));
  delete p.data.rehab;
  assert.throws(() => assertArchiveIntegrity([p]), /needs hospital and phase labels/);
});

test('every hospital booking links to existing reviewed source messages', () => {
  const data=JSON.parse(fs.readFileSync(new URL('../src/data/rehab-hospitals.json', import.meta.url), 'utf8'));
  assert.deepEqual(data.hospitals.map(h=>h.id).sort(),rehabHospitals.map(h=>h.id).sort());
  for (const h of data.hospitals) {
    assert.ok(h.sources.length>0);
    let caregiverSources=0;
    for (const s of h.sources) {
      const p=JSON.parse(fs.readFileSync(new URL(s.postId+'.json', root), 'utf8'));
      assert.equal(p.status,'published');assert.equal(p.privacyReviewed,true);
      const m=p.messages.find(m=>m.id===s.messageId);
      assert.ok(m?.sourceVerified,'unverified or missing booking source');
      if(m.role==='user')caregiverSources++;
    }
    assert.ok(caregiverSources>0,'a GPT reply alone cannot establish a booking');
  }
});

test('all rehabilitation posts have recognized labels and valid source integrity', () => {
  const posts=fs.readdirSync(new URL('rehab-care/',root)).filter(f=>f.endsWith('.json')).map(f=>({data:JSON.parse(fs.readFileSync(new URL('rehab-care/'+f,root)))}));
  for(const {data:p} of posts) {
    assert.ok(p.rehab.hospitalIds.every(id=>rehabHospitals.some(h=>h.id===id)));
    assert.ok(p.rehab.phases.every(id=>rehabPhases.some(s=>s.id===id)));
  }
  assert.doesNotThrow(()=>assertArchiveIntegrity(posts));
});
