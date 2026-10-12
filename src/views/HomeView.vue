<script setup>
import { inject } from "vue";
const { entries, from, to, expanded, page, selection, start } = inject("practice");

</script>
<template>
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
    <section  class="panel welcome">
      <div class="eyebrow">小耳朵，准备好了吗？</div><h1>听一听，<span>认一认。</span></h1>
      <p class="subtitle">听到一个字，找到它。<br>一起完成今天的认字小挑战！</p>
      <div class="sample-tiles" aria-hidden="true"><span>山</span><span>月</span><span>水</span></div>
      <div class="pills"><span>♫ 听音选字</span><span>✦ 均衡练习</span><span>✓ 自动记录</span></div>
      <p class="muted">优先练习出题次数少的字，每一轮都有新收获。</p>
      <button class="primary" :disabled="!!selection.error" @click="start">开始认字 →</button><p class="hint">记得打开声音哦。小朋友可以请大人一起帮忙。</p>
    </section>

</template>
