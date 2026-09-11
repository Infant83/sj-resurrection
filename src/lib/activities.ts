import { activities, beginTrial, isCorrect, makeTask, selectChoice, shapes, skipTrial, type ActivityId, type ActivityOptions, type Trial } from '../data/activities';

type Observation = { trial: Trial; inputMode: string };
export function initializeActivities() {
  const root = document.querySelector<HTMLElement>('[data-activity-app]');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const home = get('[data-activity-home]'), player = get('[data-player]'), pauseScreen = get('[data-pause-screen]'), results = get('[data-results]');
  const prompt = get('[data-prompt]'), stimulus = get('[data-stimulus]'), choices = get('[data-choices]'), feedback = get('[data-feedback]');
  const next = get<HTMLButtonElement>('[data-next]'), skip = get<HTMLButtonElement>('[data-skip]'), ready = get<HTMLButtonElement>('[data-sequence-ready]');
  const difficulty = get<HTMLSelectElement>('[data-difficulty]'), table = get<HTMLSelectElement>('[data-table]'), input = get<HTMLSelectElement>('[data-input-mode]');
  const helped = get<HTMLInputElement>('[data-helped]');
  let activity: ActivityId = 'target';
  let trial: Trial | null = null;
  let observations: Observation[] = [];
  let phase: 'home' | 'playing' | 'paused' | 'results' = 'home';
  let showingSequence = false;
  let lastChoiceTime = -Infinity;
  let runTime = '';

  function screen(value: typeof phase) {
    phase = value;
    home.hidden = value !== 'home'; player.hidden = value !== 'playing'; pauseScreen.hidden = value !== 'paused'; results.hidden = value !== 'results';
    document.body.classList.toggle('activity-running', value === 'playing' || value === 'paused');
  }
  function label(value: string) { return shapes.find((s) => s.value === value)?.label ?? value; }
  function setStimulus() {
    if (!trial) return;
    stimulus.replaceChildren();
    const task = trial.task;
    if (task.count) {
      const dots = document.createElement('div'); dots.className = 'count-dots'; dots.setAttribute('aria-label', `동그라미 ${task.count}개`);
      for (let i = 0; i < task.count; i++) { const dot = document.createElement('span'); dot.textContent = '●'; dot.setAttribute('aria-hidden', 'true'); dots.append(dot); }
      stimulus.append(dots);
    } else if (task.sequence) {
      const sequence = document.createElement('div'); sequence.className = 'sequence-display';
      if (showingSequence) {
        task.sequence.forEach((symbol, i) => {
          const item = document.createElement('span'); item.textContent = symbol; item.setAttribute('aria-label', `${i + 1}번째 ${label(task.answer[i])}`); sequence.append(item);
        });
      } else {
        for (let i = 0; i < task.answer.length; i++) {
          const item = document.createElement('span'); item.textContent = i < trial.selections.length ? '✓' : '·'; item.setAttribute('aria-label', `${i + 1}번째 ${i < trial.selections.length ? '선택함' : '기다림'}`); sequence.append(item);
        }
      }
      stimulus.append(sequence);
    } else {
      stimulus.textContent = task.display;
      if (task.activity === 'match') stimulus.setAttribute('aria-label', `보기: ${label(task.answer[0])}`);
    }
  }
  function renderChoices() {
    if (!trial) return;
    choices.replaceChildren();
    choices.dataset.count = String(trial.task.choices.length);
    choices.classList.toggle('single-target', activity === 'target');
    choices.hidden = showingSequence;
    for (const choice of trial.task.choices) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'task-choice';
      button.dataset.choice = choice.value; button.textContent = choice.symbol ?? choice.label;
      button.setAttribute('aria-label', choice.label); button.disabled = trial.finished;
      if (choice.symbol) button.classList.add('shape-choice');
      if (trial.finished && trial.selections.includes(choice.value)) { button.classList.add('was-selected'); button.setAttribute('aria-pressed', 'true'); }
      button.addEventListener('click', () => {
        if (!trial || phase !== 'playing' || showingSequence || trial.finished || performance.now() - lastChoiceTime < 350) return;
        lastChoiceTime = performance.now();
        trial = selectChoice(trial, choice.value);
        if (trial.finished) {
          renderChoices(); next.disabled = false; skip.disabled = true;
          feedback.textContent = activity === 'target' ? '눌렀어요. 잠깐 쉬어도 좋아요.' : '선택했어요. 천천히 다음으로 가요.';
        } else feedback.textContent = `${trial.selections.length}개 골랐어요. 다음 모양을 눌러요.`;
        if (activity === 'sequence') setStimulus();
      });
      choices.append(button);
    }
  }
  function newTask() {
    const options: ActivityOptions = { difficulty: difficulty.value === 'more' ? 'more' : 'easy', table: table.value === 'mixed' ? 'mixed' : Number(table.value) };
    trial = beginTrial(makeTask(activity, options));
    showingSequence = activity === 'sequence'; helped.checked = false; lastChoiceTime = -Infinity;
    get('[data-progress]').textContent = `${observations.length + 1} / 5`;
    prompt.textContent = trial.task.prompt; stimulus.removeAttribute('aria-label');
    next.disabled = true; skip.disabled = false;
    next.textContent = observations.length === 4 ? '이번 활동 마치기 · 보호자' : '다음 문제 · 보호자';
    ready.hidden = !showingSequence; feedback.textContent = ''; setStimulus(); renderChoices();
    get<HTMLDetailsElement>('.player-settings').open = false;
    prompt.focus({ preventScroll: true });
  }
  function start(id: ActivityId) {
    activity = id; observations = []; trial = null;
    runTime = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
    difficulty.value = 'easy'; table.value = '2'; input.value = 'direct';
    get('[data-game-name]').textContent = activities.find((a) => a.id === id)!.title;
    get('[data-difficulty-label]').hidden = id === 'target' || id === 'multiply';
    get('[data-table-label]').hidden = id !== 'multiply';
    screen('playing'); newTask(); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function saveTrial() {
    if (!trial) return;
    observations.push({ trial: { ...trial, helped: helped.checked }, inputMode: input.value }); trial = null;
  }
  function outcome(t: Trial) { return t.skipped ? '건너뜀' : !t.finished ? '중간에 마침' : activity === 'target' ? '표적 선택' : isCorrect(t) ? '답과 일치' : '다른 선택'; }
  function displayTask(t: Trial) { return t.task.sequence ? t.task.answer.map(label).join(' → ') : t.task.count ? `동그라미 ${t.task.count}개` : t.task.display || '큰 동그라미'; }
  function positionNote() {
    const eligible = observations.filter(({ trial: t }) => t.task.choices.length === 3 && t.selections.length);
    if (!eligible.length) return '';
    const counts = [0, 0, 0];
    eligible.forEach(({ trial: t }) => { const i = t.task.choices.findIndex((c) => c.value === t.selections[0]); if (i >= 0) counts[i]++; });
    return `첫 선택 위치: 왼쪽 ${counts[0]}회 · 가운데 ${counts[1]}회 · 오른쪽 ${counts[2]}회. 손이 닿기 쉬운 위치나 도움의 영향을 함께 살펴주세요.`;
  }
  function recordText() {
    return [`인지 활동 관찰 기록 · ${activities.find((a) => a.id === activity)!.title}`, runTime, '놀이 중 관찰이며 의식 점수·회복률이 아닙니다.', ...observations.map(({ trial: t, inputMode }, i) => `${i + 1}. ${displayTask(t)} / 선택: ${t.selections.map(label).join(' → ') || '선택 없음'} / ${outcome(t)} / ${inputMode === 'caregiver' ? '보호자가 관찰해 입력' : '직접 터치'} / ${t.helped ? '시범·도움 있음' : '시범·도움 표시 없음'}`), positionNote()].filter(Boolean).join('\n');
  }
  function finish() {
    if (phase !== 'playing' && phase !== 'paused') return;
    if (trial && (trial.selections.length || trial.skipped)) saveTrial(); else trial = null;
    screen('results');
    get('[data-results-summary]').textContent = `${activities.find((a) => a.id === activity)!.title} · ${observations.length}개 과제를 함께했어요.`;
    const rows = get('[data-results-rows]'); rows.replaceChildren();
    observations.forEach(({ trial: t, inputMode }, i) => {
      const row = document.createElement('tr');
      [String(i + 1), displayTask(t), t.selections.map(label).join(' → ') || '선택 없음', `${outcome(t)} · ${inputMode === 'caregiver' ? '보호자 입력' : '직접 터치'}${t.helped ? ' · 도움 있음' : ''}`].forEach((value) => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
      rows.append(row);
    });
    get('[data-position-note]').textContent = positionNote(); get('[data-copy-status]').textContent = '';
    get('[data-copy-fallback]').hidden = true; get('[data-results-title]').focus(); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  root.querySelectorAll<HTMLButtonElement>('[data-start-activity]').forEach((button) => button.addEventListener('click', () => start(button.dataset.startActivity as ActivityId)));
  ready.addEventListener('click', () => { if (phase !== 'playing' || !showingSequence) return; showingSequence = false; ready.hidden = true; prompt.textContent = '순서대로 눌러요'; setStimulus(); renderChoices(); });
  next.addEventListener('click', () => { if (phase !== 'playing' || !trial?.finished) return; saveTrial(); if (observations.length >= 5) finish(); else newTask(); });
  skip.addEventListener('click', () => { if (phase !== 'playing' || !trial || trial.finished) return; trial = skipTrial(trial); showingSequence = false; ready.hidden = true; setStimulus(); renderChoices(); next.disabled = false; skip.disabled = true; feedback.textContent = '괜찮아요. 쉬거나 다음으로 가요.'; });
  function pause() { if (phase !== 'playing') return; screen('paused'); get('[data-resume]').focus(); }
  get('[data-pause]').addEventListener('click', pause);
  get('[data-resume]').addEventListener('click', () => { if (phase !== 'paused') return; screen('playing'); prompt.focus({ preventScroll: true }); });
  root.querySelectorAll('[data-finish]').forEach((button) => button.addEventListener('click', finish));
  get('[data-restart]').addEventListener('click', () => start(activity));
  get('[data-back-home]').addEventListener('click', () => { screen('home'); root.querySelector<HTMLButtonElement>(`[data-start-activity="${activity}"]`)?.focus(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') pause(); });
  get('[data-copy-results]').addEventListener('click', async () => {
    const value = recordText();
    try { await navigator.clipboard.writeText(value); get('[data-copy-status]').textContent = '기록을 복사했어요. 개인 메모에 붙여 넣을 수 있습니다.'; }
    catch { const area = get<HTMLTextAreaElement>('[data-copy-fallback]'); area.value = value; area.hidden = false; area.focus(); area.select(); get('[data-copy-status]').textContent = '아래 기록을 길게 눌러 복사해 주세요.'; }
  });
}
