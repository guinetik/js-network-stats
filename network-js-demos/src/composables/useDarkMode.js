/**
 * Dark Mode Composable for Vue
 * Manages dark mode state
 */

import { ref, watch } from 'vue';

const darkMode = ref(localStorage.getItem('darkMode') === 'true');

// Apply dark mode class to document
const applyDarkMode = () => {
  if (darkMode.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Watch for changes and apply
watch(darkMode, () => {
  localStorage.setItem('darkMode', darkMode.value);
  applyDarkMode();
}, { immediate: true });

export function useDarkMode() {
  const toggleDarkMode = () => {
    darkMode.value = !darkMode.value;
  };

  return {
    darkMode,
    toggleDarkMode
  };
}
