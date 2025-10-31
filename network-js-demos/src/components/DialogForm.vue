<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="dialog-overlay fixed inset-0 z-[9999] flex items-center justify-center"
      style="z-index: 9999 !important; position: fixed !important;"
      @click.self="handleCancel"
    >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" style="z-index: 9998;"></div>

        <!-- Dialog -->
        <div
          class="dialog-content relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
          style="z-index: 10000 !important; position: relative !important;"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`dialog-title-${dialogId}`"
        >
          <!-- Title -->
          <div class="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3
              :id="`dialog-title-${dialogId}`"
              class="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {{ title }}
            </h3>
          </div>

          <!-- Content -->
          <div class="px-6 py-4">
            <div class="space-y-4">
              <div
                v-for="(field, index) in fields"
                :key="index"
                class="space-y-2"
              >
                <label
                  :for="`field-${index}`"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {{ field.label }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>

                <!-- Text Input -->
                <input
                  v-if="field.type === 'text' || !field.type"
                  :id="`field-${index}`"
                  v-model="fieldValues[index]"
                  type="text"
                  :required="field.required"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  @keyup.enter="handleConfirm"
                  @keyup.esc="handleCancel"
                />

                <!-- Select Dropdown -->
                <select
                  v-else-if="field.type === 'select'"
                  :id="`field-${index}`"
                  v-model="fieldValues[index]"
                  :required="field.required"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  @keyup.esc="handleCancel"
                >
                  <option value="" disabled>Select an option</option>
                  <option
                    v-for="option in field.options"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.text }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleConfirm"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';

/**
 * DialogForm - Vue component for modal dialogs with form fields
 * 
 * @component
 * @example
 * <DialogForm
 *   :visible="showDialog"
 *   title="Add Person"
 *   :fields="[
 *     { label: 'Name', type: 'text', required: true },
 *     { label: 'Type', type: 'select', options: [{value: '1', text: 'Type 1'}], required: true }
 *   ]"
 *   @confirm="handleConfirm"
 *   @cancel="showDialog = false"
 * />
 */

const props = defineProps({
  /**
   * Whether the dialog is visible
   */
  visible: {
    type: Boolean,
    default: false
  },
  /**
   * Dialog title
   */
  title: {
    type: String,
    required: true
  },
  /**
   * Array of field definitions
   * @type {Array<{label: string, type?: 'text'|'select', required?: boolean, options?: Array<{value: string, text: string}>}>}
   */
  fields: {
    type: Array,
    required: true,
    default: () => []
  }
});

const emit = defineEmits(['confirm', 'cancel']);

// Generate unique ID for accessibility
const dialogId = `dialog-${Math.random().toString(36).substr(2, 9)}`;

// Field values
const fieldValues = ref([]);

/**
 * Initialize field values
 */
const initFieldValues = () => {
  fieldValues.value = props.fields.map(() => '');
};

/**
 * Handle confirm button click
 */
const handleConfirm = () => {
  // Validate required fields
  const allValid = props.fields.every((field, index) => {
    if (field.required && !fieldValues.value[index]?.trim()) {
      return false;
    }
    return true;
  });

  if (!allValid) {
    alert('Please fill in all required fields');
    return;
  }

  // Emit values
  emit('confirm', [...fieldValues.value]);
};

/**
 * Handle cancel button click or backdrop click
 */
const handleCancel = () => {
  initFieldValues();
  emit('cancel');
};

// Watch for visibility changes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initFieldValues();
    // Focus first input when dialog opens
    nextTick(() => {
      const firstInput = document.querySelector(`#field-0`);
      if (firstInput) {
        firstInput.focus();
        if (firstInput.tagName === 'INPUT') {
          firstInput.select();
        }
      }
    });
  }
});

// Initialize on mount
onMounted(() => {
  initFieldValues();
});
</script>

<style scoped>
/* Dialog transition */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .relative,
.dialog-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .relative,
.dialog-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>

<style>
/* Ensure dialog is always on top - not scoped so it applies globally */
.dialog-overlay {
  position: fixed !important;
  z-index: 9999 !important;
}

.dialog-content {
  position: relative !important;
  z-index: 10000 !important;
}
</style>

