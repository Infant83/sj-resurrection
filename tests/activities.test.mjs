import assert from 'node:assert/strict';
import test from 'node:test';
import { activities, beginTrial, isCorrect, makeTask, selectChoice, skipTrial } from '../src/data/activities.ts';

function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}

test('all activities produce selectable answers at both difficulty settings', () => {
  const random = seeded(42);
  for (const activity of activities) for (const difficulty of ['easy', 'more']) {
    for (let i = 0; i < 100; i++) {
      const task = makeTask(activity.id, { difficulty, table: 'mixed' }, random);
      const values = task.choices.map((choice) => choice.value);
      assert.equal(new Set(values).size, values.length, 'duplicate answer buttons');
      assert.ok(task.answer.every((value) => values.includes(value)), 'answer missing from choices');
      assert.equal(task.choices.length, activity.id === 'target' ? 1 : activity.id === 'match' && difficulty === 'easy' ? 2 : 3);
      if (activity.id === 'count') assert.equal(Number(task.answer[0]), task.count);
      if (activity.id === 'sequence') assert.equal(task.answer.length, difficulty === 'easy' ? 2 : 3);
    }
  }
});

test('every multiplication table has exactly one valid answer and uses all answer positions', () => {
  const random = seeded(83);
  for (let table = 2; table <= 9; table++) {
    const positions = new Set(); const factors = new Set();
    for (let i = 0; i < 200; i++) {
      const task = makeTask('multiply', { difficulty: 'easy', table }, random);
      const [left, right] = task.display.split(' × ').map(Number);
      assert.equal(left, table); assert.ok(right >= 1 && right <= 9); factors.add(right);
      assert.equal(Number(task.answer[0]), left * right);
      assert.equal(task.choices.filter((c) => Number(c.value) === left * right).length, 1);
      positions.add(task.choices.findIndex((c) => c.value === task.answer[0]));
    }
    assert.equal(positions.size, 3, 'correct answer stuck in one screen position');
    assert.equal(factors.size, 9);
  }
});

test('a first answer locks a single-choice task, including a wrong answer', () => {
  const task = makeTask('count', { difficulty: 'easy', table: 2 }, seeded(5));
  const initial = beginTrial(task);
  assert.equal(selectChoice(initial, 'not-an-option'), initial);
  const wrong = task.choices.find((c) => c.value !== task.answer[0]).value;
  const selected = selectChoice(initial, wrong);
  assert.deepEqual(initial.selections, []);
  assert.ok(selected.finished); assert.equal(isCorrect(selected), false);
  assert.equal(selectChoice(selected, task.answer[0]), selected, 'later tap overwrote first choice');
  assert.equal(skipTrial(selected), selected);
});

test('sequence checks ordered choices only after the whole sequence; skip is never a correct answer', () => {
  const task = makeTask('sequence', { difficulty: 'more', table: 2 }, seeded(9));
  let trial = beginTrial(task);
  trial = selectChoice(trial, task.answer[0]);
  assert.equal(trial.finished, false); assert.equal(isCorrect(trial), false);
  const skipped = skipTrial(trial);
  assert.ok(skipped.finished && skipped.skipped); assert.equal(isCorrect(skipped), false);
  assert.equal(selectChoice(skipped, task.answer[1]), skipped);
  trial = selectChoice(trial, task.answer[1]);
  trial = selectChoice(trial, task.answer[2]);
  assert.equal(isCorrect(trial), true);
  assert.equal(selectChoice(trial, task.answer[0]), trial);
  const reversed = [...task.answer].reverse().reduce(selectChoice, beginTrial(task));
  assert.equal(isCorrect(reversed), false);
});
