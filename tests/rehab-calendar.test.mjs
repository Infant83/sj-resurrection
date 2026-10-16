import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import {
  calendarMonthDays, calendarSourceHref, koreanToday, nearestEventDate,
  orderedDayEvents, parseCalendarDate, shiftCalendarMonth, initializeRehabCalendar,
} from '../src/lib/rehab-calendar.ts';

const source = { postId: 'rehab-care/2026-10-13', messageId: 'caregiver-13', label: '간병기록' };
const event = (id, date, values = {}) => ({
  id, date, title: '물리치료', hospitalId: 'hanyang', kind: 'rehabilitation',
  status: 'planned', sourceRefs: [source], ...values,
});
const fixture = (events, extra = {}) => {
  const { document, window } = parseHTML(`<html><body><section data-rehab-calendar data-base-url="/sj-resurrection/">
    <button data-calendar-prev>이전 달</button><h3 data-calendar-month></h3><button data-calendar-next>다음 달</button><button data-calendar-today>오늘</button>
    <div data-calendar-days></div><p data-calendar-notice></p><h3 data-calendar-selected></h3><ol data-calendar-agenda></ol><script type="application/json" data-calendar-data></script>
  </section></body></html>`);
  const root = document.querySelector('section');
  root.querySelector('[data-calendar-data]').textContent = JSON.stringify({ schemaVersion: 1, updatedAt: '2026-10-16', events, ...extra });
  return { root, document, window };
};
const current = new Date('2026-10-15T23:00:00Z'); // 10월 16일 08:00 한국시간

test('Korea date changes at 15:00 UTC and invalid calendar dates are rejected', () => {
  assert.equal(koreanToday(new Date('2026-10-15T14:59:59Z')), '2026-10-15');
  assert.equal(koreanToday(new Date('2026-10-15T15:00:00Z')), '2026-10-16');
  assert.equal(parseCalendarDate('2026-02-29'), null);
  assert.equal(parseCalendarDate('2024-02-29').toISOString(), '2024-02-29T00:00:00.000Z');
  assert.equal(parseCalendarDate('2026-2-01'), null);
  assert.throws(() => calendarMonthDays('2026-13'), /Invalid calendar month/);
});

test('month grids preserve complete Sunday–Saturday weeks and leap/year boundaries', () => {
  const leap = calendarMonthDays('2024-02');
  assert.equal(leap.length, 35);
  assert.equal(leap[0].date, '2024-01-28');
  assert.equal(leap.at(-1).date, '2024-03-02');
  assert.equal(leap.filter(day => day.inMonth).length, 29);
  const sixWeeks = calendarMonthDays('2026-08');
  assert.equal(sixWeeks.length, 42);
  assert.equal(sixWeeks.filter(day => day.inMonth).length, 31);
  assert.equal(shiftCalendarMonth('2026-12', 1), '2027-01');
  assert.equal(shiftCalendarMonth('2026-01', -1), '2025-12');
});

test('nearest date prefers upcoming ties and time sorting keeps unknown times last', () => {
  const events = [event('past', '2026-10-14'), event('future', '2026-10-18')];
  assert.equal(nearestEventDate(events, '2026-10-16'), '2026-10-18');
  assert.equal(nearestEventDate([], '2026-10-16'), '2026-10-16');
  const times = [event('unknown', '2026-10-16'), event('pm', '2026-10-16', { time: '14:30' }), event('am', '2026-10-16', { time: '11:30' })];
  assert.deepEqual(orderedDayEvents(times, '2026-10-16').map(item => item.id), ['am', 'pm', 'unknown']);
  assert.deepEqual(orderedDayEvents(times, '2026-10-17'), []);
});

test('date selection shows every status, hospital and linked source without rewriting past plans', () => {
  const events = [
    event('late', '2026-10-16', { time: '15:00', status: 'completed', title: '운동치료' }),
    event('early', '2026-10-16', { time: '11:30', note: '전기치료기 지참' }),
    event('outpatient', '2026-10-16', { time: '14:30', kind: 'outpatient', status: 'cancelled', hospitalId: 'asan', title: '외래 진료' }),
    event('tentative', '2026-10-16', { status: 'tentative', kind: 'assessment', title: '검사 일정' }),
    event('old-plan', '2026-10-13', { time: '10:00' }),
  ];
  const { root } = fixture(events);
  initializeRehabCalendar(root, { now: current });
  assert.equal(root.dataset.selectedDate, '2026-10-16');
  assert.equal(root.querySelector('[data-date="2026-10-16"]').getAttribute('aria-current'), 'date');
  assert.equal(root.querySelector('[data-date="2026-10-16"]').getAttribute('aria-pressed'), 'true');
  assert.match(root.querySelector('[data-date="2026-10-16"]').getAttribute('aria-label'), /일정 4건/);
  const cards = [...root.querySelectorAll('.calendar-event')];
  assert.deepEqual(cards.map(card => card.id), ['rehab-event-early', 'rehab-event-outpatient', 'rehab-event-late', 'rehab-event-tentative']);
  assert.match(cards[0].textContent, /전기치료기 지참/);
  assert.match(cards[1].textContent, /외래 · 서울아산병원/);
  assert.deepEqual(cards.map(card => card.querySelector('.calendar-status').textContent), ['예정', '취소', '완료 기록', '잠정']);
  assert.equal(cards[0].querySelector('a').getAttribute('href'), '/sj-resurrection/post/rehab-care/2026-10-13/#caregiver-13');
  root.querySelector('[data-date="2026-10-13"]').click();
  assert.match(root.querySelector('.calendar-status').textContent, /예정/);
  root.querySelector('[data-date="2026-10-17"]').click();
  assert.equal(root.querySelectorAll('.calendar-event').length, 0);
  assert.match(root.querySelector('[data-calendar-agenda]').textContent, /등록된 일정이 없습니다/);
  root.querySelector('[data-calendar-today]').click();
  assert.equal(root.querySelectorAll('.calendar-event').length, 4);
  initializeRehabCalendar(root, { now: current });
  assert.equal(root.querySelectorAll('.calendar-event').length, 4);
});

test('month navigation crosses years; empty today does not imply cancellation or completion', () => {
  const events = [event('previous', '2026-12-30'), event('next', '2027-01-05')];
  const { root } = fixture(events);
  initializeRehabCalendar(root, { now: new Date('2027-01-02T03:00:00Z') });
  assert.equal(root.dataset.selectedDate, '2027-01-05');
  assert.match(root.querySelector('[data-calendar-notice]').textContent, /오늘.*등록된 일정이 없습니다/);
  root.querySelector('[data-calendar-prev]').click();
  assert.equal(root.dataset.month, '2026-12');
  assert.equal(root.dataset.selectedDate, '2026-12-30');
  assert.equal(root.querySelector('.calendar-status').textContent, '예정');
  root.querySelector('[data-calendar-next]').click();
  assert.equal(root.dataset.selectedDate, '2027-01-05');
  root.querySelector('[data-calendar-today]').click();
  assert.equal(root.dataset.selectedDate, '2027-01-02');
  assert.equal(root.querySelectorAll('.calendar-event').length, 0);
});

test('event text remains literal and source links cannot become executable URLs', () => {
  const { root } = fixture([event('safe', '2026-10-16', {
    title: '<img src=x onerror=alert(1)>', note: '<script>bad()</script>',
    sourceRefs: [{ ...source, label: '<svg onload=bad()>' }],
  })]);
  initializeRehabCalendar(root, { now: current });
  assert.equal(root.querySelector('img'), null);
  assert.equal(root.querySelector('svg'), null);
  assert.equal(root.querySelector('.calendar-event-note').textContent, '<script>bad()</script>');
  assert.throws(() => calendarSourceHref('/sj-resurrection/', { ...source, postId: 'javascript:alert(1)' }), /Invalid calendar source/);
  assert.equal(calendarSourceHref('/sj-resurrection', { ...source, messageId: 'one#two' }), '/sj-resurrection/post/rehab-care/2026-10-13/#one%23two');
});

test('recurring guidance and undated plans never create or shift dated appointments', () => {
  const { root } = fixture([], {
    ongoingPlans: [{ id: 'speech', title: '매일 언어치료 안내', hospitalId: 'hanyang', time: '13:30', effectiveFrom: '2026-10-13', note: '시행 요일과 종료일 미확인', sourceRefs: [source] }],
    pendingPlans: [{ id: 'transfer', title: '재활병원 전원 검토', hospitalId: 'nrc', note: '날짜 미정', sourceRefs: [source] }],
  });
  initializeRehabCalendar(root, { now: current });
  assert.equal(root.dataset.selectedDate, '2026-10-16');
  assert.equal(root.querySelectorAll('.calendar-event').length, 0);
  assert.equal(root.querySelectorAll('.calendar-day-count').length, 0);
  root.querySelector('[data-calendar-next]').click();
  assert.equal(root.dataset.month, '2026-11');
  assert.equal(root.querySelectorAll('.calendar-event').length, 0);
  assert.equal(root.querySelectorAll('.calendar-day-count').length, 0);
});
