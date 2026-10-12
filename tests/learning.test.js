import test from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING_KEY, readLearningPosition, saveLearningPosition, validPosition, learningText } from '../src/learning.js';

test('learning progress persists independently and invalid positions do not overwrite it', () => {
  const data = new Map([['literacy.range.v1', '{"start":5,"end":40}']]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.equal(readLearningPosition(storage, 1300), 1);
  saveLearningPosition(storage, 100, 1300);
  assert.equal(readLearningPosition(storage, 1300), 100);
  for (const invalid of ['', 0, -1, 2.5, 1301, 'abc']) {
    assert.equal(validPosition(invalid, 1300), false);
    saveLearningPosition(storage, invalid, 1300);
    assert.equal(readLearningPosition(storage, 1300), 100);
  }
  assert.equal(data.get('literacy.range.v1'), '{"start":5,"end":40}');
  data.set(LEARNING_KEY, 'broken');
  assert.equal(readLearningPosition(storage, 1300), 1);
  data.set(LEARNING_KEY, '1300');
  assert.equal(readLearningPosition(storage, 1300), 1300);
  assert.equal(readLearningPosition(storage, 500), 1);
});

test('learning cards accept text, arrays and missing words or sentences', () => {
  assert.deepEqual(learningText(' 一个 '), ['一个']);
  assert.deepEqual(learningText(['一个', '', null, ' 一天 ']), ['一个', '一天']);
  assert.deepEqual(learningText(undefined), []);
  assert.deepEqual(learningText(''), []);
});
