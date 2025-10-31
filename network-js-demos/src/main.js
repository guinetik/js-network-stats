/**
 * Main Application Entry Point
 * Vue.js app initialization
 */

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createLogger } from '@guinetik/logger';

// Import styles
import '../styles/main.css';

// Create logger for main app
const log = createLogger({
  prefix: 'App',
  level: import.meta.env.DEV ? 'debug' : 'info'
});

// Create and mount the Vue app
const app = createApp(App);

app.use(router);

app.mount('#app');

log.info('Vue app started');
