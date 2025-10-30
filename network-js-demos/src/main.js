/**
 * Main Application Entry Point
 * Vue.js app initialization
 */

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Import styles
import '../styles/main.css';

// Create and mount the Vue app
const app = createApp(App);

app.use(router);

app.mount('#app');

console.log('Vue app started');
