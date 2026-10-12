export const STORAGE_KEY = 'literacy.attempts.v1';
import { isAttempt, selectRange } from './quiz.js';
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

export const RANGE_KEY = 'literacy.range.v1';
export function readRange(storage, entries) {
  const fallback = { start: 1, end: entries.length };
  const raw = storage.getItem(RANGE_KEY);
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    const { start, end } = selectRange(entries, value.start, value.end);
    return { start, end };
  } catch { return fallback; }
}
export function saveRange(storage, entries, start, end) {
  const range = selectRange(entries, start, end);
  storage.setItem(RANGE_KEY, JSON.stringify({ start: range.start, end: range.end }));
}
