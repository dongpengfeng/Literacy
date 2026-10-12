export function selectRange(entries, from, to) {
  const start = Number(from), end = Number(to);
  if (!String(from).trim() || !String(to).trim() || !Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error("请输入起止位置，两个位置都需要是整数。");
  }
  if (start < 1 || end > entries.length || start > end) {
    throw new Error(`请选择第 1～${entries.length} 个之间的范围，起点不能大于终点。`);
  }
  // Slice before deduplicating so positions match the original JSON exactly.
  const chars = [...new Set(entries.slice(start - 1, end))];
  if (chars.length < 4) throw new Error("所选范围至少需要 4 个不同汉字，才能生成四选一题目。");
  return { start, end, chars };
}

export function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function isAttempt(a) {
  return a && typeof a.roundId === "string" && Number.isInteger(a.questionNumber)
    && typeof a.targetChar === "string" && typeof a.selectedChar === "string"
    && Array.isArray(a.options) && a.options.every((c) => typeof c === "string")
    && a.options.includes(a.targetChar) && a.options.includes(a.selectedChar)
    && typeof a.correct === "boolean" && a.correct === (a.targetChar === a.selectedChar)
    && typeof a.answeredAt === "string" && Number.isFinite(Date.parse(a.answeredAt))
    && Number.isFinite(a.responseTimeMs) && a.responseTimeMs >= 0;
}

export function summarize(records) {
  const summary = new Map();
  for (const a of records) {
    const s = summary.get(a.targetChar) || { char: a.targetChar, total: 0, wrong: 0, lastWrongChoice: "" };
    s.total++;
    if (!a.correct) { s.wrong++; s.lastWrongChoice = a.selectedChar; }
    summary.set(a.targetChar, s);
  }
  return [...summary.values()].filter((s) => s.wrong).sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total);
}

// Count normal answered questions across sessions; reviews do not skew coverage.
export function buildBalancedQuestions(bank, attempts) {
  const pool = [...new Set(bank)];
  if (pool.length < 4) return [];
  const counts = new Map(pool.map(c => [c, 0]));
  for (const a of attempts) {
    if (a.mode !== 'review' && counts.has(a.targetChar)) counts.set(a.targetChar, counts.get(a.targetChar) + 1);
  }
  const targets = shuffle(pool).sort((a, b) => counts.get(a) - counts.get(b)).slice(0, 10);
  return targets.map(targetChar => ({ targetChar, options: shuffle([targetChar, ...shuffle(pool.filter(c => c !== targetChar)).slice(0, 3)]) }));
}

export function pendingMistakes(attempts) {
  const latest = new Map();
  for (const a of attempts) latest.set(a.targetChar, a);
  return [...latest.values()].filter(a => !a.correct);
}

export function buildReviewQuestions(records) {
  return shuffle(records).slice(0, 10).map(a => ({
    targetChar: a.targetChar, options: [...a.options],
    sourceRoundId: a.roundId, sourceQuestionNumber: a.questionNumber,
    range: a.range ? { ...a.range } : null
  }));
}
