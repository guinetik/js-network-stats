<template>
  <DemoLayout>
    <template #controls>
      <!-- Header -->
      <div class="demo-controls-header">
        <h1 class="demo-controls-title">
          🔍 Network Explorer
        </h1>
        <p class="demo-controls-description">
          Explore sample networks and upload your own files. Supports CSV, JSON, and NetworkX formats.
        </p>
      </div>

      <!-- What is this? -->
      <div class="info-box-blue mb-4">
        <h2 class="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
          🚀 Parallel Computation Demo
        </h2>
        <p class="text-sm text-blue-800 dark:text-blue-200 mb-3">
          This demo showcases <strong>Web Workers</strong> for parallel network analysis.
          Large networks are processed across multiple CPU cores for faster computation.
        </p>
        <div class="flex items-center gap-2 text-xs">
          <span :class="workerInfo.supported ? 'badge badge-green' : 'badge badge-red'">
            <span v-if="workerInfo.supported">✓ Workers Supported</span>
            <span v-else>✗ Workers Not Supported</span>
          </span>
          <span v-if="workerInfo.supported" class="badge badge-yellow">
            {{ workerInfo.count }} cores
          </span>
        </div>
      </div>

      <!-- Status Section - Fixed at top when scrolling -->
      <div class="sticky top-0 z-20 bg-white/98 dark:bg-gray-800/98 backdrop-blur-md border-b border-[var(--color-border)] pb-4 mb-4 -mx-6 px-6 pt-4 -mt-2 shadow-sm">
        <h2 class="demo-controls-section-title mb-3">Status</h2>

        <div class="bg-[var(--color-bg-secondary)] rounded-md p-4 text-sm shadow-sm border border-[var(--color-border)]">
          <div v-if="!statusMessage" class="text-secondary text-center py-2">
            <div class="text-xs">Ready for operations</div>
            <div class="text-xs mt-1 opacity-60">Load a network to begin</div>
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

      <!-- Data Loading Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Data Loading</h2>

        <!-- Tab Selection -->
        <div class="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4">
          <button
            @click="dataLoadMode = 'sample'"
            :class="dataLoadMode === 'sample' ? 'bg-white dark:bg-gray-700 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-700'"
            class="flex-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
          >
            📊 Sample Networks
          </button>
          <button
            @click="dataLoadMode = 'upload'"
            :class="dataLoadMode === 'upload' ? 'bg-white dark:bg-gray-700 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-700'"
            class="flex-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
          >
            📁 Upload File
          </button>
        </div>

        <!-- Sample Networks Tab -->
        <div v-show="dataLoadMode === 'sample'" class="space-y-2">
          <label class="block text-sm font-medium text-secondary">
            Choose Network:
          </label>
          <select
            v-model="selectedNetwork"
            class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md"
          >
            <option value="">-- Choose a city --</option>
            <option value="caruaru">Caruaru (~130 edges, small)</option>
            <option value="rj">Rio de Janeiro (~1,900 edges, medium)</option>
            <option value="niteroi">Niterói (~18,500 edges, large)</option>
          </select>

          <button
            @click="handleLoadSampleNetwork"
            :disabled="!selectedNetwork || loading"
            class="w-full btn-primary mt-3"
          >
            <span v-if="!loading">📊 Load Network</span>
            <span v-else>⏳ Loading...</span>
          </button>
        </div>

        <!-- Upload File Tab -->
        <div v-show="dataLoadMode === 'upload'" class="space-y-3">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-secondary">
              File Format:
            </label>
            <select
              v-model="uploadFormat"
              class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md"
            >
              <option value="json">JSON (nodes/edges, D3, Cytoscape)</option>
              <option value="csv">CSV (edge list)</option>
              <option value="networkx">NetworkX (node-link, adjacency)</option>
            </select>
          </div>

          <!-- CSV requires edges file + optional nodes file -->
          <div v-show="uploadFormat === 'csv'" class="space-y-2">
            <label class="block text-sm font-medium text-secondary">
              Edges CSV (Required):
            </label>
            <input
              type="file"
              accept=".csv"
              @change="uploadEdgesFile = $event.target.files[0]"
              class="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300"
            />

            <label class="block text-sm font-medium text-secondary mt-2">
              Nodes CSV (Optional):
            </label>
            <input
              type="file"
              accept=".csv"
              @change="uploadNodesFile = $event.target.files[0]"
              class="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300"
            />

            <div class="text-xs text-secondary bg-[var(--color-bg-secondary)] rounded p-2">
              <strong>Edge CSV format:</strong> source,target,weight<br>
              <strong>Node CSV format:</strong> id,group,label,...
            </div>
          </div>

          <!-- JSON/NetworkX require single file -->
          <div v-show="uploadFormat === 'json' || uploadFormat === 'networkx'" class="space-y-2">
            <label class="block text-sm font-medium text-secondary">
              <span v-if="uploadFormat === 'json'">JSON File:</span>
              <span v-else>NetworkX JSON File:</span>
            </label>
            <input
              type="file"
              accept=".json"
              @change="uploadDataFile = $event.target.files[0]"
              class="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300"
            />

            <div v-if="uploadFormat === 'json'" class="text-xs text-secondary bg-[var(--color-bg-secondary)] rounded p-2">
              Supports: Standard (nodes/edges), D3 (nodes/links), Cytoscape, or raw edge list array
            </div>
            <div v-else class="text-xs text-secondary bg-[var(--color-bg-secondary)] rounded p-2">
              Supports: node-link format, adjacency format
            </div>
          </div>

          <button
            @click="handleLoadUploadedNetwork"
            :disabled="!canLoadUpload || loading"
            class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-md font-semibold transition-colors mt-3"
          >
            <span v-if="!loading">📁 Load Uploaded File</span>
            <span v-else>⏳ Loading...</span>
          </button>
        </div>
      </div>

      <!-- Network Statistics -->
      <div v-if="networkLoaded" class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">Network Statistics</h2>

        <div class="metrics-grid-row mb-3">
          <div class="metric-card">
            <div class="text-xs text-secondary">Nodes</div>
            <div class="text-xl font-bold text-purple-600 dark:text-purple-400">{{ stats.nodes }}</div>
          </div>
          <div class="metric-card">
            <div class="text-xs text-secondary">Edges</div>
            <div class="text-xl font-bold text-pink-600 dark:text-pink-400">{{ stats.edges }}</div>
          </div>
          <div class="metric-card">
            <div class="text-xs text-secondary">Avg Degree</div>
            <div class="text-xl font-bold text-blue-600 dark:text-blue-400">{{ stats.avgDegree }}</div>
          </div>
          <div class="metric-card">
            <div class="text-xs text-secondary">Analysis Time</div>
            <div class="text-xl font-bold text-green-600 dark:text-green-400">{{ stats.analysisTime }}</div>
          </div>
          <div v-if="stats.communities" class="metric-card">
            <div class="text-xs text-secondary">Communities</div>
            <div class="text-xl font-bold text-orange-600 dark:text-orange-400">{{ stats.communities }}</div>
          </div>
          <div v-if="stats.modularity" class="metric-card">
            <div class="text-xs text-secondary">Modularity</div>
            <div class="text-xl font-bold text-cyan-600 dark:text-cyan-400">{{ stats.modularity }}</div>
          </div>
        </div>

        <div v-if="useWorkers" class="info-box-green text-xs">
          <span class="font-semibold text-green-800 dark:text-green-300">
            ⚡ Using parallel computation
          </span>
          <span class="text-green-700 dark:text-green-400">
            - {{ workerInfo.count }} workers active
          </span>
        </div>

        <div v-if="!useWorkers && networkLoaded" class="info-box-yellow text-xs">
          <span class="font-semibold text-yellow-800 dark:text-yellow-300">
            ⚠ Single-threaded mode
          </span>
          <span class="text-yellow-700 dark:text-yellow-400">
            - Network too small for workers
          </span>
        </div>
      </div>

      <!-- Network Analysis Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">⚡ Network Analysis (Node Sizes)</h2>

        <div class="bg-[var(--color-bg-secondary)] rounded-md p-4 space-y-2 mb-3">
          <h3 class="text-sm font-semibold text-primary">
            Metrics to Calculate
          </h3>
          <div class="space-y-2">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="selectedFeatures" value="degree" class="rounded">
              <span class="text-secondary">Degree Centrality</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="selectedFeatures" value="betweenness" class="rounded">
              <span class="text-secondary">Betweenness Centrality</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="selectedFeatures" value="clustering" class="rounded">
              <span class="text-secondary">Clustering Coefficient</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="selectedFeatures" value="eigenvector" class="rounded">
              <span class="text-secondary">Eigenvector Centrality</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="selectedFeatures" value="eigenvector-laplacian" class="rounded">
              <span class="text-secondary">Eigenvector (Laplacian) - for Spectral layout</span>
            </label>
          </div>
        </div>

        <div class="space-y-2 mb-3">
          <label class="block text-sm font-medium text-secondary">
            Node Size Based On:
          </label>
          <select
            v-model="selectedSizeMetric"
            :disabled="!networkLoaded || selectedFeatures.length === 0"
            class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md disabled:opacity-50"
          >
            <option value="">-- Select a metric --</option>
            <option v-if="selectedFeatures.includes('degree')" value="degree">Degree</option>
            <option v-if="selectedFeatures.includes('betweenness')" value="betweenness">Betweenness</option>
            <option v-if="selectedFeatures.includes('clustering')" value="clustering">Clustering</option>
            <option v-if="selectedFeatures.includes('eigenvector')" value="eigenvector">Eigenvector</option>
          </select>
        </div>

        <button
          @click="handleAnalyzeGraph"
          :disabled="!networkLoaded || analyzing || selectedFeatures.length === 0"
          class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-md font-semibold transition-colors"
        >
          <span v-if="!analyzing">⚡ Analyze Network</span>
          <span v-else>⏳ Analyzing...</span>
        </button>

        <!-- Progress Bar -->
        <div v-if="analyzing" class="mt-2">
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-purple-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${analysisProgress * 100}%` }"
            ></div>
          </div>
          <p class="text-xs text-secondary mt-1 text-center">
            {{ Math.round(analysisProgress * 100) }}%
          </p>
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
            :disabled="!networkLoaded"
            class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md disabled:opacity-50"
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
          :disabled="!networkLoaded || loading"
          class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-md font-semibold transition-colors"
        >
          <span v-if="!loading">🎯 Apply Layout</span>
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

      <!-- Graph-Level Statistics Results (Persistent) -->
      <div v-if="hasGraphStats" class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-700">
          <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
            📊 Graph Statistics
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-blue-800 dark:text-blue-200">Density:</span>
              <span class="text-sm font-mono text-blue-600 dark:text-blue-400">
                {{ graphStats?.density?.toFixed(4) || '-' }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-blue-800 dark:text-blue-200">Diameter:</span>
              <span class="text-sm font-mono text-blue-600 dark:text-blue-400">
                {{ graphStats?.diameter === Infinity ? '∞' : (graphStats?.diameter || '-') }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-blue-800 dark:text-blue-200">Avg Clustering:</span>
              <span class="text-sm font-mono text-blue-600 dark:text-blue-400">
                {{ graphStats?.['average_clustering']?.toFixed(4) || '-' }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-blue-800 dark:text-blue-200">Avg Path Length:</span>
              <span class="text-sm font-mono text-blue-600 dark:text-blue-400">
                {{ graphStats?.['average_shortest_path'] === Infinity ? '∞' : (graphStats?.['average_shortest_path']?.toFixed(2) || '-') }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-blue-800 dark:text-blue-200">Components:</span>
              <span class="text-sm font-mono text-blue-600 dark:text-blue-400">
                {{ graphStats?.['connected_components'] || '-' }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-blue-800 dark:text-blue-200">Avg Degree:</span>
              <span class="text-sm font-mono text-blue-600 dark:text-blue-400">
                {{ graphStats?.['average_degree']?.toFixed(2) || '-' }}
              </span>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <p class="text-xs text-blue-700 dark:text-blue-300">
              Calculated alongside node metrics
            </p>
          </div>
        </div>
      </div>

      <!-- Community Detection Section -->
      <div class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <h2 class="demo-controls-section-title">🎨 Community Detection (Node Colors)</h2>

        <div class="space-y-2 mb-3">
          <label class="block text-sm font-medium text-secondary">
            Algorithm:
          </label>
          <select
            v-model="selectedCommunityAlgorithm"
            :disabled="!networkLoaded"
            class="w-full bg-secondary text-primary border border-color px-3 py-2 rounded-md disabled:opacity-50"
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
          :disabled="!networkLoaded || detectingCommunities"
          class="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-md font-semibold transition-colors"
        >
          <span v-if="!detectingCommunities">🎨 Detect Communities</span>
          <span v-else>⏳ Detecting...</span>
        </button>
      </div>

      <!-- Community Detection Results (Persistent) -->
      <div v-if="hasCommunities" class="demo-controls-section border-t border-[var(--color-border)] pt-4">
        <div class="bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-900/30 dark:to-pink-900/30 rounded-lg p-4 border-2 border-orange-200 dark:border-orange-700">
          <h3 class="text-sm font-semibold text-orange-900 dark:text-orange-300 mb-3 flex items-center gap-2">
            🎨 Community Detection Results
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-orange-800 dark:text-orange-200">Communities Found:</span>
              <span class="text-lg font-bold text-orange-600 dark:text-orange-400">{{ communityResult?.numCommunities || '-' }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-orange-800 dark:text-orange-200">Modularity Score:</span>
              <span class="text-lg font-bold text-orange-600 dark:text-orange-400">
                {{ communityResult?.modularity?.toFixed(3) || '-' }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-orange-800 dark:text-orange-200">Computation Time:</span>
              <span class="text-sm font-semibold text-orange-600 dark:text-orange-400">{{ communityTime || '-' }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-orange-800 dark:text-orange-200">Algorithm:</span>
              <span class="text-sm font-semibold text-orange-600 dark:text-orange-400">{{ selectedCommunityAlgorithm }}</span>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
            <p class="text-xs text-orange-700 dark:text-orange-300">
              Node colors represent their community assignments
            </p>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="info-box-purple">
        <h3 class="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">💡 How to interact</h3>
        <ul class="text-sm text-purple-800 dark:text-purple-200 space-y-1">
          <li>🖱️ <strong>Drag nodes</strong> to reposition them</li>
          <li>🔍 <strong>Scroll</strong> to zoom in/out</li>
          <li>👆 <strong>Drag background</strong> to pan</li>
          <li>💬 <strong>Hover nodes</strong> to see detailed information</li>
          <li>📊 <strong>Node size</strong> = selected metric</li>
          <li>🎨 <strong>Color</strong> = community</li>
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
import { ref, onMounted, watch, computed } from 'vue';
import DemoLayout from '../components/DemoLayout.vue';
import { useNetworkGraph } from '../composables/useNetworkGraph';
import { ExplorerController } from '../lib/ExplorerController';

// Use the network graph composable
const graphComposable = useNetworkGraph();
const {
  graphContainer,
  graphInstance,
  loading,
  loadData,
  analysisProgress,
  analyzeGraph,
  applyLayout,
  getAvailableLayouts,
  detectCommunities,
  getAvailableCommunityAlgorithms,
  updateVisualEncoding,
  getNodeIds
} = graphComposable;

// Local state
const dataLoadMode = ref('sample'); // 'sample' or 'upload'
const selectedNetwork = ref('');
const uploadFormat = ref('json');
const uploadEdgesFile = ref(null);
const uploadNodesFile = ref(null);
const uploadDataFile = ref(null);
const selectedLayout = ref('none');
const availableLayouts = ref([]);
const selectedFeatures = ref([]);
const selectedSizeMetric = ref('');
const selectedCommunityAlgorithm = ref('louvain');
const availableCommunityAlgorithms = ref([]);
const networkLoaded = ref(false);
const analyzing = ref(false);
const detectingCommunities = ref(false);
const statusMessage = ref('');
const statusType = ref('info');
const loadingMessage = ref('Loading graph...');
const communityResult = ref(null);
const communityTime = ref('-');
const hasCommunities = ref(false);
const graphStats = ref(null);
const hasGraphStats = ref(false);
const useWorkers = ref(false);

// Stats
const stats = ref({
  nodes: 0,
  edges: 0,
  avgDegree: 0,
  analysisTime: '-',
  communities: null,
  modularity: null
});

// Node info
const nodeInfo = ref({
  type: 'default',
  message: 'Select a network to begin...',
  details: null
});

// Controller instance
let controller = null;

// Worker info
const workerInfo = ref({
  supported: typeof Worker !== 'undefined',
  count: navigator.hardwareConcurrency || 4
});

// Computed: Can load uploaded file?
const canLoadUpload = computed(() => {
  if (uploadFormat.value === 'csv') {
    return uploadEdgesFile.value !== null;
  } else {
    return uploadDataFile.value !== null;
  }
});

/**
 * Status change callback for the controller
 */
const handleStatusChange = (message, type) => {
  statusMessage.value = message;
  statusType.value = type;
  setTimeout(() => { statusMessage.value = ''; }, type === 'error' ? 5000 : 3000);
};

/**
 * Set node info display
 */
const setNodeInfo = (type, message, details = null) => {
  nodeInfo.value = { type, message, details };
};

/**
 * Initialize controller and setup event handlers
 */
const initializeExplorer = () => {
  const graphManager = {
    graphInstance,
    loadData,
    analyzeGraph,
    applyLayout,
    getAvailableLayouts,
    detectCommunities,
    getAvailableCommunityAlgorithms,
    updateVisualEncoding,
    getNodeIds
  };

  controller = new ExplorerController({
    graphManager,
    onStatusChange: handleStatusChange
  });

  // Get available layouts and community algorithms
  availableLayouts.value = controller.getAvailableLayouts();
  availableCommunityAlgorithms.value = controller.getAvailableCommunityAlgorithms();

  // Setup node hover handlers
  if (graphInstance.value) {
    graphInstance.value.on('nodeHover', (node) => {
      setNodeInfo('node-hover', `Node: ${node.id}`, {
        id: node.id,
        group: node.group || 1,
        community: hasCommunities.value ? node.community : null,
        centrality: node.centrality?.toFixed(4) || 'N/A',
        degree: node.degree || 'N/A',
        betweenness: node.betweenness?.toFixed(4),
        clustering: node.clustering?.toFixed(3),
        eigenvector: node.eigenvector?.toFixed(4),
        closeness: node.closeness?.toFixed(4),
        egoDensity: node['ego-density']?.toFixed(3),
        cliques: node.cliques
      });
    });

    graphInstance.value.on('nodeLeave', () => {
      if (!networkLoaded.value) {
        setNodeInfo('default', 'Select a network to begin...');
      } else {
        setNodeInfo('default', 'Hover over a node to see details...');
      }
    });
  }
};

/**
 * Load sample network
 */
const handleLoadSampleNetwork = async () => {
  if (!controller || !selectedNetwork.value) return;

  try {
    loading.value = true;
    loadingMessage.value = `Loading ${selectedNetwork.value} network...`;
    setNodeInfo('loading', 'Loading network data...');

    const result = await controller.loadSampleNetwork(selectedNetwork.value);

    if (result.success) {
      networkLoaded.value = true;
      useWorkers.value = result.useWorkers || false;
      stats.value = {
        nodes: result.nodeCount,
        edges: result.edgeCount,
        avgDegree: (2 * result.edgeCount / result.nodeCount).toFixed(2),
        analysisTime: '-',
        communities: null,
        modularity: null
      };
      setNodeInfo('success', `Loaded: ${result.name}`, {
        nodes: result.nodeCount,
        edges: result.edgeCount,
        description: result.description
      });
      // Loading will be set to false by the 'ready' event from the graph
    } else {
      // Error case - set loading to false since ready event won't fire
      loading.value = false;
      setNodeInfo('error', `Failed to load network: ${result.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('Failed to load sample network:', err);
    loading.value = false;
    setNodeInfo('error', `Failed to load network: ${err.message}`);
  }
};

/**
 * Load uploaded network
 */
const handleLoadUploadedNetwork = async () => {
  if (!controller || !canLoadUpload.value) return;

  try {
    loading.value = true;
    loadingMessage.value = 'Loading uploaded file...';
    setNodeInfo('loading', 'Loading uploaded file...');

    const result = await controller.loadUploadedNetwork(
      uploadFormat.value,
      uploadEdgesFile.value,
      uploadNodesFile.value,
      uploadDataFile.value
    );

    if (result.success) {
      networkLoaded.value = true;
      useWorkers.value = result.useWorkers || false;
      stats.value = {
        nodes: result.nodeCount,
        edges: result.edgeCount,
        avgDegree: (2 * result.edgeCount / result.nodeCount).toFixed(2),
        analysisTime: '-',
        communities: null,
        modularity: null
      };
      setNodeInfo('success', `Loaded: ${result.name}`, {
        nodes: result.nodeCount,
        edges: result.edgeCount,
        description: result.description
      });
      // Loading will be set to false by the 'ready' event from the graph
    } else {
      // Error case - set loading to false since ready event won't fire
      loading.value = false;
      setNodeInfo('error', `Failed to load file: ${result.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('Failed to load uploaded network:', err);
    loading.value = false;
    setNodeInfo('error', `Failed to load file: ${err.message}`);
  }
};

/**
 * Run analysis on current graph
 */
const handleAnalyzeGraph = async () => {
  if (!controller || !networkLoaded.value) return;

  try {
    analyzing.value = true;
    loadingMessage.value = 'Analyzing network using workers...';
    setNodeInfo('loading', 'Running network analysis...');

    const startTime = performance.now();
    const result = await controller.analyzeGraph(selectedFeatures.value, selectedSizeMetric.value);
    const duration = performance.now() - startTime;

      if (result.success) {
        stats.value.analysisTime = `${(duration / 1000).toFixed(2)}s`;
        if (result.graphStats) {
          graphStats.value = result.graphStats;
          hasGraphStats.value = true;
        }
        setNodeInfo('success', 'Analysis complete', {
          nodes: result.nodeCount,
          edges: result.linkCount,
          time: stats.value.analysisTime,
          metric: selectedSizeMetric.value || selectedFeatures.value[0]
        });
      }
  } catch (err) {
    console.error('Analysis error:', err);
    setNodeInfo('error', `Analysis failed: ${err.message}`);
  } finally {
    analyzing.value = false;
  }
};

/**
 * Apply selected layout algorithm
 */
const handleApplyLayout = async () => {
  if (!controller || !networkLoaded.value) return;

  try {
    loadingMessage.value = `Applying ${selectedLayout.value} layout...`;
    statusMessage.value = `Applying ${selectedLayout.value} layout...`;
    statusType.value = 'info';
    
    const result = await controller.applyLayout(selectedLayout.value);

    if (result.success) {
      statusMessage.value = `✅ Applied ${selectedLayout.value} layout`;
      statusType.value = 'success';
      setNodeInfo('layout-applied', `Layout Applied: ${selectedLayout.value}`, {
        description: selectedLayout.value === 'none' 
          ? "Using D3's built-in force simulation"
          : 'Nodes fixed in position (D3 physics disabled)'
      });
      setTimeout(() => { statusMessage.value = ''; }, 3000);
    } else {
      const errorMsg = result.error || 'Layout application failed';
      statusMessage.value = `❌ ${errorMsg}`;
      statusType.value = 'error';
      setNodeInfo('error', `Layout failed: ${errorMsg}`);
      setTimeout(() => { statusMessage.value = ''; }, 5000);
    }
  } catch (err) {
    console.error('Layout error:', err);
    const errorMsg = err.message || 'Layout failed';
    statusMessage.value = `❌ ${errorMsg}`;
    statusType.value = 'error';
    setNodeInfo('error', `Layout failed: ${errorMsg}`);
    setTimeout(() => { statusMessage.value = ''; }, 5000);
  }
};

/**
 * Detect communities in the graph
 */
const handleDetectCommunities = async () => {
  if (!controller || !networkLoaded.value) return;

  try {
    detectingCommunities.value = true;
    loadingMessage.value = `Detecting communities using ${selectedCommunityAlgorithm.value}...`;
    setNodeInfo('loading', 'Detecting communities...');

    const startTime = performance.now();
    const result = await controller.detectCommunities(selectedCommunityAlgorithm.value);
    const duration = performance.now() - startTime;

    if (result) {
      communityResult.value = result;
      communityTime.value = `${(duration / 1000).toFixed(2)}s`;
      hasCommunities.value = true;
      stats.value.communities = result.numCommunities;
      stats.value.modularity = result.modularity.toFixed(3);
      setNodeInfo('default', 'Hover over a node to see details...');
    }
  } catch (err) {
    console.error('Community detection error:', err);
    setNodeInfo('error', `Community detection failed: ${err.message}`);
  } finally {
    detectingCommunities.value = false;
  }
};

// Watch for graph instance to be ready, then initialize
watch(graphInstance, (newInstance) => {
  if (newInstance && !controller) {
    initializeExplorer();
  }
}, { immediate: true });
</script>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.metrics-grid-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  overflow-x: auto;
}

.metrics-grid-row .metric-card {
  flex: 0 0 auto;
  min-width: 90px;
}

.metric-card {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.dark .metric-card {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
  border-color: rgba(139, 92, 246, 0.3);
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
}

.badge-green {
  background-color: #dcfce7;
  color: #166534;
}

.dark .badge-green {
  background-color: rgba(22, 101, 52, 0.3);
  color: #86efac;
}

.badge-yellow {
  background-color: #fef3c7;
  color: #92400e;
}

.dark .badge-yellow {
  background-color: rgba(146, 64, 14, 0.3);
  color: #fde047;
}

.badge-red {
  background-color: #fee2e2;
  color: #991b1b;
}

.dark .badge-red {
  background-color: rgba(153, 27, 27, 0.3);
  color: #fca5a5;
}
</style>
