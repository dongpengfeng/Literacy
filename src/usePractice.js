
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import bank from '../characters.json';
import { selectRange, buildBalancedQuestions, buildReviewQuestions, pendingMistakes, summarize } from './quiz.js';
import { readAttempts, saveAttempts, readRange, saveRange } from './storage.js';
import { useAudio } from './useAudio.js';

export function usePractice() {
const entries = bank.map(x => x.char.trim());
const from = ref(1), to = ref(entries.length), expanded = ref(false);
const router = useRouter(), route = useRoute();
const page = computed(() => route.name);
const adultOpen = ref(false);
const attempts = ref([]), warning = ref('');
let storageReadable = true;
try { attempts.value = readAttempts(localStorage); } catch { storageReadable = false; warning.value = '无法读取历史记录，原数据不会被覆盖。请在离开前导出本次记录。'; }
try {
  const saved = readRange(localStorage, entries); from.value = saved.start; to.value = saved.end;
} catch { warning.value = '无法保存或读取练习范围，本次仍可正常练习。'; }
function refreshHistory() {
  if (!storageReadable) return;
  try { attempts.value = saveAttempts(localStorage, attempts.value); }
  catch { warning.value = '记录暂时无法保存，请在关闭或刷新前导出备份。'; }
}
const selection = computed(() => {
  try { return { ...selectRange(entries, from.value, to.value), error: '' }; }
  catch (error) { return { chars: [], error: error.message }; }
});
watch([from, to], () => {
  expanded.value = false;
  if (selection.value.error) return;
  try { saveRange(localStorage, entries, from.value, to.value); }
  catch { warning.value = '范围暂时无法保存，刷新后可能需要重新选择。'; }
});
const questions = ref([]), index = ref(0), selected = ref(null), roundId = ref(''), mode = ref('normal');
const current = computed(() => questions.value[index.value]);
const roundRecords = computed(() => attempts.value.filter(a => a.roundId === (route.name === 'result' ? route.params.roundId : roundId.value)));
const score = computed(() => roundRecords.value.filter(a => a.correct).length);
const missed = computed(() => roundRecords.value.filter(a => !a.correct));
const resultTotal = computed(() => roundRecords.value[0]?.totalQuestions || roundRecords.value.length);
const resultMode = computed(() => roundRecords.value[0]?.mode || 'normal');
const percent = computed(() => resultTotal.value ? Math.round(score.value / resultTotal.value * 100) : 0);
const pending = computed(() => pendingMistakes(attempts.value));
const mistakes = computed(() => summarize(attempts.value));
const wrong = computed(() => attempts.value.filter(a => !a.correct).length);
const accuracy = computed(() => attempts.value.length ? Math.round((attempts.value.length-wrong.value)/attempts.value.length*100)+'%' : '—');
const recent = computed(() => attempts.value.slice(-20).reverse());
const heading = ref(null), resultHeading = ref(null);
let shownAt = 0, roundRange = null;
const { status: speechStatus, play, stop, system } = useAudio();
function showQuestion() {
  selected.value = null; adultOpen.value = false; shownAt = performance.now();
  play(current.value.targetChar);
  nextTick(() => heading.value?.focus({ preventScroll: true }));
}
function begin(items, type) {
  if (page.value === 'quiz' || !items.length) return;
  questions.value = items; mode.value = type;
  roundId.value = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  index.value = 0;
  router.push('/quiz').then(() => nextTick(() => heading.value?.focus({ preventScroll: true })));
  showQuestion();
}
function start() {
  if (selection.value.error || page.value === 'quiz') return;
  refreshHistory();
  roundRange = { start: selection.value.start, end: selection.value.end };
  begin(buildBalancedQuestions(selection.value.chars, attempts.value), 'normal');
}
function retry(scope) {
  if (page.value === 'quiz') return;
  refreshHistory();
  const records = scope === 'round' ? missed.value : pending.value;
  begin(buildReviewQuestions(records), 'review');
}
function choose(char) {
  if (page.value !== 'quiz' || selected.value !== null || !current.value.options.includes(char)) return;
  selected.value = char;
  const q = current.value;
  attempts.value.push({
    roundId: roundId.value, questionNumber: index.value+1, totalQuestions: questions.value.length,
    mode: mode.value, range: mode.value === 'normal' ? { ...roundRange } : q.range,
    sourceRoundId: q.sourceRoundId || null, sourceQuestionNumber: q.sourceQuestionNumber || null,
    options: [...q.options], targetChar: q.targetChar, selectedChar: char, correct: char === q.targetChar,
    answeredAt: new Date().toISOString(), responseTimeMs: Math.round(performance.now()-shownAt)
  });
  refreshHistory();
}
function advance() {
  if (selected.value === null) return;
  if (index.value < questions.value.length-1) { index.value++; showQuestion(); }
  else { stop(); router.replace({ name: 'result', params: { roundId: roundId.value } }).then(() => nextTick(() => resultHeading.value?.focus({ preventScroll: true }))); }
}
function exportRecords() {
  const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), attempts: attempts.value, mistakeSummary: mistakes.value }, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `认字答题记录-${Date.now()}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

watch(() => route.fullPath, () => {
  if (route.name !== 'quiz') stop();
  if (route.name === 'quiz' && (!current.value || roundRecords.value.length === questions.value.length)) router.replace('/');
}, { immediate: true });

return { entries,from,to,expanded,page,mode,adultOpen,attempts,warning,selection,questions,index,selected,current,roundRecords,score,missed,percent,resultTotal,resultMode,pending,mistakes,wrong,accuracy,recent,heading,resultHeading,speechStatus,play,system,start,retry,choose,advance,exportRecords };
}
