<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import bank from '../../characters.json';
import { readLearningPosition, saveLearningPosition, validPosition } from '../learning.js';

const router = useRouter();
const position = ref(1), warning = ref('');
try { position.value = readLearningPosition(localStorage, bank.length); }
catch { warning.value = '学习位置暂时无法读取，仍可正常学习。'; }
const valid = computed(() => validPosition(position.value, bank.length));
const card = computed(() => valid.value ? bank[Number(position.value) - 1] : null);
function start() {
  if (!valid.value) return;
  try { saveLearningPosition(localStorage, position.value, bank.length); } catch { /* Learning remains available without storage. */ }
  router.push({ name: 'learn-card', params: { position: Number(position.value) } });
}
</script>

<template>
  <section class="panel learn-start">
    <div class="eyebrow">每天认识一点点</div>
    <h1>今天从哪个字学起？</h1>
    <p class="muted">内置 {{ bank.length }} 张字卡，按字库顺序学习汉字、词语和句子。</p>
    <form @submit.prevent="start">
      <label class="learning-position">从第 <input v-model="position" type="number" min="1" :max="bank.length" step="1" required aria-label="学习开始位置" aria-describedby="learning-range-tip"> 个字开始</label>
      <p id="learning-range-tip" class="hint" :class="{ 'range-error': !valid }">{{ valid ? '默认接着上次的位置学习，也可以输入新的起点。' : `请输入 1～${bank.length} 之间的整数。` }}</p>
      <div v-if="card" class="learning-preview" aria-label="起点汉字">{{ card.char }}</div>
      <button class="primary" :disabled="!valid" type="submit">开始学习 →</button>
    </form>
    <p class="hint">每学到一个字都会自动记住位置，下次可以接着学。</p>
    <p v-if="warning" class="notice" role="status">{{ warning }}</p>
  </section>
</template>
