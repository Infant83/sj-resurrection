import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseCalendarDate,calendarSourceHref} from '../src/lib/rehab-calendar.ts';
const schedule=JSON.parse(fs.readFileSync(new URL('../src/data/rehab-schedule.json',import.meta.url),'utf8'));
const root=new URL('../src/content/posts/',import.meta.url);
const posts=new Map(fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.json')).map(f=>[f.slice(0,-5),JSON.parse(fs.readFileSync(new URL(f,root),'utf8'))]));

test('every calendar item is valid and links to an actual reviewed caregiver message',()=>{
 const ids=new Set();
 for(const item of [...schedule.events,...schedule.ongoingPlans??[],...schedule.pendingPlans??[]]){
  assert(item.id&&!ids.has(item.id));ids.add(item.id);
  assert(item.title&&item.hospitalId&&item.sourceRefs.length);
  for(const source of item.sourceRefs){
   const post=posts.get(source.postId);assert(post,source.postId);
   assert(post.privacyReviewed&&post.status==='published');
   const m=post.messages.find(m=>m.id===source.messageId);assert(m,source.messageId);
   assert.equal(m.role,'user');assert.equal(m.sourceVerified,true);
   assert(calendarSourceHref('/sj-resurrection/',source).startsWith('/sj-resurrection/post/'));
  }
 }
 for(const event of schedule.events){
  assert(parseCalendarDate(event.date),event.id);
  assert(['planned','completed','cancelled','tentative'].includes(event.status));
  assert(['rehabilitation','outpatient','transfer','assessment','other'].includes(event.kind));
  for(const time of [event.time,event.endTime])if(time)assert.match(time,/^(?:[01]\d|2[0-3]):[0-5]\d$/);
  if(event.endTime)assert(event.time&&event.endTime>=event.time);
  if(event.supersedes)assert(schedule.events.some(e=>e.id===event.supersedes));
  if(event.status==='completed')assert(event.sourceRefs.some(s=>posts.get(s.postId).messages.find(m=>m.id===s.messageId).recordedAt.start.slice(0,10)>=event.date));
 }
});

test('recorded date differs from treatment date without losing the source and past plans remain plans',()=>{
 const actual=schedule.events.find(e=>e.id==='hanyang-20261015-speech1330');
 assert.equal(actual.date,'2026-10-15');assert.equal(actual.status,'completed');
 assert(actual.sourceRefs.some(s=>s.postId==='rehab-care/2026-10-16'));
 const originalPlan=schedule.events.find(e=>e.id==='hanyang-20261014-pt1130-plan');
 assert.equal(originalPlan.status,'planned');assert.equal(originalPlan.time,'11:30');
 assert.equal(schedule.events.find(e=>e.id==='hanyang-20261014-pt1030').time,'10:30');
 assert.equal(schedule.events.find(e=>e.id==='asan-20261007-outpatient').status,'cancelled');
 const severance=schedule.events.find(e=>e.id==='severance-20261021-outpatient');
 assert.equal(severance.status,'completed');
 assert(severance.sourceRefs.some(s=>s.postId==='trauma/2026-09-24'));
 assert(severance.sourceRefs.some(s=>s.postId==='rehab-care/2026-10-21'));
});

test('new actual therapies retain event dates while conditional plans are not appointments',()=>{
 const saturday=schedule.events.find(e=>e.id==='hanyang-20261017-rehabilitation0930');
 assert.equal(saturday.status,'completed');
 assert(saturday.sourceRefs.some(s=>s.postId==='rehab-care/2026-10-18'));
 const assessment=schedule.events.find(e=>e.id==='hanyang-20261021-assessment0900');
 assert.equal(assessment.status,'completed');assert.equal(assessment.endTime,undefined);
 assert.equal(schedule.events.find(e=>e.id==='hanyang-20261021-capping-night-plan').status,'planned');
 assert.equal(schedule.events.find(e=>e.id==='hanyang-20261022-neck-xray-plan').status,'planned');
 assert(!schedule.events.some(e=>e.hospitalId==='severance'&&e.kind==='transfer'));
 assert(schedule.pendingPlans.some(e=>e.id==='next-rehab-transfer'&&/미확정/.test(e.note)));
 assert(schedule.pendingPlans.some(e=>e.id==='hanyang-brain-mri-consideration'));
 assert(schedule.pendingPlans.some(e=>e.id==='hanyang-psychiatry-report-followup'));
 assert(!schedule.pendingPlans.some(e=>['hanyang-psychiatry-assessment','hanyang-urology-referral'].includes(e.id)));
});
