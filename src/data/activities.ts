export const activities = [
  { id: 'target', stage: 1, title: '큰 동그라미', description: '표적 하나를 보고 천천히 눌러요.', focus: '화면에 주의 기울이기', symbol: '●' },
  { id: 'match', stage: 2, title: '같은 모양', description: '위와 같은 모양을 골라요.', focus: '두 모양 비교하기', symbol: '● ○' },
  { id: 'count', stage: 3, title: '개수 고르기', description: '동그라미가 몇 개인지 골라요.', focus: '작은 수와 개수 연결하기', symbol: '1 2 3' },
  { id: 'multiply', stage: 4, title: '구구단', description: '큰 보기 세 개 중 답을 골라요.', focus: '익숙한 계산 시도하기', symbol: '2 × 3' },
  { id: 'sequence', stage: 5, title: '짧은 순서', description: '모양을 기억하고 순서대로 눌러요.', focus: '짧은 순서 유지하기', symbol: '● → ■' },
] as const;
export type ActivityId = (typeof activities)[number]['id'];
export type Difficulty = 'easy' | 'more';
export type ActivityOptions = { difficulty: Difficulty; table: number | 'mixed' };
export type Choice = { value: string; label: string; symbol?: string };
export type Task = { activity: ActivityId; prompt: string; display: string; choices: Choice[]; answer: string[]; count?: number; sequence?: string[] };
export const shapes = [
  { value: 'circle', label: '동그라미', symbol: '●' },
  { value: 'square', label: '네모', symbol: '■' },
  { value: 'triangle', label: '세모', symbol: '▲' },
] as const;
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeTask(activity: ActivityId, options: ActivityOptions, random = Math.random): Task {
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const numberChoices = (answer: number, pool: number[]) => shuffle(
    [answer, ...shuffle(pool.filter((n) => n !== answer), random).slice(0, 2)], random,
  ).map((n) => ({ value: String(n), label: String(n) }));
  if (activity === 'target') return { activity, prompt: '동그라미를 눌러요', display: '', choices: [{ ...shapes[0] }], answer: ['circle'] };
  if (activity === 'match') {
    const answer = pick(shapes);
    const count = options.difficulty === 'easy' ? 2 : 3;
    return { activity, prompt: '같은 모양을 골라요', display: answer.symbol, choices: shuffle([answer, ...shuffle(shapes.filter((s) => s.value !== answer.value), random).slice(0, count - 1)], random), answer: [answer.value] };
  }
  if (activity === 'count') {
    const pool = options.difficulty === 'easy' ? [1, 2, 3] : [1, 2, 3, 4, 5];
    const answer = pick(pool);
    return { activity, prompt: '동그라미는 몇 개일까요?', display: '', count: answer, choices: numberChoices(answer, pool), answer: [String(answer)] };
  }
  if (activity === 'multiply') {
    const table = options.table === 'mixed' ? pick([2, 3, 4, 5, 6, 7, 8, 9]) : options.table;
    if (!Number.isInteger(table) || table < 2 || table > 9) throw new Error('Invalid multiplication table');
    const factor = pick([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const answer = table * factor;
    const pool = [...new Set([answer - table, answer + table, answer - 1, answer + 1, answer + 2].filter((n) => n > 0 && n <= 90))];
    return { activity, prompt: '답을 골라요', display: `${table} × ${factor}`, choices: numberChoices(answer, pool), answer: [String(answer)] };
  }
  const count = options.difficulty === 'easy' ? 2 : 3;
  const sequence = shuffle(shapes, random).slice(0, count);
  return { activity, prompt: '모양의 순서를 기억해요', display: '', sequence: sequence.map((s) => s.symbol), choices: shuffle(shapes, random), answer: sequence.map((s) => s.value) };
}

export type Trial = { task: Task; selections: string[]; finished: boolean; skipped: boolean; helped: boolean };
export function beginTrial(task: Task): Trial { return { task, selections: [], finished: false, skipped: false, helped: false }; }
export function selectChoice(trial: Trial, value: string): Trial {
  if (trial.finished || !trial.task.choices.some((c) => c.value === value)) return trial;
  const selections = [...trial.selections, value];
  return { ...trial, selections, finished: selections.length === trial.task.answer.length };
}
export function skipTrial(trial: Trial): Trial { return trial.finished ? trial : { ...trial, skipped: true, finished: true }; }
export function isCorrect(trial: Trial): boolean {
  return trial.finished && !trial.skipped && trial.selections.length === trial.task.answer.length && trial.selections.every((value, i) => value === trial.task.answer[i]);
}
