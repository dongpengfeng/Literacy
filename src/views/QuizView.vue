<script setup>
import { inject, ref } from "vue";
const { mode, questions, index, selected, current, score, heading, speechStatus, play, system, choose, advance } = inject("practice");
const help = ref(null);
</script>
<template>
    <section v-if="current" class="panel quiz" aria-labelledby="quiz-title">
      <div class="quiz-toolbar"><RouterLink to="/">‹ 返回首页</RouterLink><button class="help-button" @click="help.showModal()">家长帮助</button></div>
      <div class="quiz-top"><span>{{ mode === 'review' ? '错题重答 · ' : '' }}第 {{ index+1 }} / {{ questions.length }} 题</span><span>已答对 {{ score }} 题</span></div>
      <progress :max="questions.length" :value="index + (selected !== null ? 1 : 0)" aria-label="已完成题数"></progress>
      <h1 id="quiz-title" ref="heading" tabindex="-1">哪个字在说话？</h1>
      <button class="listen" @click="play(current.targetChar)"><span aria-hidden="true">♫</span> 听一听</button>
      <p class="speech-status hint" role="status">{{ speechStatus }}</p>
      <div class="options" aria-label="汉字选项"><button v-for="char in current.options" :key="char" class="option" :aria-label="`选择 ${char}`" :disabled="selected !== null" :class="{correct:selected !== null && char === current.targetChar,wrong:selected === char && char !== current.targetChar}" @click="choose(char)">{{ char }}<small v-if="selected !== null && (char === current.targetChar || char === selected)">{{ char === current.targetChar ? '✓ 正确答案' : '再认一认' }}</small></button></div>
      <div class="feedback" :class="selected === current.targetChar ? 'success' : 'retry'" role="status">{{ selected === null ? '' : selected === current.targetChar ? '答对啦！小耳朵听得真仔细。' : `这次听到的是“${current.targetChar}”，一起记住它吧。` }}</div>
      <button class="primary next-action" :disabled="selected === null" @click="advance">{{ selected === null ? '选一个你听到的字' : index === questions.length-1 ? '看看我的收获 →' : '下一题 →' }}</button>
    </section>

<dialog ref="help" class="help-dialog" aria-labelledby="help-title" @click="$event.target === help && help.close()">
  <h2 id="help-title">家长帮助</h2><p>没声音时检查媒体音量和蓝牙输出，再点“听一听”。</p>
  <button class="secondary" @click="system(current.targetChar)">备用系统朗读</button>
  <details class="adult"><summary>查看本题汉字</summary><strong>{{ current?.targetChar }}</strong></details>
  <button class="primary" @click="help.close()">继续答题</button>
</dialog>

</template>
