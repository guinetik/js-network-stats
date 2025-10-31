<template>
  <DemoLayout>
    <template #controls>
      <!-- Header -->
      <div class="demo-controls-header">
        <h1 class="demo-controls-title">
          🕸️ Interactive Network Graph
        </h1>
        <p class="demo-controls-description">
          Explore network analysis in real-time. Add nodes, remove them, and watch the graph update dynamically.
        </p>
      </div>

      <!-- What is this? -->
      <div class="info-box-blue mb-4">
        <h2 class="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
          What is this?
        </h2>
        <p class="text-sm text-blue-800 dark:text-blue-200">
          This interactive visualization demonstrates <strong>network analysis</strong>.
          Node size represents centrality: larger nodes are more influential in the network.
        </p>
      </div>

      <!-- Status Section - Fixed at top when scrolling -->
      <div class="sticky top-0 z-20 bg-white/98 dark:bg-gray-800/98 backdrop-blur-md border-b border-[var(--color-border)] pb-4 mb-4 -mx-6 px-6 pt-4 -mt-2 overflow-x-hidden">
        <h2 class="demo-controls-section-title mb-3">Status</h2>

        <div class="bg-[var(--color-bg-secondary)] rounded-md p-4 text-sm shadow-sm border border-[var(--color-border)]">
          <div v-if="!statusMessage" class="text-secondary text-center py-2">
            <div class="text-xs">Ready for operations</div>
            <div class="text-xs mt-1 opacity-60">Hover over nodes to see details</div>
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

      <!-- Controls Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Controls</h2>
        <div class="grid grid-cols-3 gap-2">
          <button
            @click="handleAddRandomNode"
            class="btn-primary text-sm px-2 py-2 whitespace-nowrap"
            title="Add a random node connected to a random existing node"
          >
            ➕ Add
          </button>

          <button
            @click="handleAddToAlice"
            class="btn-secondary text-sm px-2 py-2 whitespace-nowrap"
            title="Add a node connected to Alice"
          >
            🔗 To Alice
          </button>

          <button
            @click="handleRemoveRandomNode"
            class="btn-primary bg-red-600 hover:bg-red-700 text-sm px-2 py-2 whitespace-nowrap"
            title="Remove a random node"
          >
            ➖ Remove
          </button>
        </div>
      </div>

      <!-- Data Loading Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Load Dataset</h2>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-secondary">
            Choose Dataset:
          </label>
          <select
            v-model="selectedDataset"
            class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md"
          >
            <option value="default">Default Inline (15 nodes)</option>
            <option value="karate">Karate Club JSON (34 nodes)</option>
            <option value="miserables">Les Misérables CSV (77 nodes)</option>
          </select>
        </div>

        <button
          @click="handleLoadDataset"
          :disabled="loading"
          class="w-full btn-primary mt-3"
        >
          <span v-if="!loading">📊 Load Dataset</span>
          <span v-else>⏳ Loading...</span>
        </button>
      </div>

      <!-- Network Analysis Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Network Analysis</h2>

        <button
          @click="handleAnalyzeGraph"
          :disabled="loading"
          class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-md font-semibold transition-colors"
        >
          <span v-if="!loading">🧮 Analyze Network (Web Workers)</span>
          <span v-else>⏳ Analyzing...</span>
        </button>

        <div v-if="loading && analysisProgress > 0" class="mt-2">
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-green-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${analysisProgress * 100}%` }"
            ></div>
          </div>
          <p class="text-xs text-secondary mt-1 text-center">
            {{ Math.round(analysisProgress * 100) }}%
          </p>
        </div>

        <div class="info-box-green mt-3">
          <p class="text-xs text-green-800 dark:text-green-200">
            <strong>Uses @guinetik/network-js:</strong> Computes degree, eigenvector centrality,
            and betweenness in web workers for optimal performance.
          </p>
        </div>
      </div>

      <!-- Layout Algorithm Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Layout Algorithm</h2>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-secondary">
            Choose Layout:
          </label>
          <select
            v-model="selectedLayout"
            class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md"
          >
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
          :disabled="loading"
          class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-md font-semibold transition-colors mt-3"
        >
          <span v-if="!loading">🎯 Apply Layout</span>
          <span v-else>⏳ Applying...</span>
        </button>

        <div v-if="selectedLayout !== 'none'" class="info-box-yellow mt-3">
          <p class="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>{{ availableLayouts.find(l => l.id === selectedLayout)?.name }}:</strong>
            {{ availableLayouts.find(l => l.id === selectedLayout)?.description }}
          </p>
        </div>
      </div>

      <!-- Community Detection Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">🎨 Community Detection</h2>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-secondary">
            Choose Algorithm:
          </label>
          <select
            v-model="selectedCommunityAlgorithm"
            class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md"
          >
            <option
              v-for="algo in availableCommunityAlgorithms"
              :key="algo.id"
              :value="algo.id"
            >
              {{ algo.name }}
            </option>
          </select>
        </div>

        <button
          @click="handleDetectCommunities"
          :disabled="loading"
          class="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-md font-semibold transition-colors mt-3"
        >
          <span v-if="!loading">🎨 Detect Communities</span>
          <span v-else>⏳ Detecting...</span>
        </button>

        <div v-if="communityResult" class="info-box-green mt-3">
          <p class="text-sm text-green-800 dark:text-green-200 space-y-1">
            <div><strong>Communities Found:</strong> {{ communityResult.numCommunities }}</div>
            <div><strong>Modularity:</strong> {{ communityResult.modularity.toFixed(3) }}</div>
            <div class="text-xs mt-2">Node colors represent community assignments</div>
          </p>
        </div>

        <div v-if="availableCommunityAlgorithms.length > 0 && !communityResult" class="info-box-yellow mt-3">
          <p class="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>{{ availableCommunityAlgorithms.find(a => a.id === selectedCommunityAlgorithm)?.name }}:</strong>
            {{ availableCommunityAlgorithms.find(a => a.id === selectedCommunityAlgorithm)?.description }}
          </p>
        </div>
      </div>

      <!-- Instructions Box -->
      <div class="info-box-purple">
        <h3 class="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">
          💡 How to interact
        </h3>
        <ul class="text-sm text-purple-800 dark:text-purple-200 space-y-1">
          <li>🖱️ <strong>Drag nodes</strong> to reposition them</li>
          <li>🔍 <strong>Scroll</strong> to zoom in/out</li>
          <li>👆 <strong>Drag background</strong> to pan</li>
          <li>💬 <strong>Hover nodes</strong> to see detailed information</li>
          <li>📊 <strong>Node size</strong> = centrality</li>
          <li>🎨 <strong>Color</strong> = group/community</li>
        </ul>
      </div>

      <!-- Metrics Explanation -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h3 class="text-sm font-semibold text-primary mb-2">
          📈 About Network Analysis
        </h3>
        <p class="text-sm text-secondary mb-2">
          Network centrality measures how important a node is within the network structure.
        </p>
        <p class="text-sm text-secondary">
          More central nodes have more connections or connections to other important nodes.
        </p>
      </div>
    </template>

    <template #graph>
      <!-- Loading Overlay -->
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 z-10"
      >
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
          <p class="text-secondary">{{ loadingMessage }}</p>
        </div>
      </div>

      <!-- D3 Graph Container -->
      <div ref="graphContainer" class="w-full h-full"></div>
    </template>
  </DemoLayout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import DemoLayout from '../components/DemoLayout.vue';
import { useNetworkGraph } from '../composables/useNetworkGraph';
import { ShowcaseController } from '../lib/ShowcaseController';

// Use the network graph composable (must be at top level)
const graphComposable = useNetworkGraph();
const {
  graphContainer,
  graphInstance,
  loading,
  loadData,
  addNode,
  removeNode,
  hasNode,
  getNodeIds,
  analysisProgress,
  analyzeGraph,
  applyLayout,
  getAvailableLayouts,
  detectCommunities,
  getAvailableCommunityAlgorithms
} = graphComposable;

// Local state (Vue-specific reactive data)
const selectedDataset = ref('default');
const selectedLayout = ref('none');
const availableLayouts = ref([]);
const selectedCommunityAlgorithm = ref('louvain');
const availableCommunityAlgorithms = ref([]);
const communityResult = ref(null);
const statusMessage = ref('');
const statusType = ref('info');
const loadingMessage = ref('Loading graph...');

// Controller instance (business logic)
let controller = null;

/**
 * Status change callback for the controller
 * 
 * @param {string} message - Status message
 * @param {string} type - Status type
 */
const handleStatusChange = (message, type) => {
  statusMessage.value = message;
  statusType.value = type;
  setTimeout(() => { statusMessage.value = ''; }, type === 'error' ? 5000 : 3000);
};


/**
 * Initialize controller and load initial data
 */
const initializeShowcase = () => {
  // Create controller with graph manager using the composable functions
  const graphManager = {
    graphInstance,
    loadData,
    addNode,
    removeNode,
    hasNode,
    getNodeIds,
    analyzeGraph,
    applyLayout,
    getAvailableLayouts,
    detectCommunities,
    getAvailableCommunityAlgorithms
  };

  controller = new ShowcaseController({
    graphManager,
    onStatusChange: handleStatusChange
  });

  // Load initial data
  const initialData = controller.getInitialDataset();
  loadData(initialData.nodes, initialData.links);

  // Get available layouts and community algorithms
  availableLayouts.value = controller.getAvailableLayouts();
  availableCommunityAlgorithms.value = controller.getAvailableCommunityAlgorithms();
  
  console.log('Initial data loaded', { 
    layouts: availableLayouts.value.length,
    communityAlgorithms: availableCommunityAlgorithms.value.length,
    nodes: initialData.nodes.length 
  });
};

/**
 * Add a random node connected to another random node
 */
const handleAddRandomNode = () => {
  if (!controller) return;
  controller.addRandomNode();
};

/**
 * Add a node connected to "Alice"
 */
const handleAddToAlice = () => {
  if (!controller) return;
  controller.addNodeConnectedTo('Alice');
};

/**
 * Remove a random node from the graph
 */
const handleRemoveRandomNode = () => {
  if (!controller) return;
  controller.removeRandomNode();
};

/**
 * Load selected dataset
 */
const handleLoadDataset = async () => {
  if (!controller) return;

  try {
    loading.value = true;
    const result = await controller.loadDataset(selectedDataset.value);
    
    if (result.success) {
      loadingMessage.value = `Loading ${result.name} dataset...`;
    }
  } catch (err) {
    console.error('Failed to load dataset:', err);
  } finally {
    loading.value = false;
  }
};

/**
 * Run analysis on current graph
 */
const handleAnalyzeGraph = async () => {
  if (!controller) return;

  try {
    loadingMessage.value = 'Analyzing network using workers...';
    await controller.analyzeGraph(['degree', 'eigenvector', 'betweenness']);
  } catch (err) {
    console.error('Analysis error:', err);
  }
};

/**
 * Apply selected layout algorithm
 */
const handleApplyLayout = async () => {
  if (!controller) return;

  try {
    loadingMessage.value = `Applying ${selectedLayout.value} layout...`;
    await controller.applyLayout(selectedLayout.value);
  } catch (err) {
    console.error('Layout error:', err);
  }
};

/**
 * Detect communities in the graph
 */
const handleDetectCommunities = async () => {
  if (!controller) return;

  try {
    loadingMessage.value = `Detecting communities using ${selectedCommunityAlgorithm.value}...`;
    const result = await controller.detectCommunities(selectedCommunityAlgorithm.value);
    
    if (result) {
      communityResult.value = result;
    }
  } catch (err) {
    console.error('Community detection error:', err);
  }
};

// Watch for graph instance to be ready, then initialize
watch(graphInstance, (newInstance) => {
  if (newInstance && !controller) {
    initializeShowcase();
  }
}, { immediate: true });
</script>
