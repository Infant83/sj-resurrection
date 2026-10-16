import { rehabHospitals } from '../data/rehab.ts';

export type RehabEventKind = 'rehabilitation' | 'outpatient' | 'transfer' | 'assessment' | 'other';
export type RehabEventStatus = 'planned' | 'completed' | 'cancelled' | 'tentative';
export type RehabScheduleSource = { postId: string; messageId: string; label: string };
export type RehabScheduleEvent = {
  id: string;
  date: string;
  time?: string | null;
  endTime?: string | null;
  title: string;
  hospitalId: string;
  kind: RehabEventKind;
  status: RehabEventStatus;
  note?: string;
  sourceRefs: RehabScheduleSource[];
  supersedes?: string;
};
export type RehabOngoingPlan = {
  id: string;
  title: string;
  hospitalId: string;
  time?: string;
  effectiveFrom: string;
  note: string;
  sourceRefs: RehabScheduleSource[];
};
export type RehabPendingPlan = {
  id: string;
  title: string;
  hospitalId: string;
  note: string;
  sourceRefs: RehabScheduleSource[];
};
export type RehabSchedule = {
  schemaVersion: 1;
  updatedAt: string;
  events: RehabScheduleEvent[];
  ongoingPlans?: RehabOngoingPlan[];
  pendingPlans?: RehabPendingPlan[];
};
export type CalendarDay = { date: string; day: number; inMonth: boolean };

export const eventKindLabels: Record<RehabEventKind, string> = {
  rehabilitation: '재활', outpatient: '외래', transfer: '전원·입원', assessment: '평가·검사', other: '기타',
};
export const eventStatusLabels: Record<RehabEventStatus, string> = {
  planned: '예정', completed: '완료 기록', cancelled: '취소', tentative: '잠정',
};
const pad = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && dateKey(parsed) === value ? parsed : null;
}

export function koreanToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function calendarMonthDays(month: string): CalendarDay[] {
  const first = parseCalendarDate(`${month}-01`);
  if (!first) throw new Error(`Invalid calendar month: ${month}`);
  const firstCell = new Date(first);
  firstCell.setUTCDate(firstCell.getUTCDate() - firstCell.getUTCDay());
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const cells = Math.ceil((first.getUTCDay() + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const date = new Date(firstCell);
    date.setUTCDate(date.getUTCDate() + index);
    const key = dateKey(date);
    return { date: key, day: date.getUTCDate(), inMonth: key.startsWith(`${month}-`) };
  });
}

export function shiftCalendarMonth(month: string, offset: number): string {
  const first = parseCalendarDate(`${month}-01`);
  if (!first) throw new Error(`Invalid calendar month: ${month}`);
  first.setUTCMonth(first.getUTCMonth() + offset);
  return dateKey(first).slice(0, 7);
}

export function calendarDateLabel(date: string): string {
  const parsed = parseCalendarDate(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(parsed);
}

export function calendarMonthLabel(month: string): string {
  const [year, value] = month.split('-');
  return `${year}년 ${Number(value)}월`;
}

export function orderedDayEvents(events: readonly RehabScheduleEvent[], date: string): RehabScheduleEvent[] {
  return events.filter(event => event.date === date).sort((a, b) =>
    (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.id.localeCompare(b.id),
  );
}

export function nearestEventDate(events: readonly RehabScheduleEvent[], today: string): string {
  const parsed = parseCalendarDate(today);
  if (!parsed) throw new Error(`Invalid calendar date: ${today}`);
  const dayValue = parsed.valueOf();
  const dates = [...new Set(events.map(event => event.date))].filter(date => parseCalendarDate(date));
  return dates.sort((a, b) => {
    const distance = Math.abs(parseCalendarDate(a)!.valueOf() - dayValue) - Math.abs(parseCalendarDate(b)!.valueOf() - dayValue);
    // Prefer an upcoming date when a past and future date are equally close.
    return distance || b.localeCompare(a);
  })[0] ?? today;
}

export function calendarHospitalLabel(id: string): string {
  return rehabHospitals.find(hospital => hospital.id === id)?.label ?? (id === 'stmary' ? '의정부성모병원' : id);
}

export function calendarSourceHref(baseUrl: string, source: RehabScheduleSource): string {
  if (!/^[a-z0-9-]+\/\d{4}-\d{2}-\d{2}$/.test(source.postId) || !source.messageId) {
    throw new Error('Invalid calendar source reference');
  }
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}post/${source.postId}/#${encodeURIComponent(source.messageId)}`;
}

export function initializeRehabCalendar(root: HTMLElement, options: { now?: Date; initialDate?: string } = {}) {
  if (root.dataset.initialized) return;
  const dataNode = root.querySelector<HTMLScriptElement>('[data-calendar-data]');
  if (!dataNode?.textContent) return;
  const data = JSON.parse(dataNode.textContent) as RehabSchedule;
  const doc = root.ownerDocument;
  const today = koreanToday(options.now);
  const requestedDate = options.initialDate;
  let selectedDate = requestedDate && parseCalendarDate(requestedDate) ? requestedDate : nearestEventDate(data.events, today);
  let month = selectedDate.slice(0, 7);
  const grid = root.querySelector<HTMLElement>('[data-calendar-days]')!;
  const monthTitle = root.querySelector<HTMLElement>('[data-calendar-month]')!;
  const agendaTitle = root.querySelector<HTMLElement>('[data-calendar-selected]')!;
  const agenda = root.querySelector<HTMLElement>('[data-calendar-agenda]')!;
  const notice = root.querySelector<HTMLElement>('[data-calendar-notice]')!;
  const baseUrl = root.dataset.baseUrl ?? '/';
  root.dataset.initialized = 'true';

  const element = (tag: string, className: string, text?: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function renderAgenda() {
    agendaTitle.textContent = calendarDateLabel(selectedDate);
    const events = orderedDayEvents(data.events, selectedDate);
    agenda.replaceChildren();
    if (!events.length) {
      agenda.append(element('li', 'calendar-empty', '이 날짜에 등록된 일정이 없습니다.'));
      return;
    }
    for (const event of events) {
      const item = element('li', `calendar-event calendar-event-${event.status}`);
      item.id = `rehab-event-${event.id}`;
      const top = element('div', 'calendar-event-top');
      const time = element('time', 'calendar-event-time', event.time ? `${event.time}${event.endTime ? `–${event.endTime}` : ''}` : '시각 미확인');
      time.setAttribute('datetime', event.time ? `${event.date}T${event.time}:00+09:00` : event.date);
      top.append(time, element('span', `calendar-status calendar-status-${event.status}`, eventStatusLabels[event.status]));
      item.append(top, element('h4', 'calendar-event-title', event.title));
      item.append(element('p', 'calendar-event-meta', `${eventKindLabels[event.kind]} · ${calendarHospitalLabel(event.hospitalId)}`));
      if (event.note) item.append(element('p', 'calendar-event-note', event.note));
      const sources = element('div', 'calendar-event-sources');
      sources.setAttribute('aria-label', '일정의 근거 기록');
      for (const source of event.sourceRefs) {
        const link = element('a', 'calendar-source', `${source.label} ↗`) as HTMLAnchorElement;
        link.href = calendarSourceHref(baseUrl, source);
        sources.append(link);
      }
      item.append(sources);
      agenda.append(item);
    }
  }

  function render() {
    root.dataset.selectedDate = selectedDate;
    root.dataset.month = month;
    monthTitle.textContent = calendarMonthLabel(month);
    notice.textContent = selectedDate !== today && !data.events.some(event => event.date === today)
      ? `오늘(${calendarDateLabel(today)})은 등록된 일정이 없습니다. 선택한 날짜의 기록과 계획을 표시합니다.`
      : '날짜를 누르면 해당 날짜의 기록과 계획을 볼 수 있습니다.';
    grid.replaceChildren();
    for (const day of calendarMonthDays(month)) {
      const count = data.events.filter(event => event.date === day.date).length;
      const button = element('button', 'calendar-day') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.date = day.date;
      button.dataset.inMonth = String(day.inMonth);
      button.setAttribute('aria-pressed', String(day.date === selectedDate));
      button.setAttribute('aria-label', `${calendarDateLabel(day.date)}${day.date === today ? ', 오늘' : ''}, ${count ? `일정 ${count}건` : '등록된 일정 없음'}`);
      if (day.date === today) button.setAttribute('aria-current', 'date');
      button.append(element('span', 'calendar-day-number', String(day.day)));
      if (count) button.append(element('span', 'calendar-day-count', `${count}건`));
      grid.append(button);
    }
    renderAgenda();
  }

  grid.addEventListener('click', (event) => {
    const target = event.target as Element;
    const button = target.closest<HTMLButtonElement>('button[data-date]');
    if (!button || !grid.contains(button)) return;
    selectedDate = button.dataset.date!;
    month = selectedDate.slice(0, 7);
    render();
    root.querySelector<HTMLButtonElement>(`button[data-date="${selectedDate}"]`)?.focus();
  });
  root.querySelector('[data-calendar-prev]')!.addEventListener('click', () => moveMonth(-1));
  root.querySelector('[data-calendar-next]')!.addEventListener('click', () => moveMonth(1));
  root.querySelector('[data-calendar-today]')!.addEventListener('click', () => {
    selectedDate = today;
    month = today.slice(0, 7);
    render();
  });
  function moveMonth(offset: number) {
    month = shiftCalendarMonth(month, offset);
    const dates = data.events.filter(event => event.date.startsWith(`${month}-`)).map(event => event.date).sort();
    selectedDate = dates[0] ?? `${month}-01`;
    render();
  }
  render();
}
