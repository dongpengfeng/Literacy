export const STORAGE_KEY = 'literacy.attempts.v1';
import { isAttempt } from './quiz.js';
export function readAttempts(storage) {
  const value = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
  if (!Array.isArray(value) || !value.every(isAttempt)) throw new Error('答题记录无法读取');
  return value;
}
export function saveAttempts(storage, attempts) {
  const merged = new Map();
  for (const a of [...readAttempts(storage), ...attempts]) merged.set(`${a.roundId}:${a.questionNumber}`, a);
  const result = [...merged.values()].sort((a,b) => Date.parse(a.answeredAt)-Date.parse(b.answeredAt));
  storage.setItem(STORAGE_KEY, JSON.stringify(result));
  return result;
}
