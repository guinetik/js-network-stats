/**
 * Abstract base class for graph layout algorithms.
 * All layout algorithms delegate computation to web workers for performance.
 *
 * **NEW: Worker-First Architecture**
 * - All computation happens in workers
 * - All methods are async
 * - No duplicate logic in main thread
 *
 * **Design Pattern**: Strategy pattern for swappable layout algorithms
 * **Separation of Concerns**: Pure position computation (no rendering logic)
 *
 * @abstract
 * @class
 * @example
 * // Extend to create custom layout
 * class MyLayout extends Layout {
 *   constructor(graph, options) {
 *     super(graph, options, 'my_layout'); // workerType
 *   }
 *   // computePositions() inherited - delegates to workers!
 * }
 *
 * // Use layout
 * const layout = new MyLayout(graph);
 * const positions = await layout.getPositions(); // NOW ASYNC!
 */

import WorkerManager from '../compute/WorkerManager.js';

export class Layout {
  /**
   * Create a new layout instance.
   *
   * @param {Graph} graph - The graph structure to layout
   * @param {Object} [options={}] - Layout-specific configuration options
   * @param {Object} computeConfig - Compute function configuration
   * @param {string} computeConfig.module - Module path containing compute function
   * @param {string} computeConfig.functionName - Name of compute function to call
   * @throws {Error} If graph is null or undefined
   * @example
   * import { Graph } from '../graph.js';
   * import { ForceDirectedLayout } from './force-directed.js';
   *
   * const graph = new Graph();
   * graph.addNodesFrom(['A', 'B', 'C']);
   * graph.addEdge('A', 'B', 1);
   *
   * const layout = new ForceDirectedLayout(graph, {
   *   width: 800,
   *   height: 600,
   *   iterations: 100
   * });
   */
  constructor(graph, options = {}, computeConfig = null) {
    if (!graph) {
      throw new Error('Graph is required for layout computation');
    }

    if (!computeConfig || !computeConfig.module || !computeConfig.functionName) {
      throw new Error('computeConfig with module and functionName is required');
    }

    /**
     * The graph structure to layout
     * @type {Graph}
     * @protected
     */
    this.graph = graph;

    /**
     * Layout configuration options
     * @type {Object}
     * @protected
     */
    this.options = options;

    /**
     * Compute function configuration
     * @type {Object}
     */
    this.computeConfig = computeConfig;

    /**
     * Cached node positions
     * @type {Object|null}
     * @private
     */
    this._positions = null;
  }

  /**
   * Compute node positions based on the layout algorithm.
   * Delegates computation to web workers for performance.
   *
   * **ASYNC**: All layout computation is asynchronous
   *
   * @param {Object} [options={}] - Layout-specific options (merged with constructor options)
   * @param {Function} [options.onProgress] - Progress callback (0-1)
   * @param {number} [options.timeout] - Task timeout override
   * @returns {Promise<Object>} Map of node IDs to {x, y} coordinates
   * @example
   * const positions = await layout.computePositions({
   *   iterations: 200,
   *   onProgress: (p) => console.log(`${Math.round(p * 100)}%`)
   * });
   */
  async computePositions(options = {}) {
    // Merge options
    const mergedOptions = { ...this.options, ...options };

    // Extract execution options
    const { onProgress, timeout, ...layoutOptions } = mergedOptions;

    // Serialize graph for worker
    const graphData = WorkerManager.serializeGraph(this.graph);

    // Prepare task for dynamic import worker
    const task = {
      module: this.computeConfig.module,
      functionName: this.computeConfig.functionName,
      args: [graphData, layoutOptions]
    };

    // Execute in worker
    const result = await WorkerManager.execute(task, {
      onProgress,
      timeout
    });

    return result;
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
   * @returns {Promise<Object>} Updated positions map
   * @example
   * // Initial positions
   * const positions = await layout.getPositions();
   *
   * // Refine layout over multiple frames
   * for (let i = 0; i < 100; i++) {
   *   const updated = await layout.updateLayout(1);
   *   // Render updated positions
   * }
   */
  async updateLayout(iterations = 1) {
    // Default: re-compute (non-iterative)
    return this.getPositions({}, true);
  }

  /**
   * Reset cached positions.
   * Useful when graph structure changes.
   *
   * @example
   * graph.addEdge('A', 'B', 1);
   * layout.reset(); // Invalidate cache
   * const newPositions = await layout.getPositions();
   */
  reset() {
    this._positions = null;
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
