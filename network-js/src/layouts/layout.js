// NOTE: NetworkStats is imported lazily in _ensureStats() to avoid circular dependency
// (index.js imports from layouts/, and layouts/ would import from index.js)

/**
 * Abstract base class for graph layout algorithms.
 * Layout classes compute node positions (x, y coordinates) based on graph structure and statistics.
 *
 * **Design Pattern**: Strategy pattern for swappable layout algorithms
 * **Separation of Concerns**: Pure position computation (no rendering logic)
 *
 * @abstract
 * @class
 * @example
 * // Extend to create custom layout
 * class MyLayout extends Layout {
 *   getRequiredStats() { return ['degree']; }
 *   computePositions(options) {
 *     // Return { nodeId: { x, y } }
 *   }
 * }
 *
 * // Use with pre-computed stats
 * const layout = new MyLayout(graph, stats);
 * const positions = layout.getPositions();
 *
 * // Or let layout compute stats
 * const layout2 = new MyLayout(graph);
 * const positions2 = layout2.getPositions();
 */
export class Layout {
  /**
   * Create a new layout instance.
   *
   * @param {Graph} graph - The graph structure to layout
   * @param {Array<Object>|null} [stats=null] - Pre-computed network statistics from NetworkStats.analyze()
   * @param {Object} [options={}] - Layout-specific configuration options
   * @throws {Error} If graph is null or undefined
   * @example
   * import { Graph } from '../graph.js';
   * import { ForceDirectedLayout } from './force-directed.js';
   *
   * const graph = new Graph();
   * graph.addNodesFrom(['A', 'B', 'C']);
   * graph.addEdge('A', 'B', 1);
   *
   * const layout = new ForceDirectedLayout(graph, null, {
   *   width: 800,
   *   height: 600
   * });
   */
  constructor(graph, stats = null, options = {}) {
    if (!graph) {
      throw new Error('Graph is required for layout computation');
    }

    /**
     * The graph structure to layout
     * @type {Graph}
     * @protected
     */
    this.graph = graph;

    /**
     * Pre-computed network statistics (or null if not provided)
     * @type {Array<Object>|null}
     * @protected
     */
    this.stats = stats;

    /**
     * Layout configuration options
     * @type {Object}
     * @protected
     */
    this.options = options;

    /**
     * Cached node positions
     * @type {Object|null}
     * @private
     */
    this._positions = null;
  }

  /**
   * Get the list of network statistics required by this layout algorithm.
   * Override this method in subclasses to declare dependencies.
   *
   * @abstract
   * @returns {string[]} Array of feature names from NetworkStats.FEATURES
   * @example
   * class MyLayout extends Layout {
   *   getRequiredStats() {
   *     return ['degree', 'betweenness'];
   *   }
   * }
   */
  getRequiredStats() {
    return [];
  }

  /**
   * Ensure all required statistics are available, computing them if necessary.
   * This method checks if stats were provided in the constructor, and if not,
   * computes only the required features using NetworkStats.
   *
   * @protected
   * @returns {Promise<Object>} Map of node IDs to their statistics
   * @example
   * // In a subclass method:
   * const stats = await this.ensureStats();
   * const degree = stats['nodeA'].degree;
   */
  async ensureStats() {
    const required = this.getRequiredStats();

    // If no stats needed, return empty object
    if (required.length === 0) {
      return {};
    }

    // If stats already provided, convert array to map
    if (this.stats && Array.isArray(this.stats)) {
      return this.stats.reduce((map, nodeStat) => {
        map[nodeStat.id] = nodeStat;
        return map;
      }, {});
    }

    // Need to compute stats - convert graph to network format
    const network = this._graphToNetwork();

    // Lazy import NetworkStats to avoid circular dependency
    // (We can't import it at the top because index.js imports from layouts/)
    const { NetworkStats } = await import('../index.js');

    // Compute only required features
    const analyzer = new NetworkStats({ verbose: false });
    const computedStats = analyzer.analyze(network, required);

    // Store for future use
    this.stats = computedStats;

    // Convert to map
    return computedStats.reduce((map, nodeStat) => {
      map[nodeStat.id] = nodeStat;
      return map;
    }, {});
  }

  /**
   * Convert Graph object to network array format for NetworkStats.analyze()
   *
   * @private
   * @returns {Array<Object>} Network array with {source, target, weight} objects
   */
  _graphToNetwork() {
    const network = [];
    const nodes = this.graph.getNodeList();

    // Iterate through all nodes and their edges
    for (const node of nodes) {
      const neighbors = this.graph.getNeighbors(node);
      for (const neighbor of neighbors) {
        // Only add each edge once (avoid duplicates in undirected graph)
        if (node < neighbor) {
          const weight = this.graph.getEdgeWeight(node, neighbor);
          network.push({
            source: node,
            target: neighbor,
            weight: weight
          });
        }
      }
    }

    return network;
  }

  /**
   * Compute node positions based on the layout algorithm.
   * This is the main method that subclasses must implement.
   *
   * @abstract
   * @param {Object} [options={}] - Layout-specific options (merged with constructor options)
   * @returns {Object} Map of node IDs to {x, y} coordinates
   * @throws {Error} If called on abstract base class
   * @example
   * // Subclass implementation:
   * computePositions(options = {}) {
   *   const { width = 800, height = 600 } = { ...this.options, ...options };
   *   const positions = {};
   *
   *   this.graph.nodes().forEach((node, i) => {
   *     positions[node] = {
   *       x: Math.random() * width,
   *       y: Math.random() * height
   *     };
   *   });
   *
   *   return positions;
   * }
   */
  computePositions(options = {}) {
    throw new Error('computePositions() must be implemented by subclass');
  }

  /**
   * Get node positions, computing them if not already cached.
   * This is the main public API method that adapters should call.
   *
   * @param {Object} [options={}] - Layout options to override defaults
   * @param {boolean} [forceRecompute=false] - Force recomputation even if cached
   * @returns {Promise<Object>} Map of node IDs to {x, y} coordinates
   * @example
   * const layout = new ForceDirectedLayout(graph);
   * const positions = await layout.getPositions();
   * // positions = { 'A': {x: 100, y: 200}, 'B': {x: 300, y: 150}, ... }
   */
  async getPositions(options = {}, forceRecompute = false) {
    if (!this._positions || forceRecompute) {
      this._positions = await this.computePositions(options);
    }
    return this._positions;
  }

  /**
   * Update layout iteratively (for algorithms that support incremental refinement).
   * Subclasses can override this to support step-by-step layout animation.
   *
   * @param {number} [iterations=1] - Number of iterations to perform
   * @returns {Object} Updated positions map
   * @example
   * // Initial positions
   * const positions = layout.getPositions();
   *
   * // Refine layout over multiple frames
   * for (let i = 0; i < 100; i++) {
   *   const updated = layout.updateLayout(1);
   *   // Render updated positions
   * }
   */
  updateLayout(iterations = 1) {
    // Default: re-compute (non-iterative)
    return this.getPositions({}, true);
  }

  /**
   * Reset cached positions and stats.
   * Useful when graph structure changes.
   *
   * @example
   * graph.addEdge('A', 'B', 1);
   * layout.reset(); // Invalidate cache
   * const newPositions = layout.getPositions();
   */
  reset() {
    this._positions = null;
    this.stats = null;
  }

  /**
   * Get all nodes in the graph.
   * Convenience method for subclasses.
   *
   * @protected
   * @returns {Array} Array of node IDs
   */
  getNodes() {
    return this.graph.getNodeList();
  }

  /**
   * Get the number of nodes in the graph.
   * Convenience method for subclasses.
   *
   * @protected
   * @returns {number} Node count
   */
  getNodeCount() {
    return this.graph.numberOfNodes();
  }
}

export default Layout;
