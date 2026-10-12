<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import bank from '../../characters.json';
import { learningText, saveLearningPosition, validPosition } from '../learning.js';
import { useAudio } from '../useAudio.js';

const route = useRoute(), router = useRouter();
const warning = ref('');
const { play, system, stop, status } = useAudio({ learning: true });
const position = computed(() => Number(route.params.position));
const card = computed(() => bank[position.value - 1]);
const words = computed(() => learningText(card.value?.words));
const sentences = computed(() => learningText(card.value?.sentence));
watch(() => route.params.position, value => {
  stop();
  status.value = '点击朗读按钮，听一听再跟着读。';
  if (!validPosition(value, bank.length)) { router.replace({ name: 'learn' }); return; }
  try { saveLearningPosition(localStorage, value, bank.length); }
  catch { warning.value = '学习位置暂时无法保存，下次需要重新选择。'; }
}, { immediate: true });
function move(offset) {
  const next = position.value + offset;
  if (validPosition(next, bank.length)) router.replace({ name: 'learn-card', params: { position: next } });
}
</script>

<template>
  <section v-if="card" class="panel learning-card" aria-labelledby="learning-title">
    <div class="learning-toolbar"><RouterLink to="/learn">‹ 选择学习起点</RouterLink><span>第 {{ position }} / {{ bank.length }} 个字</span></div>
    <h1 id="learning-title" class="learning-char">{{ card.char }}</h1>
    <button class="listen" @click="play(card.char)">♫ 读这个字</button>
    <div class="learning-section">
      <h2>一起读词语</h2>
      <div v-for="(word, index) in words" :key="index" class="learning-line"><p>{{ word }}</p><button class="secondary" :aria-label="`朗读词语：${word}`" @click="system(word)">♫ 读词语</button></div>
      <p v-if="!words.length" class="hint">这张字卡还没有词语。</p>
    </div>
    <div class="learning-section">
      <h2>一起读句子</h2>
      <div v-for="(sentence, index) in sentences" :key="index" class="learning-line"><p>{{ sentence }}</p><button class="secondary" :aria-label="`朗读句子：${sentence}`" @click="system(sentence)">♫ 读句子</button></div>
      <p v-if="!sentences.length" class="hint">这张字卡还没有句子。</p>
    </div>
    <p class="hint learning-speech-status" role="status">{{ status }}</p>
    <p class="hint">词语和句子使用设备的中文朗读声音；没声音时请检查媒体音量，或请家长带读。</p>
    <div class="learning-actions"><button class="secondary" :disabled="position === 1" @click="move(-1)">← 上一个字</button><button class="primary" :disabled="position === bank.length" @click="move(1)">下一个字 →</button></div>
    <p v-if="position === bank.length" class="hint">已经学到最后一个字啦！可以返回选择起点，再复习一遍。</p>
    <p v-if="warning" class="notice" role="status">{{ warning }}</p>
  </section>
</template>
