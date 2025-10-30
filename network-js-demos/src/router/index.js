/**
 * Vue Router Configuration
 * Defines all application routes
 */

import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import ShowcasePage from '../views/ShowcasePage.vue';
import ExplorerPage from '../views/ExplorerPage.vue';
import FamilyPage from '../views/FamilyPage.vue';
import DocsPage from '../views/DocsPage.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage
  },
  {
    path: '/showcase',
    name: 'showcase',
    component: ShowcasePage
  },
  {
    path: '/explorer',
    name: 'explorer',
    component: ExplorerPage
  },
  {
    path: '/family',
    name: 'family',
    component: FamilyPage
  },
  {
    path: '/docs',
    name: 'docs',
    component: DocsPage
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
