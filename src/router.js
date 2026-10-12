import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import QuizView from './views/QuizView.vue';
import ResultView from './views/ResultView.vue';
import MistakesView from './views/MistakesView.vue';
import LearnStartView from './views/LearnStartView.vue';
import LearnCardView from './views/LearnCardView.vue';
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/quiz', name: 'quiz', component: QuizView },
    { path: '/result/:roundId', name: 'result', component: ResultView },
    { path: '/mistakes', name: 'mistakes', component: MistakesView },
    { path: '/learn', name: 'learn', component: LearnStartView },
    { path: '/learn/:position', name: 'learn-card', component: LearnCardView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
});
