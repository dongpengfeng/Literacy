"use strict";

const STORAGE_KEY = "literacy.attempts.v1";
const $ = (id) => document.getElementById(id);
let characters = [];
let bankEntries = [];
let selectedRange = null;
let roundRange = null;
let attempts = [];
let questions = [];
let questionIndex = 0;
let roundId = "";
let answered = false;
let shownAt = 0;
let storageReadable = true;
let activeSpeech = null;
let roundMode = "normal";
let sourceRoundId = null;
let inProgress = false;

function storageWarning(message) {
  $("storage-warning").textContent = message;
  $("storage-warning").hidden = false;
}

function isAttempt(a) {
  return a && typeof a.roundId === "string" && Number.isInteger(a.questionNumber)
    && typeof a.targetChar === "string" && typeof a.selectedChar === "string"
    && Array.isArray(a.options) && a.options.every((c) => typeof c === "string")
    && a.options.includes(a.targetChar) && a.options.includes(a.selectedChar)
    && typeof a.correct === "boolean" && a.correct === (a.targetChar === a.selectedChar)
    && typeof a.answeredAt === "string" && Number.isFinite(Date.parse(a.answeredAt))
    && Number.isFinite(a.responseTimeMs) && a.responseTimeMs >= 0;
}

function loadAttempts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(saved) || !saved.every(isAttempt)) throw new Error("Invalid saved records");
    attempts = saved;
  } catch {
    storageReadable = false;
    storageWarning("无法读取本地历史记录，原有数据不会被覆盖。本次仍可练习，请在离开页面前导出记录。");
  }
}

function saveAttempts() {
  if (!storageReadable) return;
  try {
    // Merge other tabs' records before saving so separate rounds are preserved.
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(saved) || !saved.every(isAttempt)) throw new Error("Invalid saved records");
    const merged = new Map();
    for (const a of [...saved, ...attempts]) merged.set(`${a.roundId}:${a.questionNumber}`, a);
    attempts = [...merged.values()].sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    storageWarning("答题记录暂时无法保存到浏览器。本页仍保留本次记录，请在关闭或刷新前导出 JSON 备份。");
  }
}

function parseCharacters(data) {
  if (!Array.isArray(data)) throw new Error("字库必须是 JSON 数组。");
  const chars = data.map((item, i) => {
    if (!item || typeof item.char !== "string" || !/^\p{Script=Han}$/u.test(item.char.trim())) {
      throw new Error(`第 ${i + 1} 项的 char 必须是一个汉字。`);
    }
    return item.char.trim();
  });
  const unique = [...new Set(chars)];
  if (unique.length < 4) throw new Error("至少需要 4 个不同的汉字，才能生成四选一题目。");
  return unique;
}

function setBank(data) {
  const unique = parseCharacters(data);
  bankEntries = data.map((item) => item.char.trim());
  $("bank-status").textContent = `字库已就绪 · ${bankEntries.length} 条字卡 · ${unique.length} 个不同汉字`;
  for (const id of ["range-start", "range-end"]) $(id).max = bankEntries.length;
  $("range-start").value = 1;
  $("range-end").value = bankEntries.length;
  $("range-controls").disabled = inProgress;
  updateRange();
}

function setRangePreviewExpanded(expanded) {
  $("range-preview-toggle").setAttribute("aria-expanded", String(expanded));
  $("range-preview-action").textContent = expanded ? "收起" : "展开";
}

function selectRange(entries, from, to) {
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

function updateRange() {
  try {
    const range = selectRange(bankEntries, $("range-start").value, $("range-end").value);
    characters = range.chars;
    selectedRange = { start: range.start, end: range.end };
    $("range-status").textContent = `已选第 ${range.start}～${range.end} 个 · ${range.end - range.start + 1} 条字卡 · ${characters.length} 个不同汉字 · 每轮 ${Math.min(10, characters.length)} 题${inProgress ? "（下一轮生效）" : ""}`;
    $("range-status").className = "hint";
    $("range-preview-toggle").hidden = false;
    setRangePreviewExpanded(false);
    $("range-preview").textContent = `范围预览：${characters.join("　")}`;
    $("round-size").textContent = `✦ 每轮 ${Math.min(10, characters.length)} 题`;
    $("start").disabled = false;
    $("again").disabled = false;
    return true;
  } catch (error) {
    characters = [];
    selectedRange = null;
    $("range-status").textContent = error.message;
    $("range-status").className = "hint range-error";
    $("range-preview").textContent = "";
    $("range-preview-toggle").hidden = true;
    setRangePreviewExpanded(false);
    $("round-size").textContent = "✦ 请先选择有效范围";
    $("start").disabled = true;
    $("again").disabled = true;
    return false;
  }
}

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildQuestions(bank, targets = shuffle(bank).slice(0, 10)) {
  const pool = [...new Set([...bank, ...targets])];
  if (pool.length < 4) return [];
  return [...new Set(targets)].map((targetChar) => ({
    targetChar,
    options: shuffle([targetChar, ...shuffle(pool.filter((c) => c !== targetChar)).slice(0, 3)])
  }));
}

// A correct subsequent answer resolves a pending mistake without deleting history.
function pendingMistakes() {
  const latest = new Map();
  for (const a of attempts) latest.set(a.targetChar, a);
  return [...latest.values()].filter((a) => !a.correct).map((a) => a.targetChar);
}

function retryMistakes(scope) {
  if (inProgress) return;
  const targets = scope === "round"
    ? [...new Set(roundAttempts().filter((a) => !a.correct).map((a) => a.targetChar))]
    : pendingMistakes();
  if (!targets.length) return;
  // Prior options allow review even after the original characters leave the bank.
  const pool = [...new Set([...bankEntries, ...attempts.flatMap((a) => a.options)])];
  startRound("review", shuffle(targets).slice(0, 10), pool, scope === "round" ? roundId : null);
}

let audioRequest = 0;
let speechTimer;
const pronunciation = $("pronunciation");

function stopSpeech() {
  audioRequest++;
  clearTimeout(speechTimer);
  pronunciation.pause();
  activeSpeech = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function speak() {
  stopSpeech();
  const clip = window.LITERACY_AUDIO?.[questions[questionIndex].targetChar];
  if (!clip) {
    $("speech-status").textContent = "读音文件未加载，请刷新页面或点击“备用系统朗读”。";
    return;
  }
  const request = audioRequest;
  pronunciation.src = `data:audio/mpeg;base64,${clip}`;
  $("speech-status").textContent = "正在加载读音…";
  // Call play directly in the click stack; do not wait for canplay or a fetch.
  const result = pronunciation.play();
  if (result) result.catch((error) => {
    if (request !== audioRequest) return;
    $("speech-status").textContent = error.name === "NotAllowedError"
      ? "播放被浏览器暂停，请再点一次“听一听”。"
      : "音频未能播放，请点“听一听”重试，或使用备用系统朗读。";
  });
}

pronunciation.addEventListener("playing", () => {
  $("speech-status").textContent = "正在读题…";
});
pronunciation.addEventListener("ended", () => {
  $("speech-status").textContent = "没听清？再点一次“听一听”。";
});
pronunciation.addEventListener("error", () => {
  $("speech-status").textContent = "音频加载失败，请刷新页面，或点击“备用系统朗读”。";
});

function speakWithSystem() {
  stopSpeech();
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    $("speech-status").textContent = "当前浏览器不支持朗读，请展开“家长辅助读题”，由家长读出汉字。";
    return;
  }
  const utterance = new SpeechSynthesisUtterance(questions[questionIndex].targetChar);
  activeSpeech = utterance;
  utterance.lang = "zh-CN";
  utterance.rate = 0.7;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => /^zh[-_]CN$/i.test(v.lang)) || voices.find((v) => /^zh/i.test(v.lang));
  if (voice) utterance.voice = voice;
  $("speech-status").textContent = "正在读题…";
  utterance.onend = () => {
    if (activeSpeech === utterance) { clearTimeout(speechTimer); $("speech-status").textContent = "朗读结束，可点“听一听”播放录制读音。"; }
  };
  utterance.onerror = () => {
    if (activeSpeech === utterance) { clearTimeout(speechTimer); $("speech-status").textContent = "朗读未成功，请再试一次，或请家长展开下方辅助读题。"; }
  };
  utterance.onstart = () => { if (activeSpeech === utterance) clearTimeout(speechTimer); };
  speechTimer = setTimeout(() => {
    if (activeSpeech === utterance) $("speech-status").textContent = "系统朗读未响应，请点击“听一听”播放读音。";
  }, 4000);
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(utterance);
}

function startRound(mode = "normal", targets, bank = characters, source = null) {
  if (mode === "normal") {
    if (!updateRange()) return;
    bank = characters;
  }
  if (inProgress || bank.length < 4) return;
  questions = buildQuestions(bank, targets);
  if (!questions.length) return;
  roundMode = mode;
  sourceRoundId = source;
  inProgress = true;
  roundRange = mode === "normal" ? { ...selectedRange } : null;
  $("range-controls").disabled = true;
  $("progress").max = questions.length;
  roundId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  questionIndex = 0;
  $("welcome").hidden = true;
  $("result").hidden = true;
  $("quiz").hidden = false;
  $("parent-panel").open = false;
  renderStats();
  showQuestion();
}

function roundAttempts() { return attempts.filter((a) => a.roundId === roundId); }

function showQuestion() {
  answered = false;
  $("question-count").textContent = `${roundMode === "review" ? "错题重答 · " : ""}第 ${questionIndex + 1} / ${questions.length} 题`;
  $("score-count").textContent = `已答对 ${roundAttempts().filter((a) => a.correct).length} 题`;
  $("progress").value = questionIndex;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("next").hidden = true;
  $("adult-char").textContent = questions[questionIndex].targetChar;
  document.querySelector(".adult").open = false;
  $("options").replaceChildren();
  for (const char of questions[questionIndex].options) {
    const button = document.createElement("button");
    button.className = "option";
    button.textContent = char;
    button.setAttribute("aria-label", `选择 ${char}`);
    button.addEventListener("click", () => choose(char));
    $("options").append(button);
  }
  shownAt = performance.now();
  $("quiz-title").focus({ preventScroll: true });
  speak();
}

function choose(selectedChar) {
  if (answered) return;
  answered = true;
  const q = questions[questionIndex];
  const correct = selectedChar === q.targetChar;
  attempts.push({
    mode: roundMode, totalQuestions: questions.length, sourceRoundId, range: roundRange,
    roundId, questionNumber: questionIndex + 1, options: [...q.options],
    targetChar: q.targetChar, selectedChar, correct,
    answeredAt: new Date().toISOString(), responseTimeMs: Math.round(performance.now() - shownAt)
  });
  saveAttempts();
  for (const button of $("options").children) {
    const char = button.textContent;
    button.disabled = true;
    if (char === q.targetChar || char === selectedChar) {
      button.classList.add(char === q.targetChar ? "correct" : "wrong");
      const label = document.createElement("small");
      label.textContent = char === q.targetChar ? "✓ 正确答案" : "再认一认";
      button.append(label);
    }
  }
  $("progress").value = questionIndex + 1;
  $("score-count").textContent = `已答对 ${roundAttempts().filter((a) => a.correct).length} 题`;
  $("feedback").className = `feedback ${correct ? "success" : "retry"}`;
  $("feedback").textContent = correct ? "答对啦！小耳朵听得真仔细。" : `这次听到的是“${q.targetChar}”，一起记住它吧。`;
  $("next").textContent = questionIndex === questions.length - 1 ? "看看我的收获 →" : "下一题 →";
  $("next").hidden = false;
  renderStats();
}

function nextQuestion() {
  if (!answered) return;
  if (questionIndex < questions.length - 1) { questionIndex++; showQuestion(); return; }
  stopSpeech();
  inProgress = false;
  $("range-controls").disabled = !bankEntries.length;
  $("quiz").hidden = true;
  $("result").hidden = false;
  const records = roundAttempts();
  const score = records.filter((a) => a.correct).length;
  const missed = [...new Set(records.filter((a) => !a.correct).map((a) => a.targetChar))];
  $("result-score").textContent = `${score} / ${questions.length} 题答对`;
  $("result-message").textContent = score === questions.length ? "每个字都找对啦，给自己一个大大的拥抱！" : "认真完成就是进步，再和这些字交一次朋友吧。";
  $("round-mistakes").textContent = missed.length ? `这一轮再认一认：${missed.join("　")}` : "这一轮没有错题，真棒！";
  $("result-title").textContent = roundMode === "review" ? "复习完成！" : "挑战完成！";
  $("retry-round").hidden = !missed.length;
  $("retry-round").textContent = `再练本轮错题（${missed.length} 字）`;
  renderRoundChart(records);
  renderStats();
  $("result-title").focus({ preventScroll: true });
}

function renderRoundChart(records) {
  const correct = records.filter((a) => a.correct).length;
  const percent = records.length ? Math.round(correct / records.length * 100) : 0;
  $("accuracy-ring").style.setProperty("--percent", `${percent}%`);
  $("accuracy-ring").setAttribute("aria-label", `本轮正确率 ${percent}%，答对 ${correct} 题，答错 ${records.length - correct} 题`);
  $("accuracy-value").textContent = `${percent}%`;
  $("chart-legend").textContent = `✓ 答对 ${correct} 题　 ·　再认认 ${records.length - correct} 题`;
  $("answer-grid").replaceChildren();
  for (const a of records) {
    const card = document.createElement("div");
    card.className = `answer-card ${a.correct ? "right" : "missed"}`;
    const number = document.createElement("span"); number.textContent = `第 ${a.questionNumber} 题`;
    const char = document.createElement("strong"); char.textContent = a.targetChar;
    const caption = document.createElement("span"); caption.textContent = a.correct ? "✓ 答对了" : `错选：${a.selectedChar}`;
    card.append(number, char, caption);
    $("answer-grid").append(card);
  }
}

function renderMistakeChart(mistakes) {
  $("mistake-chart").replaceChildren();
  for (const s of mistakes.slice(0, 8)) {
    const row = document.createElement("div"); row.className = "bar-row";
    const char = document.createElement("strong"); char.textContent = s.char;
    const track = document.createElement("div"); track.className = "bar-track"; track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("div"); fill.className = "bar-fill";
    fill.style.width = `${s.wrong / s.total * 100}%`; track.append(fill);
    const label = document.createElement("span"); label.textContent = `${s.wrong}/${s.total} 次 · ${Math.round(s.wrong / s.total * 100)}%`;
    row.append(char, track, label); $("mistake-chart").append(row);
  }
  if (!mistakes.length) $("mistake-chart").textContent = "还没有错题，完成练习后在这里看看进步吧。";
}

function summarize(records) {
  const summary = new Map();
  for (const a of records) {
    const s = summary.get(a.targetChar) || { char: a.targetChar, total: 0, wrong: 0, lastWrongChoice: "" };
    s.total++;
    if (!a.correct) { s.wrong++; s.lastWrongChoice = a.selectedChar; }
    summary.set(a.targetChar, s);
  }
  return [...summary.values()].filter((s) => s.wrong).sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total);
}

function appendRow(body, cells) {
  const row = document.createElement("tr");
  for (const value of cells) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }
  body.append(row);
}

function renderStats() {
  const wrong = attempts.filter((a) => !a.correct).length;
  const accuracy = attempts.length ? `${Math.round((attempts.length - wrong) / attempts.length * 100)}%` : "—";
  $("stats").replaceChildren();
  for (const [value, label] of [[attempts.length, "累计作答"], [wrong, "答错次数"], [accuracy, "正确率"]]) {
    const item = document.createElement("div"); item.className = "stat";
    const count = document.createElement("b"); count.textContent = value;
    const caption = document.createElement("span"); caption.textContent = label;
    item.append(count, caption); $("stats").append(item);
  }
  $("mistakes").replaceChildren();
  const mistakes = summarize(attempts);
  renderMistakeChart(mistakes);
  const pending = pendingMistakes();
  $("retry-history").disabled = !pending.length || inProgress;
  $("retry-history").textContent = `练习待巩固错题（${pending.length} 字）`;
  $("pending-status").textContent = inProgress ? "先完成当前练习，再来复习错题。" : pending.length
    ? `还有 ${pending.length} 个字最近一次答错了，每轮最多复习 10 个不同汉字。`
    : attempts.length ? "目前没有待巩固的错题，继续保持！" : "答错的字会自动加入这里，之后答对就移出待巩固列表。";
  for (const s of mistakes) appendRow($("mistakes"), [s.char, s.total, s.wrong, `${Math.round(s.wrong / s.total * 100)}%`, s.lastWrongChoice]);
  if (!mistakes.length) appendRow($("mistakes"), ["还没有错题记录"]);
  $("history").replaceChildren();
  for (const a of attempts.slice(-20).reverse()) appendRow($("history"), [new Date(a.answeredAt).toLocaleString("zh-CN", { hour12: false }), `${a.mode === "review" ? "复习 " : ""}${a.questionNumber}/${a.totalQuestions || 10}`, a.targetChar, a.selectedChar, a.correct ? "✓ 答对" : "再认一认"]);
  if (!attempts.length) appendRow($("history"), ["完成第一道题，就会出现记录。"]);
}

function exportRecords() {
  const payload = { schemaVersion: 1, exportedAt: new Date().toISOString(), attempts, mistakeSummary: summarize(attempts) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `认字答题记录-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("range-preview-toggle").addEventListener("click", () => {
  setRangePreviewExpanded($("range-preview-toggle").getAttribute("aria-expanded") !== "true");
});
$("start").addEventListener("click", () => startRound());
for (const id of ["range-start", "range-end"]) $(id).addEventListener("input", updateRange);
$("range-all").addEventListener("click", () => {
  $("range-start").value = 1;
  $("range-end").value = bankEntries.length;
  updateRange();
});
$("again").addEventListener("click", () => startRound());
$("retry-round").addEventListener("click", () => retryMistakes("round"));
$("retry-history").addEventListener("click", () => retryMistakes("history"));
$("listen").addEventListener("click", speak);
$("system-speech").addEventListener("click", speakWithSystem);
$("next").addEventListener("click", nextQuestion);
$("export").addEventListener("click", exportRecords);
window.addEventListener("pagehide", stopSpeech);
loadAttempts();
renderStats();
try {
  setBank(JSON.parse($("default-characters").textContent));
} catch (error) {
  $("bank-status").textContent = `内置字库加载失败：${error.message}，请检查页面文件是否完整。`;
}
