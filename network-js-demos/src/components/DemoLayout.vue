<template>
  <div class="demo-layout">
    <!-- Controls Panel -->
    <aside class="demo-controls" :class="controlsVisible ? 'mobile-visible' : 'mobile-hidden'">
      <div class="demo-controls-content">
        <slot name="controls" />
      </div>
    </aside>

    <!-- Graph Container -->
    <main class="demo-graph">
      <slot name="graph" />
    </main>

    <!-- Mobile Toggle Button (hidden on desktop) -->
    <button
      @click="toggleControls"
      class="demo-controls-toggle lg:hidden"
      :aria-label="controlsVisible ? 'Close controls' : 'Open controls'"
    >
      <span v-if="!controlsVisible" class="text-2xl">⚙️</span>
      <span v-else class="text-2xl">✕</span>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const controlsVisible = ref(false);

const toggleControls = () => {
  controlsVisible.value = !controlsVisible.value;
};

defineExpose({
  toggleControls,
  controlsVisible
});
</script>
