/**
 * Abstract base class for network statistic algorithms.
 * All statistic algorithms delegate computation to web workers for performance.
 *
 * **NEW: Worker-First Architecture**
 * - All computation happens in workers
 * - All methods are async
 * - No duplicate logic in main thread
 *
 * @abstract
 * @class
 * @example
 * class MyStatistic extends StatisticAlgorithm {
 *   constructor(options = {}) {
 *     super('my-statistic', 'My Custom Statistic', 'node', 'my_worker_type');
 *     this.options = options;
 *   }
 *
 *   // calculate() is already implemented to delegate to workers!
 *   // No need to override unless you need custom behavior
 * }
 */

import WorkerManager from '../../compute/WorkerManager.js';

export class StatisticAlgorithm {
  /**
   * Create a statistic algorithm
   *
   * @param {string} name - Algorithm identifier (e.g., 'degree', 'closeness')
   * @param {string} description - Human-readable description
   * @param {string} scope - Either 'node' for per-node stats or 'graph' for graph-level stats
   * @param {Object} computeConfig - Compute function configuration
   * @param {string} computeConfig.module - Module path containing compute function
   * @param {string} computeConfig.functionName - Name of compute function to call
   */
  constructor(name, description = '', scope = 'node', computeConfig = null) {
    if (new.target === StatisticAlgorithm) {
      throw new Error('StatisticAlgorithm is abstract and cannot be instantiated directly');
    }

    if (scope !== 'node' && scope !== 'graph') {
      throw new Error(`Scope must be 'node' or 'graph', got: ${scope}`);
    }

    if (!computeConfig || !computeConfig.module || !computeConfig.functionName) {
      throw new Error('computeConfig with module and functionName is required');
    }

    /**
     * Algorithm identifier
     * @type {string}
     */
    this.name = name;

    /**
     * Algorithm description
     * @type {string}
     */
    this.description = description;

    /**
     * Scope of the statistic: 'node' or 'graph'
     * @type {string}
     */
    this.scope = scope;

    /**
     * Compute function configuration
     * @type {Object}
     */
    this.computeConfig = computeConfig;

    /**
     * Algorithm-specific options
     * @type {Object}
     */
    this.options = {};
  }

  /**
   * Calculate the statistic for a graph.
   * Delegates computation to web workers for performance.
   *
   * **ASYNC**: All calculations are asynchronous
   *
   * @param {Graph} graph - The graph to analyze
   * @param {Array<string>} [nodeIds=null] - Optional subset of nodes to calculate (for node-level stats)
   * @param {Object} [execOptions={}] - Execution options
   * @param {Function} [execOptions.onProgress] - Progress callback (0-1)
   * @param {number} [execOptions.timeout] - Task timeout override
   * @returns {Promise<Object|number>} For node-level: { nodeId: value }, For graph-level: single number
   */
  async calculate(graph, nodeIds = null, execOptions = {}) {
    // Serialize graph for worker
    const graphData = WorkerManager.serializeGraph(graph);

    // Prepare task for dynamic import worker
    const task = {
      module: this.computeConfig.module,
      functionName: this.computeConfig.functionName,
      args: [graphData, nodeIds, this.options]
    };

    // Execute in worker
    const result = await WorkerManager.execute(task, execOptions);

    return result;
  }

  /**
   * Get algorithm metadata
   *
   * @returns {Object} Algorithm information
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description,
      scope: this.scope
    };
  }

  /**
   * Check if this is a node-level statistic
   *
   * @returns {boolean}
   */
  isNodeLevel() {
    return this.scope === 'node';
  }

  /**
   * Check if this is a graph-level statistic
   *
   * @returns {boolean}
   */
  isGraphLevel() {
    return this.scope === 'graph';
  }
}

export default StatisticAlgorithm;
