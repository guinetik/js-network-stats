<template>
  <DemoLayout>
    <template #controls>
      <!-- Header -->
      <div class="demo-controls-header">
        <h1 class="demo-controls-title">
          🌳 Family Tree Builder
        </h1>
        <p class="demo-controls-description">
          Build and visualize your family tree interactively. Start with yourself and add relatives to see the network grow.
        </p>
      </div>

      <!-- What is this? -->
      <div class="info-box-green mb-4">
        <h2 class="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
          What is this?
        </h2>
        <p class="text-sm text-green-800 dark:text-green-200">
          A network visualization of family relationships. Each color represents a different
          relationship type. The tree auto-saves to your browser's storage every 30 seconds.
        </p>
      </div>

      <!-- Status Section -->
      <div class="sticky top-0 z-20 bg-white/98 dark:bg-gray-800/98 backdrop-blur-md border-b border-[var(--color-border)] pb-4 mb-4 -mx-6 px-6 pt-4 -mt-2 overflow-x-hidden">
        <h2 class="demo-controls-section-title mb-3">Status</h2>

        <div class="bg-[var(--color-bg-secondary)] rounded-md p-4 text-sm shadow-sm border border-[var(--color-border)]">
          <div v-if="!statusMessage" class="text-secondary text-center py-2">
            <div class="text-xs">Ready for operations</div>
            <div class="text-xs mt-1 opacity-60">Click buttons to add relatives</div>
          </div>
          <div v-else class="space-y-2">
            <div :class="{
              'flex items-start space-x-2': true,
              'text-green-600 dark:text-green-400': statusType === 'success',
              'text-red-600 dark:text-red-400': statusType === 'error',
              'text-blue-600 dark:text-blue-400': statusType === 'info'
            }">
              <div class="flex-shrink-0 mt-0.5">
                <span v-if="statusType === 'success'">✅</span>
                <span v-else-if="statusType === 'error'">❌</span>
                <span v-else>ℹ️</span>
              </div>
              <div class="flex-1 break-words">{{ statusMessage }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Relatives Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Add Relatives</h2>

        <div class="grid grid-cols-2 gap-2">
          <!-- Row 1: Parents & Grandparents -->
          <button
            @click="handleAddParents"
            class="bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
            type="button"
          >
            👨‍👩‍👧 Parents
          </button>

          <button
            @click="handleAddGrandparents"
            class="bg-amber-700 hover:bg-amber-800 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            👴👵 Grandparents
          </button>

          <!-- Row 2: Sibling & Niece/Nephew -->
          <button
            @click="handleAddSibling"
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            👫 Sibling
          </button>

          <button
            @click="handleAddNieceNephew"
            class="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            🧒 Niece/Nephew
          </button>

          <!-- Row 3: Uncle/Aunt & Cousin -->
          <button
            @click="handleAddUncleAunt"
            class="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            🧑‍🤝‍🧑 Uncle/Aunt
          </button>

          <button
            @click="handleAddCousin"
            class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            👯 Cousin
          </button>

          <!-- Row 4: Partner & Child -->
          <button
            @click="handleAddPartner"
            class="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            💑 Partner
          </button>

          <button
            @click="handleAddChild"
            class="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            👶 Child
          </button>
        </div>
      </div>

      <!-- Actions Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Actions</h2>

        <div class="grid grid-cols-2 gap-2">
          <button
            @click="handleSaveFamily"
            class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            💾 Save Family
          </button>

          <button
            @click="handleSaveImage"
            class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            📸 Save as Image
          </button>

          <button
            @click="handleLockGraph"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            🔒 Lock Graph
          </button>

          <button
            @click="handleUnlockGraph"
            class="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            🔓 Unlock Graph
          </button>

          <button
            @click="handleResetTree"
            class="col-span-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            🗑️ Reset Tree
          </button>
        </div>
      </div>

      <!-- Legend -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Relationship Colors
        </h3>
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full bg-purple-600"></div>
            <span class="text-gray-700 dark:text-gray-300">You</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full bg-pink-500"></div>
            <span class="text-gray-700 dark:text-gray-300">Parents</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full bg-blue-500"></div>
            <span class="text-gray-700 dark:text-gray-300">Siblings</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full bg-orange-500"></div>
            <span class="text-gray-700 dark:text-gray-300">Uncles/Aunts</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full bg-purple-500"></div>
            <span class="text-gray-700 dark:text-gray-300">Cousins</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full bg-amber-700"></div>
            <span class="text-gray-700 dark:text-gray-300">Grandparents</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full bg-cyan-500"></div>
            <span class="text-gray-700 dark:text-gray-300">Nieces/Nephews</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full bg-rose-500"></div>
            <span class="text-gray-700 dark:text-gray-300">Partners/Spouses</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full bg-teal-500"></div>
            <span class="text-gray-700 dark:text-gray-300">Children</span>
          </div>
        </div>
      </div>

      <!-- Layout Algorithm Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">🎯 Layout Algorithm</h2>

        <div class="space-y-2 mb-3">
          <label class="block text-sm font-medium text-secondary">
            Choose Layout:
          </label>
          <select
            v-model="selectedLayout"
            class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md"
          >
            <option value="none">Default (D3 Force Simulation)</option>
            <option
              v-for="layout in availableLayouts"
              :key="layout.id"
              :value="layout.id"
            >
              {{ layout.name }}
            </option>
          </select>
        </div>

        <button
          @click="handleApplyLayout"
          :disabled="loading || applyingLayout"
          class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
        >
          <span v-if="!applyingLayout">🎯 Apply Layout</span>
          <span v-else>⏳ Applying...</span>
        </button>

        <div class="info-box-yellow mt-3">
          <p class="text-xs text-yellow-800 dark:text-yellow-200">
            <template v-for="layout in availableLayouts" :key="layout.id">
              <div>
                <strong>{{ layout.name }}:</strong>
                {{ layout.description }}
                <span v-if="layout.requiresStats" class="italic"> (requires analysis)</span>
                <br>
              </div>
            </template>
          </p>
        </div>
      </div>

      <!-- Instructions Box -->
      <div class="info-box-blue">
        <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
          💡 How to use
        </h3>
        <ul class="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>🖱️ <strong>Drag nodes</strong> to arrange your tree</li>
          <li>💾 <strong>Auto-saves</strong> every 30 seconds</li>
          <li>🔒 <strong>Lock</strong> to freeze positions</li>
          <li>📸 <strong>Download</strong> as PNG image</li>
          <li>🎯 <strong>Apply layouts</strong> to visualize your tree differently</li>
        </ul>
      </div>
    </template>

    <template #graph>
      <!-- Loading Overlay -->
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 z-10"
      >
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
          <p class="text-secondary">{{ loadingMessage }}</p>
        </div>
      </div>

      <!-- D3 Graph Container -->
      <div ref="graphContainer" class="w-full h-full"></div>
    </template>

  </DemoLayout>

  <!-- Dialog Form - Outside DemoLayout to ensure it's always rendered -->
  <DialogForm
    :key="`dialog-${dialogAction || 'default'}`"
    :visible="dialogVisible"
    :title="dialogTitle"
    :fields="dialogFields"
    @confirm="handleDialogConfirm"
    @cancel="handleDialogCancel"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import DemoLayout from '../components/DemoLayout.vue';
import DialogForm from '../components/DialogForm.vue';
import { useNetworkGraph } from '../composables/useNetworkGraph';
import { FamilyController, FAMILY_GROUPS, GROUP_COLORS } from '../lib/FamilyController';

// Use the network graph composable with custom color function for family groups
const graphComposable = useNetworkGraph({
  colorBy: 'group',
  colorScheme: 'categorical',
  showLabels: true,
  customColorFunction: (node) => {
    const group = node.group || 0;
    return GROUP_COLORS[group] || null; // Return null to use default if not found
  }
});
const {
  graphContainer,
  graphInstance,
  loading,
  loadData,
  addNode,
  addLink,
  hasNode,
  getNodeIds,
  lockPositions,
  unlockPositions,
  saveAsPNG,
  applyLayout,
  getAvailableLayouts
} = graphComposable;

// Local state
const statusMessage = ref('');
const statusType = ref('info');
const loadingMessage = ref('Loading graph...');
const dialogVisible = ref(false);
const dialogTitle = ref('');
const dialogFields = ref([]);
const dialogAction = ref(null); // Store which action to perform on confirm
const selectedLayout = ref('none');
const availableLayouts = ref([]);
const applyingLayout = ref(false);

// Controller instance
let controller = null;

/**
 * Status change callback
 * @param {string} message - Status message
 * @param {string} type - Status type
 */
const handleStatusChange = (message, type) => {
  statusMessage.value = message;
  statusType.value = type;
  /* setTimeout(() => {
    statusMessage.value = '';
  }, type === 'error' ? 5000 : 3000); */
};

/**
 * Initialize controller and load initial data
 */
const initializeFamily = () => {
  // Create graph manager with incremental addNode and addLink for family tree
  const graphManager = {
    graphInstance,
    loadData,
    addNode: (neighborIds, nodeId, group) => addNode(neighborIds, nodeId, group, true), // Use incremental mode
    addLink: (sourceId, targetId) => addLink(sourceId, targetId, true), // Use incremental mode
    hasNode,
    getNodeIds,
    lockPositions,
    unlockPositions,
    saveAsPNG,
    applyLayout,
    getAvailableLayouts
  };

  // Create controller
  controller = new FamilyController({
    graphManager,
    onStatusChange: handleStatusChange
  });

  // Get available layouts
  availableLayouts.value = controller.getAvailableLayouts();

  // Custom color function is already set via options
  // Just ensure visual encoding is updated
  if (graphInstance.value) {
    graphInstance.value.updateVisualEncoding({
      colorBy: 'group',
      colorScheme: 'categorical',
      preserveZoom: true
    });
  }

  // Load saved data or initial data
  const savedData = controller.loadFamily();
  if (savedData) {
    loadData(savedData.nodes, savedData.links);
  } else {
    const initialData = controller.getInitialDataset();
    loadData(initialData.nodes, initialData.links);
  }
};

/**
 * Show dialog using dialog service
 * @param {Function} getDialogConfig - Function that returns dialog configuration
 */
const showDialog = async (getDialogConfig) => {
  if (!controller) {
    handleStatusChange('Graph is still loading. Please wait...', 'error');
    return;
  }

  const dialogService = controller.getDialogService();
  const config = getDialogConfig();

  if (!config) {
    // Dialog service handles validation and returns null if preconditions not met
    // Fallback error message (specific validation messages come from the service)
    handleStatusChange('Unable to show dialog. Please check prerequisites.', 'error');
    return;
  }

  dialogTitle.value = config.title;
  dialogFields.value = config.fields;
  dialogAction.value = config.action;

  await nextTick();
  dialogVisible.value = true;
};

/**
 * Show dialog for adding parents
 */
const handleAddParents = async () => {
  const validation = controller?.canAddParents();
  if (validation && !validation.canAdd) {
    handleStatusChange(validation.message, 'error');
    return;
  }
  await showDialog(() => controller?.getDialogService().getAddParentsDialog());
};

/**
 * Show dialog for adding sibling
 */
const handleAddSibling = () => {
  showDialog(() => controller?.getDialogService().getAddSiblingDialog());
};

/**
 * Show dialog for adding grandparents
 */
const handleAddGrandparents = () => {
  showDialog(() => controller?.getDialogService().getAddGrandparentsDialog());
};

/**
 * Show dialog for adding uncle/aunt
 */
const handleAddUncleAunt = () => {
  showDialog(() => controller?.getDialogService().getAddUncleAuntDialog());
};

/**
 * Show dialog for adding cousin
 */
const handleAddCousin = () => {
  showDialog(() => controller?.getDialogService().getAddCousinDialog());
};

/**
 * Show dialog for adding child
 */
const handleAddChild = () => {
  showDialog(() => controller?.getDialogService().getAddChildDialog());
};

/**
 * Show dialog for adding niece/nephew
 */
const handleAddNieceNephew = () => {
  showDialog(() => controller?.getDialogService().getAddNieceNephewDialog());
};

/**
 * Show dialog for adding partner
 */
const handleAddPartner = () => {
  showDialog(() => controller?.getDialogService().getAddPartnerDialog());
};

/**
 * Handle dialog confirm
 * @param {Array} values - Array of field values
 */
const handleDialogConfirm = (values) => {
  if (!controller || !dialogAction.value) return;

  dialogVisible.value = false;

  const dialogService = controller.getDialogService();
  const result = dialogService.executeAction(dialogAction.value, values, controller.getOperations());

  if (result.success) {
    if (result.message) {
      handleStatusChange(result.message, 'info');
    }
    // Update color scale after adding node
    if (graphInstance.value) {
      graphInstance.value.updateVisualEncoding({
        colorBy: 'group',
        colorScheme: 'categorical',
        preserveZoom: true
      });
    }
  } else {
    handleStatusChange(result.message || 'Failed to add relative', 'error');
  }

  dialogAction.value = null;
};

/**
 * Handle dialog cancel
 */
const handleDialogCancel = () => {
  dialogVisible.value = false;
  dialogAction.value = null;
};

/**
 * Handle save family
 */
const handleSaveFamily = () => {
  if (!controller) return;
  controller.saveFamily();
};

/**
 * Handle save image
 */
const handleSaveImage = () => {
  if (!controller) return;
  controller.saveAsPNG('family-tree.png');
};

/**
 * Handle lock graph
 */
const handleLockGraph = () => {
  if (!controller) return;
  controller.lockGraph();
};

/**
 * Handle unlock graph
 */
const handleUnlockGraph = () => {
  if (!controller) return;
  controller.unlockGraph();
};

/**
 * Handle reset tree
 */
const handleResetTree = () => {
  if (!controller) return;
  if (confirm('Are you sure you want to reset your family tree?')) {
    controller.resetFamily();
  }
};

/**
 * Handle apply layout
 */
const handleApplyLayout = async () => {
  if (!controller || !selectedLayout.value) return;

  try {
    applyingLayout.value = true;
    const result = await controller.applyLayout(selectedLayout.value);

    if (result.success) {
      // Layout applied successfully - status message already shown by controller
    } else {
      handleStatusChange(result.error || 'Failed to apply layout', 'error');
    }
  } catch (err) {
    console.error('Layout error:', err);
    handleStatusChange(`Layout failed: ${err.message}`, 'error');
  } finally {
    applyingLayout.value = false;
  }
};

// Watch for graph instance to be ready, then initialize
watch(graphInstance, (newInstance) => {
  if (newInstance && !controller) {
    initializeFamily();
  }
}, { immediate: true });

// Cleanup on unmount
onUnmounted(() => {
  if (controller) {
    controller.dispose();
  }
});
</script>
