<template>
  <DemoLayout>
    <template #controls>
      <!-- Header -->
      <div class="demo-controls-header">
        <h1 class="demo-controls-title">
          🔍 Lorem Explorer
        </h1>
        <p class="demo-controls-description">
          Dolor sit amet consectetur adipiscing elit explorer demo.
        </p>
      </div>

      <!-- Info Box -->
      <div class="info-box-green">
        <h2 class="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
          Elit Explorer?
        </h2>
        <p class="text-sm text-green-800 dark:text-green-200">
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua explorer features.
        </p>
      </div>

      <!-- Controls Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Explorer Actions</h2>

        <button class="w-full btn-primary mb-2">
          🔎 Search Ipsum
        </button>

        <button class="w-full btn-secondary mb-2">
          📊 Analyze Dolor
        </button>

        <button class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md font-semibold transition-colors">
          🎯 Focus Node
        </button>
      </div>

      <!-- Settings Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">View Settings</h2>

        <div class="space-y-2">
          <label class="flex items-center">
            <input type="checkbox" class="mr-2" checked>
            <span class="text-sm">Show labels</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" class="mr-2">
            <span class="text-sm">Show edges</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" class="mr-2" checked>
            <span class="text-sm">Animate</span>
          </label>
        </div>
      </div>

      <!-- Instructions Box -->
      <div class="info-box-blue">
        <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
          💡 Explorer Tips
        </h3>
        <ul class="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>🔍 Click node to select</li>
          <li>🖱️ Drag to explore</li>
          <li>🔎 Search by name</li>
          <li>📊 View statistics</li>
        </ul>
      </div>
    </template>

    <template #graph>
      <div class="demo-placeholder">
        <div class="demo-placeholder-text">EXPLORER GRAPH HERE</div>
        <p class="demo-placeholder-desc">Lorem ipsum explorer visualization</p>
      </div>
    </template>
  </DemoLayout>
</template>

<script setup>
import DemoLayout from '../components/DemoLayout.vue';
</script>
