// Optional device-local worksheet only. No patient data is sent to a server.
const STORAGE_PREFIX = 'sj-rehab-daily-v1:';
const fields = ['task', 'status', 'time', 'minutes', 'response', 'observation', 'tolerance'] as const;
type Field = (typeof fields)[number];
type SessionRecord = Record<Field, string>;
// Additive fields keep earlier three-session v1 records readable.
type DayRecord = { version: 1; date: string; sessions: Record<string, SessionRecord>; review: string; plan?: string; tremor?: string };
const hints: Record<string, string> = {
  orient: 'A: 조용한 환경에서 익숙한 목소리 또는 사진 하나. 충분히 기다리고, 움직임을 요구하지 않습니다.',
  command: 'B: 요청 하나 뒤에 충분히 기다립니다. 손가락·팔 동작은 그 부위의 능동운동이 허용된 경우만. 어려우면 시선으로 바꿉니다.',
  choose: 'C: 사진이나 노래 두 가지 중 시선으로 고릅니다. 손으로 가리키기는 해당 부위 사용이 허용된 경우만. 정답률은 의식점수가 아닙니다.',
  movement: 'D: 치료사에게 직접 배운 허용 동작 하나만. 부위·범위·도움 방법이 미확인이면 보류하고 A 또는 휴식을 선택하세요.',
  fingers: 'D: 오른손 사용을 허용받아 배운 경우만 손가락 펴기 또는 맞대기 하나. 세게 쥐게 하거나 대신 펴 주지 않습니다. 왼손에 확대 적용하지 않습니다.',
  touch: 'D: 치료사가 허용한 위치의 큰 표적 하나. 터치는 팔·손 사용과 도달 범위를 허용받은 경우만. 위로 뻗거나 몸을 비틀지 말고 어려우면 시선으로 바꿉니다.',
  body: 'A: 몸 이름 하나를 짧게 말합니다. 가벼운 접촉은 허용된 손상 없는 피부에만. 골절·상처·관 주변은 피하고 누르거나 문지르지 않습니다.',
  rest: '휴식: 소리와 화면을 줄이고 편안함만 살핍니다. 잠을 깨우거나 남은 운동을 하지 않습니다. 자세·쿠션은 간호팀이 정한 방법을 따릅니다.',
};

export function initializeRehabDaily() {
  const root = document.querySelector<HTMLElement>('.rehab-daily');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const dateInput = root.querySelector<HTMLInputElement>('#rehab-date')!;
  const saveInput = root.querySelector<HTMLInputElement>('#rehab-local-save')!;
  const review = root.querySelector<HTMLTextAreaElement>('#rehab-review')!;
  const plan = root.querySelector<HTMLTextAreaElement>('#rehab-plan')!;
  const tremor = root.querySelector<HTMLTextAreaElement>('#rehab-tremor')!;
  const safety = [...root.querySelectorAll<HTMLInputElement>('[data-safety]')];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-session]')];
  const safetyStatus = root.querySelector<HTMLElement>('#rehab-safety-status')!;
  const storageStatus = root.querySelector<HTMLElement>('#rehab-storage-status')!;
  const actionStatus = root.querySelector<HTMLElement>('#rehab-action-status')!;
  const fallback = root.querySelector<HTMLTextAreaElement>('#rehab-copy-fallback')!;
  const now = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) => now.find((item) => item.type === name)!.value;
  let currentDate = `${part('year')}-${part('month')}-${part('day')}`;
  let unsaved = false;
  dateInput.value = currentDate;
  // Never restore clearance: reassess before each activity, including after navigation.
  safety.forEach((input) => { input.checked = false; });
  saveInput.checked = false;

  function control(card: HTMLElement, field: Field) {
    return card.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-field="${field}"]`)!;
  }
  function collect(): DayRecord {
    const sessions: DayRecord['sessions'] = {};
    cards.forEach((card) => {
      const entry = {} as SessionRecord;
      fields.forEach((field) => { entry[field] = control(card, field).value; });
      sessions[card.dataset.session!] = entry;
    });
    return { version: 1, date: currentDate, sessions, review: review.value, plan: plan.value, tremor: tremor.value };
  }
  function taskHint(card: HTMLElement) {
    card.querySelector<HTMLElement>('[data-task-hint]')!.textContent = hints[control(card, 'task').value] ?? hints.orient;
  }
  function resetSafety() {
    safety.forEach((input) => { input.checked = false; });
    updateSafety();
  }
  function updateSafety() {
    const ready = safety.every((input) => input.checked);
    safetyStatus.textContent = ready
      ? '이번 활동 전 확인을 표시했습니다. 이것은 의학적 안전 판정이 아닙니다. 불편하면 즉시 중단하고, 다음 활동 전 다시 확인하세요.'
      : '아직 확인 전입니다. 상태가 불확실하면 활동 대신 간호사에게 먼저 문의하세요.';
  }
  function clearForm() {
    cards.forEach((card) => {
      fields.forEach((field) => {
        control(card, field).value = field === 'task' ? card.dataset.defaultTask! : field === 'status' ? 'planned' : '';
      });
      taskHint(card);
    });
    review.value = '';
    plan.value = '';
    tremor.value = '';
    resetSafety();
    unsaved = false;
    fallback.hidden = true;
    fallback.value = '';
  }
  function storedDay(): DayRecord | null {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + currentDate);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data?.version !== 1 || data.date !== currentDate || typeof data.sessions !== 'object' || !data.sessions || typeof data.review !== 'string') {
        throw new Error('Invalid record');
      }
      return data;
    } catch {
      storageStatus.textContent = '저장된 기록을 읽지 못했습니다. 원본을 덮어쓰지 않도록 저장을 해제했습니다. 화면 기록은 복사해 보관하세요.';
      saveInput.checked = false;
      return null;
    }
  }
  function restore(data: DayRecord) {
    clearForm();
    cards.forEach((card) => {
      const entry = data.sessions[card.dataset.session!];
      if (!entry || typeof entry !== 'object') return;
      fields.forEach((field) => {
        if (typeof entry[field] !== 'string') return;
        const node = control(card, field);
        const limit = node instanceof HTMLTextAreaElement ? node.maxLength : 1600;
        const value = entry[field].slice(0, limit > 0 ? limit : 1600);
        if (node instanceof HTMLSelectElement && ![...node.options].some((option) => option.value === value)) return;
        node.value = value;
      });
      taskHint(card);
    });
    review.value = data.review.slice(0, 1600);
    plan.value = typeof data.plan === 'string' ? data.plan.slice(0, 1600) : '';
    tremor.value = typeof data.tremor === 'string' ? data.tremor.slice(0, 1600) : '';
  }
  function persist() {
    unsaved = true;
    if (!saveInput.checked) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + currentDate, JSON.stringify(collect()));
      unsaved = false;
      storageStatus.textContent = `${currentDate} 기록을 이 브라우저에만 저장했습니다. 공개 게시·가족 간 동기화는 되지 않습니다.`;
    } catch {
      saveInput.checked = false;
      storageStatus.textContent = '기기 저장을 사용할 수 없습니다. 화면의 기록은 남아 있으니 새로고침 전에 복사하세요.';
    }
  }
  clearForm();
  safety.forEach((input) => input.addEventListener('change', updateSafety));
  root.querySelector('#rehab-reset-safety')!.addEventListener('click', resetSafety);
  cards.forEach((card) => {
    card.addEventListener('input', () => { taskHint(card); persist(); });
    control(card, 'status').addEventListener('change', () => {
      if (control(card, 'status').value === 'done') {
        actionStatus.textContent = '관찰을 기록했습니다. 다음 활동 전 안전 확인을 다시 하세요. 이미 한 활동의 기록이며 의료적 승인 표시는 아닙니다.';
        resetSafety();
      }
      persist();
    });
    card.querySelector('[data-stop-session]')!.addEventListener('click', () => {
      control(card, 'status').value = 'stopped';
      resetSafety();
      persist();
      actionStatus.textContent = '중단으로 기록했습니다. 불편한 신호가 있으면 간호사를 부르고, 활동을 재촉하지 마세요.';
      control(card, 'tolerance').focus();
    });
  });
  [review, plan, tremor].forEach((input) => input.addEventListener('input', persist));
  saveInput.addEventListener('change', () => {
    if (!saveInput.checked) {
      storageStatus.textContent = '자동 저장을 끕니다. 이전에 저장한 날짜별 기록은 남아 있습니다. 삭제하려면 해당 날짜의 기록 비우기를 사용하세요.';
      return;
    }
    const existing = storedDay();
    if (!saveInput.checked) return;
    if (existing) {
      const load = !unsaved || window.confirm('이 날짜에 저장된 기록이 있습니다. 현재 화면 대신 저장된 기록을 불러올까요? 취소하면 저장을 켜지 않고 현재 화면을 유지합니다.');
      if (!load) { saveInput.checked = false; return; }
      restore(existing);
      storageStatus.textContent = `${currentDate} 기기 기록을 불러왔습니다. 안전 확인은 다시 해야 합니다.`;
    } else persist();
  });
  dateInput.addEventListener('change', () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) { dateInput.value = currentDate; return; }
    if (unsaved && !window.confirm('화면에 저장하지 않은 기록이 있습니다. 날짜를 바꾸면 사라집니다. 먼저 기록 복사를 하려면 취소하세요. 날짜를 바꿀까요?')) {
      dateInput.value = currentDate; return;
    }
    currentDate = dateInput.value;
    clearForm();
    actionStatus.textContent = '';
    if (saveInput.checked) {
      const existing = storedDay();
      if (existing) restore(existing);
      if (saveInput.checked) storageStatus.textContent = existing ? `${currentDate} 저장 기록을 불러왔습니다.` : `${currentDate} 새 기록입니다. 입력하면 이 기기에 저장됩니다.`;
    }
  });

  function textRecord() {
    const lines = ['가족 병상 활동 관찰 기록 (의식점수·의료 처방 아님)', `날짜: ${currentDate}`, '미실시·무반응을 회복 실패로 해석하지 않습니다.', `가족이 의료진에게 확인해 적은 활동 범위: ${plan.value || '미확인 — 운동 보류'}`, '이 메모 자체는 의료진의 처방·승인이 아닙니다.'];
    cards.forEach((card) => {
      const task = control(card, 'task') as HTMLSelectElement;
      const status = control(card, 'status') as HTMLSelectElement;
      lines.push('', card.querySelector('h4')!.textContent!, `활동: ${task.selectedOptions[0]?.textContent ?? ''}`, `상태: ${status.selectedOptions[0]?.textContent ?? ''}`,
        `시각: ${control(card, 'time').value || '미기록'} / 활동 시간: ${control(card, 'minutes').value || '미기록'} 분`,
        `반응 방식: ${control(card, 'response').value || '미기록'}`, `요청과 관찰: ${control(card, 'observation').value || '미기록'}`, `불편·피로·휴식 후: ${control(card, 'tolerance').value || '미기록'}`);
    });
    lines.push('', `떨림·긴장 관찰 (진단 아님): ${tremor.value || '미기록'}`, `담당팀과 확인할 내용: ${review.value || '미기록'}`);
    return lines.join('\n');
  }
  root.querySelector('#rehab-copy')!.addEventListener('click', async () => {
    const value = textRecord();
    try {
      await navigator.clipboard.writeText(value);
      actionStatus.textContent = '기록을 복사했습니다. 개인 메모에 붙여 넣거나 담당팀에 보여 주세요. 공개 게시되지는 않습니다.';
    } catch {
      fallback.hidden = false;
      fallback.value = value;
      fallback.focus();
      fallback.select();
      actionStatus.textContent = '자동 복사가 되지 않아 아래에 기록을 표시했습니다. 길게 눌러 직접 복사하세요.';
    }
  });
  let previousOpen: HTMLDetailsElement[] = [];
  window.addEventListener('beforeprint', () => {
    root.querySelector<HTMLElement>('#rehab-print-record')!.textContent = textRecord();
    previousOpen = [...root.querySelectorAll<HTMLDetailsElement>('details:not([open])')];
    previousOpen.forEach((detail) => { detail.open = true; });
  });
  window.addEventListener('afterprint', () => { previousOpen.forEach((detail) => { detail.open = false; }); });
  root.querySelector('#rehab-print')!.addEventListener('click', () => window.print());
  root.querySelector('#rehab-clear')!.addEventListener('click', () => {
    if (!window.confirm(`${currentDate} 화면 기록과 이 기기에 저장된 같은 날짜의 기록만 삭제할까요? 다른 날짜는 유지됩니다. 복사해 두지 않았다면 복구할 수 없습니다.`)) return;
    let removed = true;
    try { localStorage.removeItem(STORAGE_PREFIX + currentDate); } catch { removed = false; }
    clearForm();
    actionStatus.textContent = removed ? '이 날짜의 기록을 비웠습니다. 다른 날짜 기록은 유지됩니다.' : '화면만 비웠습니다. 브라우저 저장소에 접근할 수 없어 저장된 기록은 삭제하지 못했습니다.';
    storageStatus.textContent = saveInput.checked ? '새 입력은 이 기기에 저장됩니다.' : '기본값은 저장 안 함입니다. 기록 복사를 이용하세요.';
  });
  window.addEventListener('beforeunload', (event) => {
    if (unsaved) event.preventDefault();
  });
  window.addEventListener('pageshow', resetSafety);
}
