export const LEARNING_KEY = 'literacy.learning.v1';

export function validPosition(value, total) {
  const position = Number(value);
  return Number.isInteger(position) && position >= 1 && position <= total;
}

export function readLearningPosition(storage, total) {
  const value = storage.getItem(LEARNING_KEY);
  return validPosition(value, total) ? Number(value) : 1;
}

export function saveLearningPosition(storage, position, total) {
  if (!validPosition(position, total)) return;
  storage.setItem(LEARNING_KEY, String(Number(position)));
}

export function learningText(value) {
  return (Array.isArray(value) ? value : [value])
    .filter(item => typeof item === 'string' && item.trim())
    .map(item => item.trim());
}
