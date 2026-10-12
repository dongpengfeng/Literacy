<script setup>
import { provide, computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePractice } from './usePractice.js';
const practice = usePractice();
provide('practice', practice);
const route = useRoute();
const quiz = computed(() => route.name === 'quiz');
</script>
<template>
  <div class="app-shell" :class="{ 'quiz-shell': quiz }">
    <header v-if="!quiz" class="topbar"><RouterLink class="brand" to="/"><span class="brand-icon">字</span> 小小识字岛</RouterLink><nav><RouterLink to="/">选择范围</RouterLink><RouterLink to="/mistakes">错题数据</RouterLink></nav></header>
    <main :class="{ 'quiz-main': quiz }">
      <div v-if="practice.warning.value" class="notice" :class="{'quiz-notice':quiz}" role="alert">{{ practice.warning.value }}</div>
      <nav v-if="!quiz && route.name !== 'mistakes'" class="steps" aria-label="练习步骤"><span :aria-current="route.name==='home'?'step':undefined">1 选择范围</span><span>2 听音答题</span><span :aria-current="route.name==='result'?'step':undefined">3 查看收获</span></nav>
      <RouterView />
      <footer v-if="!quiz">慢慢来，每认识一个字，都是进步。</footer>
    </main>
  </div>
</template>
