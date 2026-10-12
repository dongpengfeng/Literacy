import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import QuizView from './views/QuizView.vue';
import ResultView from './views/ResultView.vue';
import MistakesView from './views/MistakesView.vue';
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/quiz', name: 'quiz', component: QuizView },
    { path: '/result/:roundId', name: 'result', component: ResultView },
    { path: '/mistakes', name: 'mistakes', component: MistakesView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
});
