<template>
  <DemoLayout>
    <template #controls>
      <!-- Header -->
      <div class="demo-controls-header">
        <h1 class="demo-controls-title">
          🌳 Lorem Family Tree
        </h1>
        <p class="demo-controls-description">
          Consectetur adipiscing elit family tree visualization demo.
        </p>
      </div>

      <!-- Info Box -->
      <div class="info-box-purple">
        <h2 class="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-2">
          Family Relationships?
        </h2>
        <p class="text-sm text-purple-800 dark:text-purple-200">
          Ut labore et dolore magna aliqua hierarchical tree structure visualization.
        </p>
      </div>

      <!-- Controls Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Tree Actions</h2>

        <button class="w-full btn-primary mb-2">
          👤 Add Person
        </button>

        <button class="w-full btn-secondary mb-2">
          🔗 Add Relationship
        </button>

        <button class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-md font-semibold transition-colors">
          🌲 Expand Tree
        </button>
      </div>

      <!-- Layout Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Tree Layout</h2>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-secondary">
            Layout Style:
          </label>
          <select class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md">
            <option>Vertical</option>
            <option>Horizontal</option>
            <option>Radial</option>
            <option>Compact</option>
          </select>
        </div>

        <div class="mt-3 space-y-2">
          <label class="flex items-center">
            <input type="checkbox" class="mr-2" checked>
            <span class="text-sm">Show generations</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" class="mr-2" checked>
            <span class="text-sm">Show connections</span>
          </label>
        </div>
      </div>

      <!-- Instructions Box -->
      <div class="info-box-yellow">
        <h3 class="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
          💡 Tree Tips
        </h3>
        <ul class="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
          <li>👆 Click to select person</li>
          <li>🖱️ Drag to reposition</li>
          <li>🔍 Zoom to focus</li>
          <li>🌳 Expand branches</li>
        </ul>
      </div>
    </template>

    <template #graph>
      <div class="demo-placeholder">
        <div class="demo-placeholder-text">FAMILY TREE HERE</div>
        <p class="demo-placeholder-desc">Lorem ipsum family tree visualization</p>
      </div>
    </template>
  </DemoLayout>
</template>

<script setup>
import DemoLayout from '../components/DemoLayout.vue';
</script>
