/**
 * useNetworkGraph - Vue Composable for NetworkGraphD3
 *
 * Provides a Vue-friendly interface for the standalone NetworkGraphD3 component.
 * Handles lifecycle management, reactivity, and cleanup.
 *
 * @example
 * import { useNetworkGraph } from '@/composables/useNetworkGraph';
 *
 * const {
 *   graphContainer,
 *   graphInstance,
 *   loading,
 *   loadData
 * } = useNetworkGraph();
 *
 * // In template: <div ref="graphContainer"></div>
 */

import { ref, onMounted, onUnmounted, watch } from 'vue';
import { NetworkGraphD3 } from '../lib/NetworkGraphD3';
import { NetworkAnalyzer } from '../lib/NetworkAnalyzer';
import { createLogger } from '@guinetik/logger';

const log = createLogger({
  prefix: 'useNetworkGraph',
  level: import.meta.env.DEV ? 'debug' : 'info'
});

export function useNetworkGraph(options = {}) {
  const graphContainer = ref(null);
  const graphInstance = ref(null);
  const analyzer = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const nodeInfo = ref(null);
  const analysisProgress = ref(0);
  
  // Auto-compute eigenvector centrality when graph changes
  const autoComputeCentrality = options.autoComputeCentrality !== false; // Default to true

  /**
   * Initialize the graph once the container is mounted
   */
  const initGraph = () => {
    if (!graphContainer.value) {
      log.warn('Container ref not ready');
      return;
    }

    if (graphInstance.value) {
      log.warn('Graph already initialized');
      return;
    }

    try {
      loading.value = true;
      log.debug('Initializing graph', { options });

      // Get container dimensions
      const rect = graphContainer.value.getBoundingClientRect();
      const width = rect.width || options.width || 800;
      const height = rect.height || options.height || 600;

      // Create graph instance
      graphInstance.value = new NetworkGraphD3(graphContainer.value, {
        width,
        height,
        ...options
      });

      // Create analyzer instance
      analyzer.value = new NetworkAnalyzer();

      // Setup event handlers
      graphInstance.value.on('nodeHover', (node) => {
        nodeInfo.value = node;
      });

      graphInstance.value.on('nodeLeave', () => {
        nodeInfo.value = null;
      });

      loading.value = false;
      log.info('Graph and analyzer initialized successfully');
    } catch (err) {
      log.error('Failed to initialize graph', { error: err.message, stack: err.stack });
      error.value = err.message;
      loading.value = false;
    }
  };

  /**
   * Load data into the graph
   * @param {Array} nodes - Array of node objects
   * @param {Array} links - Array of link objects
   */
  const loadData = (nodes, links) => {
    if (!graphInstance.value) {
      log.warn('Graph not initialized yet');
      return;
    }

    try {
      loading.value = true;
      log.debug('Loading data into graph', { nodeCount: nodes.length, linkCount: links.length });
      
      // Listen for ready event - this will hide spinner and zoom to fit
      const readyHandler = () => {
        loading.value = false;
        graphInstance.value.off('ready', readyHandler);
        log.info('Graph ready and fitted to view');
        
        // Auto-compute eigenvector centrality after data is loaded
        // This happens automatically when loading from localStorage or initial data
        if (autoComputeCentrality && graphInstance.value?.data?.nodes?.length >= 2) {
          // Use requestAnimationFrame to defer computation until after render
          requestAnimationFrame(() => {
            autoComputeEigenvector();
          });
        }
      };
      
      graphInstance.value.on('ready', readyHandler);
      graphInstance.value.setData(nodes, links);
      
      // If ready event doesn't fire (shouldn't happen), set timeout as fallback
      // But user said no setTimeout... so we rely on the event
    } catch (err) {
      log.error('Failed to load data', { error: err.message, stack: err.stack });
      error.value = err.message;
      loading.value = false;
    }
  };

  /**
   * Auto-compute eigenvector centrality and update node sizes
   * Called automatically after graph changes if autoComputeCentrality is enabled
   */
  const autoComputeEigenvector = async () => {
    if (!autoComputeCentrality || !graphInstance.value || !analyzer.value) {
      return;
    }

    // Need at least 2 nodes for eigenvector centrality
    if (!graphInstance.value.data || graphInstance.value.data.nodes.length < 2) {
      return;
    }

    try {
      log.debug('Auto-computing eigenvector centrality');
      
      const currentData = graphInstance.value.data;
      const enrichedData = await analyzer.value.analyzeGraph(
        currentData.nodes,
        currentData.links,
        {
          features: ['eigenvector'],
          onProgress: () => {} // Silent progress for auto-compute
        }
      );

      // Update node statistics and size by eigenvector
      if (enrichedData && enrichedData.nodes && graphInstance.value.updateNodeStatistics) {
        graphInstance.value.updateNodeStatistics(enrichedData.nodes, 'eigenvector', true);
        log.debug('Auto-computed eigenvector centrality and updated node sizes');
      }
    } catch (err) {
      // Silently fail for auto-compute - don't show errors to user
      log.debug('Auto-compute eigenvector failed (non-critical)', { error: err.message });
    }
  };

  /**
   * Add a node to the graph
   * @param {Array} neighborIds - IDs of nodes to connect to
   * @param {String} nodeId - Optional node ID
   * @param {Number} group - Optional group number
   * @param {Boolean} incremental - If true, adds node without resetting ready state (default: false)
   * @returns {Object} The newly created node
   */
  const addNode = async (neighborIds = [], nodeId = null, group = null, incremental = false) => {
    if (!graphInstance.value) {
      log.warn('Graph not initialized yet');
      return null;
    }

    try {
      log.debug('Adding node', { neighborIds, nodeId, group, incremental });
      let newNode;
      if (incremental && graphInstance.value.addNodeIncremental) {
        newNode = graphInstance.value.addNodeIncremental(neighborIds, nodeId, group);
      } else {
        newNode = graphInstance.value.addNode(neighborIds, nodeId, group);
      }
      
      // Auto-compute eigenvector centrality after adding node
      if (newNode && autoComputeCentrality) {
        // Use requestAnimationFrame to defer computation and avoid blocking UI
        requestAnimationFrame(() => {
          autoComputeEigenvector();
        });
      }
      
      return newNode;
    } catch (err) {
      log.error('Failed to add node', { error: err.message, stack: err.stack });
      error.value = err.message;
      return null;
    }
  };

  /**
   * Remove a node from the graph
   * @param {String} nodeId - ID of node to remove (optional, removes random if not provided)
   * @returns {Boolean} True if node was removed
   */
  const removeNode = (nodeId = null) => {
    if (!graphInstance.value) {
      log.warn('Graph not initialized yet');
      return false;
    }

    try {
      log.debug('Removing node', { nodeId });
      return graphInstance.value.removeNode(nodeId);
    } catch (err) {
      log.error('Failed to remove node', { error: err.message, stack: err.stack });
      error.value = err.message;
      return false;
    }
  };

  /**
   * Add a link between two nodes
   * @param {String} sourceId - Source node ID
   * @param {String} targetId - Target node ID
   * @param {Boolean} incremental - If true, adds link without resetting ready state (default: false)
   * @returns {Boolean} True if link was added
   */
  const addLink = async (sourceId, targetId, incremental = false) => {
    if (!graphInstance.value) {
      console.warn('useNetworkGraph: Graph not initialized yet');
      return false;
    }

    try {
      let linkAdded;
      if (incremental && graphInstance.value.addLinkIncremental) {
        linkAdded = graphInstance.value.addLinkIncremental(sourceId, targetId);
      } else {
        linkAdded = graphInstance.value.addLink(sourceId, targetId);
      }
      
      // Auto-compute eigenvector centrality after adding link
      if (linkAdded && autoComputeCentrality) {
        // Use requestAnimationFrame to defer computation and avoid blocking UI
        requestAnimationFrame(() => {
          autoComputeEigenvector();
        });
      }
      
      return linkAdded;
    } catch (err) {
      console.error('useNetworkGraph: Failed to add link', err);
      error.value = err.message;
      return false;
    }
  };

  /**
   * Get all node IDs in the graph
   * @returns {Array} Array of node IDs
   */
  const getNodeIds = () => {
    if (!graphInstance.value) return [];
    return graphInstance.value.getNodeIds();
  };

  /**
   * Check if a node exists
   * @param {String} nodeId - Node ID to check
   * @returns {Boolean} True if node exists
   */
  const hasNode = (nodeId) => {
    if (!graphInstance.value) return false;
    return graphInstance.value.hasNode(nodeId);
  };

  /**
   * Run network analysis on current graph data
   * @param {Array} features - Metrics to compute (e.g., ['degree', 'eigenvector'])
   * @param {Object} options - Analysis options
   * @param {boolean} options.includeGraphStats - Include graph-level statistics
   * @param {Array} options.graphStats - Specific graph stats to calculate
   * @returns {Promise<Object>} {nodes, links, graphStats?} with enriched data
   */
  const analyzeGraph = async (features = ['degree', 'eigenvector'], options = {}) => {
    if (!graphInstance.value || !analyzer.value) {
      log.warn('Graph or analyzer not initialized');
      return null;
    }

    try {
      loading.value = true;
      analysisProgress.value = 0;
      log.debug('Starting graph analysis', { features, options });

      const currentData = graphInstance.value.data;

      const enrichedData = await analyzer.value.analyzeGraph(
        currentData.nodes,
        currentData.links,
        {
          features,
          includeGraphStats: options.includeGraphStats || false,
          graphStats: options.graphStats,
          onProgress: (progress) => {
            analysisProgress.value = progress;
          }
        }
      );

      log.info('Analysis complete, updating visualization', { 
        nodeCount: enrichedData.nodes.length,
        hasGraphStats: !!enrichedData.graphStats
      });

      // Don't call setData() - nodes were mutated in place
      // Update visual encoding to size by eigenvector (if available)
      const hasEigenvector = features.includes('eigenvector') &&
                             enrichedData.nodes.some(n => n.eigenvector !== undefined);

      if (hasEigenvector) {
        log.debug('Sizing nodes by eigenvector centrality');
        graphInstance.value.updateVisualEncoding({
          sizeBy: 'eigenvector',
          minRadius: 4,
          maxRadius: 20
        });
      } else {
        // Just trigger a D3 update to re-render with new properties
        graphInstance.value.updateGraph();
      }

      loading.value = false;
      analysisProgress.value = 0;

      return enrichedData;
    } catch (err) {
      log.error('Failed to analyze graph', { error: err.message, stack: err.stack, features });
      error.value = err.message;
      loading.value = false;
      analysisProgress.value = 0;
      return null;
    }
  };

  /**
   * Apply a layout algorithm to the graph
   * @param {String} layoutId - Layout algorithm ID
   * @returns {Promise<Boolean>} True if successful
   */
  const applyLayout = async (layoutId) => {
    if (!graphInstance.value || !analyzer.value) {
      log.warn('Graph or analyzer not initialized');
      return false;
    }

    try {
      loading.value = true;
      analysisProgress.value = 0;
      log.debug('Applying layout', { layoutId });

      const currentData = graphInstance.value.data;
      const rect = graphContainer.value.getBoundingClientRect();

      const positions = await analyzer.value.applyLayout(
        layoutId,
        currentData.nodes,
        currentData.links,
        {
          width: rect.width || 800,
          height: rect.height || 600,
          onProgress: (progress) => {
            analysisProgress.value = progress;
          }
        }
      );

      // Apply positions to nodes
      currentData.nodes.forEach(node => {
        const pos = positions[node.id];
        if (pos) {
          node.x = pos.x;
          node.y = pos.y;
          node.fx = pos.x; // Fix in place
          node.fy = pos.y;
        }
      });

      // Listen for ready event - this will hide spinner and fit to view
      const readyHandler = () => {
        loading.value = false;
        analysisProgress.value = 0;
        graphInstance.value.off('ready', readyHandler);
        log.info('Layout applied successfully', { layoutId });
      };
      
      graphInstance.value.on('ready', readyHandler);

      // Update visualization - this will trigger ready event when stable
      graphInstance.value.updateGraph();

      return true;
    } catch (err) {
      log.error('Failed to apply layout', { layoutId, error: err.message, stack: err.stack });
      error.value = err.message;
      loading.value = false;
      analysisProgress.value = 0;
      return false;
    }
  };

  /**
   * Get available layout algorithms
   * @returns {Array} Layout metadata
   */
  const getAvailableLayouts = () => {
    if (!analyzer.value) return [];
    return analyzer.value.getAvailableLayouts();
  };

  /**
   * Get available community detection algorithms
   * @returns {Array} Algorithm metadata
   */
  const getAvailableCommunityAlgorithms = () => {
    if (!analyzer.value) return [];
    return analyzer.value.getAvailableCommunityAlgorithms();
  };

  /**
   * Detect communities in the graph
   * @param {String} algorithmId - Algorithm ID
   * @returns {Promise<Object>} Community detection results
   */
  const detectCommunities = async (algorithmId) => {
    if (!graphInstance.value || !analyzer.value) {
      log.warn('Graph or analyzer not initialized');
      return null;
    }

    try {
      loading.value = true;
      analysisProgress.value = 0;
      log.debug('Detecting communities', { algorithmId });

      const currentData = graphInstance.value.data;

      const result = await analyzer.value.detectCommunities(
        algorithmId,
        currentData.nodes,
        currentData.links,
        {
          onProgress: (progress) => {
            analysisProgress.value = progress;
          }
        }
      );

      log.info('Community detection complete, updating colors', {
        numCommunities: result.numCommunities,
        modularity: result.modularity
      });

      // Update visual encoding to color by community
      // Preserve zoom and don't reset ready state
      graphInstance.value.updateVisualEncoding({
        colorBy: 'community',
        colorScheme: 'categorical',
        preserveZoom: true
      });

      // Visual encoding update is synchronous and doesn't require simulation restart
      // So we can set loading to false immediately
      loading.value = false;
      analysisProgress.value = 0;

      return result;
    } catch (err) {
      log.error('Failed to detect communities', { 
        algorithmId, 
        error: err.message, 
        stack: err.stack 
      });
      error.value = err.message;
      loading.value = false;
      analysisProgress.value = 0;
      return null;
    }
  };

  /**
   * Update visual encoding (node size/color)
   * @param {Object} options - Visual encoding options
   * @param {string} options.sizeBy - Property to size nodes by
   * @param {number} options.minRadius - Minimum node radius
   * @param {number} options.maxRadius - Maximum node radius
   * @param {string} options.colorBy - Property to color nodes by
   * @param {string} options.colorScheme - 'categorical' or 'sequential'
   */
  const updateVisualEncoding = (options = {}) => {
    if (!graphInstance.value) {
      console.warn('useNetworkGraph: Cannot update visual encoding - no graph instance');
      return;
    }

    graphInstance.value.updateVisualEncoding(options);
  };

  /**
   * Lock all node positions at their current locations
   */
  const lockPositions = () => {
    if (!graphInstance.value) {
      log.warn('Graph not initialized yet');
      return;
    }
    graphInstance.value.lockPositions();
  };

  /**
   * Unlock all node positions
   */
  const unlockPositions = () => {
    if (!graphInstance.value) {
      log.warn('Graph not initialized yet');
      return;
    }
    graphInstance.value.unlockPositions();
  };

  /**
   * Export graph as PNG image
   * @param {string} filename - Filename for download
   */
  const saveAsPNG = (filename = 'network-graph.png') => {
    if (!graphInstance.value) {
      log.warn('Graph not initialized yet');
      return;
    }
    graphInstance.value.saveAsPNG(filename);
  };

  /**
   * Destroy the graph and cleanup
   */
  const destroyGraph = async () => {
    if (graphInstance.value) {
      graphInstance.value.destroy();
      graphInstance.value = null;
      log.info('Graph destroyed');
    }

    if (analyzer.value) {
      try {
        await analyzer.value.dispose();
        analyzer.value = null;
        log.info('Analyzer disposed');
      } catch (err) {
        log.warn('Error disposing analyzer', { error: err.message });
        analyzer.value = null;
      }
    }
  };

  // Lifecycle hooks
  onMounted(() => {
    // Use nextTick or setTimeout to ensure DOM is ready
    setTimeout(() => {
      if (graphContainer.value) {
        initGraph();
      }
    }, 0);
  });

  onUnmounted(() => {
    destroyGraph();
  });

  return {
    // Refs
    graphContainer,
    graphInstance,
    loading,
    error,
    nodeInfo,
    analysisProgress,

    // Methods
    initGraph,
    loadData,
    destroyGraph,
    addNode,
    removeNode,
    addLink,
    getNodeIds,
    hasNode,
    analyzeGraph,
    applyLayout,
    getAvailableLayouts,
    detectCommunities,
    getAvailableCommunityAlgorithms,
    updateVisualEncoding,
    lockPositions,
    unlockPositions,
    saveAsPNG
  };
}

export default useNetworkGraph;
