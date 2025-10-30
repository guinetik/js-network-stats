<template>
  <DemoLayout>
    <template #controls>
      <!-- Header -->
      <div class="demo-controls-header">
        <h1 class="demo-controls-title">
          📊 Lorem Ipsum Demo
        </h1>
        <p class="demo-controls-description">
          Consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>

      <!-- Info Box -->
      <div class="info-box-blue">
        <h2 class="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
          Dolor Sit Amet?
        </h2>
        <p class="text-sm text-blue-800 dark:text-blue-200">
          Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>

      <!-- Controls Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Lorem Controls</h2>

        <button class="w-full btn-primary mb-2">
          ➕ Ipsum Action
        </button>

        <button class="w-full btn-secondary mb-2">
          🔗 Dolor Action
        </button>

        <button class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md font-semibold transition-colors">
          ➖ Sit Action
        </button>
      </div>

      <!-- Data Loading Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Amet Dataset</h2>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-secondary">
            Consectetur Dataset:
          </label>
          <select class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md">
            <option>Elit (Simple)</option>
            <option>Labore (34 nodes)</option>
            <option>Commodo (77 nodes)</option>
          </select>
        </div>

        <button class="w-full btn-primary mt-3">
          📊 Load Ipsum
        </button>
      </div>

      <!-- Instructions Box -->
      <div class="info-box-purple">
        <h3 class="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">
          💡 Exercitation Tips
        </h3>
        <ul class="text-sm text-purple-800 dark:text-purple-200 space-y-1">
          <li>🖱️ <strong>Labore</strong> to reposition</li>
          <li>🔍 <strong>Commodo</strong> to zoom</li>
          <li>👆 <strong>Consequat</strong> to pan</li>
          <li>📊 <strong>Duis</strong> = centrality</li>
        </ul>
      </div>
    </template>

    <template #graph>
      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 z-10">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
          <p class="text-secondary">Loading graph...</p>
        </div>
      </div>

      <!-- D3 Graph Container -->
      <div ref="graphContainer" class="w-full h-full"></div>
    </template>
  </DemoLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import DemoLayout from '../components/DemoLayout.vue';

const graphContainer = ref(null);
const loading = ref(false);
const graphInstance = ref(null);

const initializeGraph = async () => {
  loading.value = true;

  try {
    if (!graphContainer.value) {
      console.warn('Showcase: Container not found');
      loading.value = false;
      return;
    }

    // TODO: Initialize graph instance here
    // Graph implementation can be added later

    loading.value = false;
  } catch (error) {
    console.error('Error initializing graph:', error);
    loading.value = false;
  }
};

onMounted(() => {
  initializeGraph();
});

onUnmounted(() => {
  if (graphInstance.value) {
    graphInstance.value.destroy?.();
    graphInstance.value = null;
  }
});
</script>
