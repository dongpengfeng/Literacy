<script setup>
import { inject } from "vue";
const { page, attempts, pending, mistakes, wrong, accuracy, recent, retry, exportRecords } = inject("practice");

</script>
<template>
<section class="panel data-page"><div class="parent-content">      <h2>学习足迹</h2><p class="hint">首次选择即记分，记录保存在本浏览器。普通练习优先抽取历史作答次数较少的字，次数相同时随机；错题复习不计入均衡次数。</p>
      <div class="stats"><div v-for="[value,label] in [[attempts.length,'累计作答'],[wrong,'答错次数'],[accuracy,'正确率']]" :key="label" class="stat"><b>{{ value }}</b><span>{{ label }}</span></div></div>
      <h3>错题巩固</h3><p class="hint">重答保留原题的四个选项及顺序。历史错题来自以前的练习范围，不会重新添加干扰字。</p>
      <button class="secondary" :disabled="!pending.length || page === 'quiz'" @click="retry('history')">练习待巩固错题（{{ pending.length }} 字）</button>
      <p class="hint">{{ page === 'quiz' ? '请先完成当前练习。' : pending.length ? '每轮最多复习 10 个字。答对后移出待巩固列表，原错误记录仍保留。' : '目前没有待巩固的错题。' }}</p>
      <h3>错题分布</h3><p class="hint">累计答错最多的 8 个字，条形长度表示历史错误率，含重答。</p>
      <div class="mistake-chart"><div v-for="s in mistakes.slice(0,8)" :key="s.char" class="bar-row"><strong>{{ s.char }}</strong><div class="bar-track" aria-hidden="true"><div class="bar-fill" :style="{width:s.wrong/s.total*100+'%'}"></div></div><span>{{ s.wrong }}/{{ s.total }} 次 · {{ Math.round(s.wrong/s.total*100) }}%</span></div><span v-if="!mistakes.length">还没有错题记录。</span></div>
      <div class="table-wrap"><table><thead><tr><th>汉字</th><th>作答次数</th><th>答错次数</th><th>错误率</th><th>最近错选</th></tr></thead><tbody><tr v-for="s in mistakes" :key="s.char"><td>{{ s.char }}</td><td>{{ s.total }}</td><td>{{ s.wrong }}</td><td>{{ Math.round(s.wrong/s.total*100) }}%</td><td>{{ s.lastWrongChoice }}</td></tr></tbody></table></div>
      <h3>最近 20 次作答</h3><div class="table-wrap"><table><thead><tr><th>时间</th><th>题号</th><th>正确答案</th><th>选择</th><th>结果</th></tr></thead><tbody><tr v-for="a in recent" :key="a.roundId+':'+a.questionNumber"><td>{{ new Date(a.answeredAt).toLocaleString('zh-CN',{hour12:false}) }}</td><td>{{ a.mode === 'review' ? '复习 ' : '' }}{{ a.questionNumber }}/{{ a.totalQuestions || 10 }}</td><td>{{ a.targetChar }}</td><td>{{ a.selectedChar }}</td><td>{{ a.correct ? '✓ 答对' : '再认一认' }}</td></tr><tr v-if="!recent.length"><td colspan="5">完成第一道题，就会出现记录。</td></tr></tbody></table></div>
      <button class="secondary" @click="exportRecords">导出全部答题记录（JSON）</button><p class="hint">清理浏览器数据会丢失记录，请定期导出备份。记录不跨设备同步。</p>
</div></section>
</template>
