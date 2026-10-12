<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import bank from '../characters.json';
import { selectRange, buildBalancedQuestions, buildReviewQuestions, pendingMistakes, summarize } from './quiz.js';
import { readAttempts, saveAttempts } from './storage.js';
import { useAudio } from './useAudio.js';
const entries = bank.map(x => x.char.trim());
const from = ref(1), to = ref(entries.length), expanded = ref(false);
const page = ref('welcome'), parentOpen = ref(false), adultOpen = ref(false);
const attempts = ref([]), warning = ref('');
let storageReadable = true;
try { attempts.value = readAttempts(localStorage); } catch { storageReadable = false; warning.value = '无法读取历史记录，原数据不会被覆盖。请在离开前导出本次记录。'; }
function refreshHistory() {
  if (!storageReadable) return;
  try { attempts.value = saveAttempts(localStorage, attempts.value); }
  catch { warning.value = '记录暂时无法保存，请在关闭或刷新前导出备份。'; }
}
const selection = computed(() => {
  try { return { ...selectRange(entries, from.value, to.value), error: '' }; }
  catch (error) { return { chars: [], error: error.message }; }
});
watch([from, to], () => { expanded.value = false; });
const questions = ref([]), index = ref(0), selected = ref(null), roundId = ref(''), mode = ref('normal');
const current = computed(() => questions.value[index.value]);
const roundRecords = computed(() => attempts.value.filter(a => a.roundId === roundId.value));
const score = computed(() => roundRecords.value.filter(a => a.correct).length);
const missed = computed(() => roundRecords.value.filter(a => !a.correct));
const percent = computed(() => questions.value.length ? Math.round(score.value / questions.value.length * 100) : 0);
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
  index.value = 0; page.value = 'quiz'; parentOpen.value = false; showQuestion();
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
  else { stop(); page.value = 'result'; nextTick(() => resultHeading.value?.focus({ preventScroll: true })); }
}
function exportRecords() {
  const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), attempts: attempts.value, mistakeSummary: mistakes.value }, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `认字答题记录-${Date.now()}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <header class="topbar"><a class="brand" href="./"><span class="brand-icon">字</span> 小小识字岛</a><span class="tag">每天认识一点点</span></header>
  <main>
    <div v-if="warning" class="notice" role="alert">{{ warning }}</div>
    <section class="range-panel" aria-labelledby="range-title">
      <h2 id="range-title">今天练哪些字？</h2>
      <fieldset :disabled="page === 'quiz'">
        <legend class="hint">内置 {{ entries.length }} 张字卡，按顺序选择，包含起止位置，从第 1 个开始计数。</legend>
        <div class="range-inputs">
          <label>从第 <input v-model="from" type="number" min="1" :max="entries.length" step="1" aria-label="开始位置" aria-describedby="range-status"> 个</label><span>—</span>
          <label>到第 <input v-model="to" type="number" min="1" :max="entries.length" step="1" aria-label="结束位置" aria-describedby="range-status"> 个</label>
          <button class="secondary" @click="from=1;to=entries.length">全部字</button>
        </div>
      </fieldset>
      <p id="range-status" class="hint" :class="{ 'range-error': selection.error }" role="status">{{ selection.error || `已选第 ${selection.start}～${selection.end} 个 · ${selection.end-selection.start+1} 条字卡 · ${selection.chars.length} 个不同汉字 · 每轮 ${Math.min(10,selection.chars.length)} 题` }}</p>
      <button v-if="!selection.error" class="range-preview-toggle" :aria-expanded="expanded" aria-controls="range-preview" @click="expanded=!expanded"><span id="range-preview" class="range-preview">范围预览：{{ selection.chars.join('　') }}</span><span class="range-preview-action">{{ expanded ? '收起' : '展开' }}</span></button>
    </section>
    <section v-if="page === 'welcome'" class="panel welcome">
      <div class="eyebrow">小耳朵，准备好了吗？</div><h1>听一听，<span>认一认。</span></h1>
      <p class="subtitle">听到一个字，找到它。<br>一起完成今天的认字小挑战！</p>
      <div class="sample-tiles" aria-hidden="true"><span>山</span><span>月</span><span>水</span></div>
      <div class="pills"><span>♫ 听音选字</span><span>✦ 均衡练习</span><span>✓ 自动记录</span></div>
      <p class="muted">优先练习出题次数少的字，每一轮都有新收获。</p>
      <button class="primary" :disabled="!!selection.error" @click="start">开始认字 →</button><p class="hint">记得打开声音哦。小朋友可以请大人一起帮忙。</p>
    </section>
    <section v-if="page === 'quiz'" class="panel quiz" aria-labelledby="quiz-title">
      <div class="quiz-top"><span>{{ mode === 'review' ? '错题重答 · ' : '' }}第 {{ index+1 }} / {{ questions.length }} 题</span><span>已答对 {{ score }} 题</span></div>
      <progress :max="questions.length" :value="index + (selected !== null ? 1 : 0)" aria-label="已完成题数"></progress>
      <h1 id="quiz-title" ref="heading" tabindex="-1">哪个字在说话？</h1><p class="muted">点小喇叭听一听，再选出你听到的字。</p>
      <button class="listen" @click="play(current.targetChar)"><span aria-hidden="true">♫</span> 听一听</button>
      <p class="hint" role="status">{{ speechStatus }}</p><button id="system-speech" class="secondary" @click="system(current.targetChar)">备用系统朗读</button>
      <p class="hint">没声音时再点“听一听”，检查媒体音量和蓝牙输出。</p>
      <details class="adult" :open="adultOpen" @toggle="adultOpen=$event.target.open"><summary>家长辅助读题</summary><p>请读出这个字：<strong>{{ current.targetChar }}</strong></p></details>
      <div class="options" aria-label="汉字选项"><button v-for="char in current.options" :key="char" class="option" :aria-label="`选择 ${char}`" :disabled="selected !== null" :class="{correct:selected !== null && char === current.targetChar,wrong:selected === char && char !== current.targetChar}" @click="choose(char)">{{ char }}<small v-if="selected !== null && (char === current.targetChar || char === selected)">{{ char === current.targetChar ? '✓ 正确答案' : '再认一认' }}</small></button></div>
      <div class="feedback" :class="selected === current.targetChar ? 'success' : 'retry'" role="status">{{ selected === null ? '' : selected === current.targetChar ? '答对啦！小耳朵听得真仔细。' : `这次听到的是“${current.targetChar}”，一起记住它吧。` }}</div>
      <button v-if="selected !== null" class="primary" @click="advance">{{ index === questions.length-1 ? '看看我的收获 →' : '下一题 →' }}</button>
    </section>
    <section v-if="page === 'result'" class="panel result" aria-labelledby="result-title">
      <div class="eyebrow">今天也有新收获</div><h1 id="result-title" ref="resultHeading" tabindex="-1">{{ mode === 'review' ? '复习完成！' : '挑战完成！' }}</h1>
      <div class="accuracy-ring" role="img" :aria-label="`本轮正确率 ${percent}%`" :style="{'--percent':percent+'%'}"><div><strong>{{ percent }}%</strong><span>本轮正确率</span></div></div>
      <p class="chart-legend">✓ 答对 {{ score }} 题 · 再认认 {{ missed.length }} 题</p><p class="result-score">{{ score }} / {{ questions.length }} 题答对</p>
      <p class="muted">{{ missed.length ? '认真完成就是进步，再和这些字交一次朋友吧。' : '每个字都找对啦，给自己一个大大的拥抱！' }}</p>
      <div class="round-mistakes">{{ missed.length ? `这一轮再认一认：${missed.map(a=>a.targetChar).join('　')}` : '这一轮没有错题，真棒！' }}</div>
      <h2>这一轮的小足迹</h2><div class="answer-grid"><div v-for="a in roundRecords" :key="a.questionNumber" class="answer-card" :class="a.correct ? 'right' : 'missed'"><span>第 {{ a.questionNumber }} 题</span><strong>{{ a.targetChar }}</strong><span>{{ a.correct ? '✓ 答对了' : `错选：${a.selectedChar}` }}</span></div></div>
      <div class="result-actions"><button v-if="missed.length" class="primary" @click="retry('round')">再练本轮错题（{{ missed.length }} 字）</button><button class="secondary" :disabled="!!selection.error" @click="start">开始新一轮 →</button></div>
    </section>
    <details class="parent-panel" :open="parentOpen" @toggle="parentOpen=$event.target.open"><summary>家长小角落 <span>答题记录 · 错题统计</span></summary><div class="parent-content">
      <h2>学习足迹</h2><p class="hint">首次选择即记分，记录保存在本浏览器。普通练习优先抽取历史作答次数较少的字，次数相同时随机；错题复习不计入均衡次数。</p>
      <div class="stats"><div v-for="[value,label] in [[attempts.length,'累计作答'],[wrong,'答错次数'],[accuracy,'正确率']]" :key="label" class="stat"><b>{{ value }}</b><span>{{ label }}</span></div></div>
      <h3>错题巩固</h3><p class="hint">重答保留原题的四个选项及顺序。历史错题来自以前的练习范围，不会重新添加干扰字。</p>
      <button class="secondary" :disabled="!pending.length || page === 'quiz'" @click="retry('history')">练习待巩固错题（{{ pending.length }} 字）</button>
      <p class="hint">{{ page === 'quiz' ? '请先完成当前练习。' : pending.length ? '每轮最多复习 10 个字。答对后移出待巩固列表，原错误记录仍保留。' : '目前没有待巩固的错题。' }}</p>
      <h3>错题分布</h3><p class="hint">累计答错最多的 8 个字，条形长度表示历史错误率，含重答。</p>
      <div class="mistake-chart"><div v-for="s in mistakes.slice(0,8)" :key="s.char" class="bar-row"><strong>{{ s.char }}</strong><div class="bar-track" aria-hidden="true"><div class="bar-fill" :style="{width:s.wrong/s.total*100+'%'}"></div></div><span>{{ s.wrong }}/{{ s.total }} 次 · {{ Math.round(s.wrong/s.total*100) }}%</span></div><span v-if="!mistakes.length">还没有错题记录。</span></div>
      <div class="table-wrap"><table><thead><tr><th>汉字</th><th>作答次数</th><th>答错次数</th><th>错误率</th><th>最近错选</th></tr></thead><tbody><tr v-for="s in mistakes" :key="s.char"><td>{{ s.char }}</td><td>{{ s.total }}</td><td>{{ s.wrong }}</td><td>{{ Math.round(s.wrong/s.total*100) }}%</td><td>{{ s.lastWrongChoice }}</td></tr></tbody></table></div>
      <h3>最近 20 次作答</h3><div class="table-wrap"><table><thead><tr><th>时间</th><th>题号</th><th>正确答案</th><th>选择</th><th>结果</th></tr></thead><tbody><tr v-for="a in recent" :key="a.roundId+':'+a.questionNumber"><td>{{ new Date(a.answeredAt).toLocaleString('zh-CN',{hour12:false}) }}</td><td>{{ a.mode === 'review' ? '复习 ' : '' }}{{ a.questionNumber }}/{{ a.totalQuestions || 10 }}</td><td>{{ a.targetChar }}</td><td>{{ a.selectedChar }}</td><td>{{ a.correct ? '✓ 答对' : '再认一认' }}</td></tr><tr v-if="!recent.length"><td colspan="5">完成第一道题，就会出现记录。</td></tr></tbody></table></div>
      <button class="secondary" @click="exportRecords">导出全部答题记录（JSON）</button><p class="hint">清理浏览器数据会丢失记录，请定期导出备份。记录不跨设备同步。</p>
    </div></details>
    <footer>慢慢来，每认识一个字，都是进步。</footer>
  </main>
</template>
