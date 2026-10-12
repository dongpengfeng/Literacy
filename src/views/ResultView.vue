<script setup>
import { inject } from "vue";
const { selection, roundRecords, score, missed, percent, resultTotal, resultMode, resultHeading, start, retry } = inject("practice");

</script>
<template>
    <section v-if="roundRecords.length" class="panel result" aria-labelledby="result-title">
      <div class="eyebrow">今天也有新收获</div><h1 id="result-title" ref="resultHeading" tabindex="-1">{{ resultMode === 'review' ? '复习完成！' : '挑战完成！' }}</h1>
      <div class="accuracy-ring" role="img" :aria-label="`本轮正确率 ${percent}%`" :style="{'--percent':percent+'%'}"><div><strong>{{ percent }}%</strong><span>本轮正确率</span></div></div>
      <p class="chart-legend">✓ 答对 {{ score }} 题 · 再认认 {{ missed.length }} 题</p><p class="result-score">{{ score }} / {{ resultTotal }} 题答对</p>
      <p class="muted">{{ missed.length ? '认真完成就是进步，再和这些字交一次朋友吧。' : '每个字都找对啦，给自己一个大大的拥抱！' }}</p>
      <div class="round-mistakes">{{ missed.length ? `这一轮再认一认：${missed.map(a=>a.targetChar).join('　')}` : '这一轮没有错题，真棒！' }}</div>
      <h2>这一轮的小足迹</h2><div class="answer-grid"><div v-for="a in roundRecords" :key="a.questionNumber" class="answer-card" :class="a.correct ? 'right' : 'missed'"><span>第 {{ a.questionNumber }} 题</span><strong>{{ a.targetChar }}</strong><span>{{ a.correct ? '✓ 答对了' : `错选：${a.selectedChar}` }}</span></div></div>
      <div class="result-actions"><button v-if="missed.length" class="primary" @click="retry('round')">再练本轮错题（{{ missed.length }} 字）</button><button class="secondary" :disabled="!!selection.error" @click="start">开始新一轮 →</button><RouterLink class="secondary" to="/">重新选择范围</RouterLink><RouterLink class="secondary" to="/mistakes">查看错题数据</RouterLink></div>
    </section>
<section v-else class="panel"><h1>还没有本次结果</h1><p>完成一轮练习后，就能在这里查看收获。</p><RouterLink class="secondary" to="/">去选择范围</RouterLink></section>
</template>
