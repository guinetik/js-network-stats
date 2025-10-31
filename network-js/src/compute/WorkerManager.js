/**
 * WorkerManager - Singleton manager for the worker pool
 *
 * Central nervous system for all compute operations in the library.
 * Shared across NetworkStats, CommunityDetection, and Layout systems.
 *
 * @module WorkerManager
 */

import { WorkerPool } from './WorkerPool.js';
import { WorkerAdapter } from './WorkerAdapter.js';
import { createLogger } from '@guinetik/logger';

/**
 * Singleton WorkerManager
 * Manages the lifecycle of the worker pool and provides a unified API
 * for executing tasks across all library components.
 */
class WorkerManager {
  constructor() {
    if (WorkerManager.instance) {
      return WorkerManager.instance;
    }

    this.workerPool = null;
    this.initialized = false;
    this.initPromise = null;
    this.log = createLogger({
      prefix: 'WorkerManager',
      level: 'info' // Can be overridden by verbose option
    });

    WorkerManager.instance = this;
  }

  /**
   * Initialize the worker pool
   *
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.maxWorkers] - Maximum number of workers (default: auto-detect CPU cores)
   * @param {string} [options.workerScript] - Path to worker script
   * @param {number} [options.taskTimeout=60000] - Default task timeout in ms
   * @param {boolean} [options.verbose=false] - Enable verbose logging
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    // Return existing initialization promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Already initialized, just return
    if (this.initialized && this.workerPool) {
      return Promise.resolve();
    }

    // Start initialization
    this.initPromise = this._doInitialize(options);

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Internal initialization logic
   * @private
   */
  async _doInitialize(options) {
    const {
      maxWorkers,
      workerScript,
      taskTimeout = 60000,
      verbose = false
    } = options;

    // Set logger level based on verbose option
    this.log.setLevel(verbose ? 'debug' : 'info');

    // Determine worker script path
    let workerPath = workerScript;
    if (!workerPath) {
      // Default: try to construct from import.meta.url
      try {
        workerPath = new URL('./network-worker.js', import.meta.url).href;
      } catch (e) {
        // Fallback for environments where import.meta.url doesn't work
        workerPath = '/network-js/src/compute/network-worker.js';
        this.log.warn('Could not resolve worker path from import.meta.url, using fallback', { workerPath });
      }
    }

    // Check if workers are supported
    if (!WorkerAdapter.isSupported()) {
      throw new Error(
        'Web Workers are not supported in this environment. ' +
        'This library requires Web Worker support (browser) or Worker Threads (Node.js).'
      );
    }

    // Create worker pool
    this.workerPool = new WorkerPool({
      maxWorkers: maxWorkers || this._getDefaultWorkerCount(),
      workerScript: workerPath,
      taskTimeout,
      verbose
    });

    await this.workerPool.initialize();
    this.initialized = true;

    this.log.info('Initialized successfully', { 
      workerCount: this.workerPool.maxWorkers 
    });
  }

  /**
   * Get default worker count based on CPU cores
   * @private
   */
  _getDefaultWorkerCount() {
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      return navigator.hardwareConcurrency;
    }

    // Node.js environment
    try {
      const os = require('os');
      return os.cpus().length;
    } catch (e) {
      // Default fallback
      return 4;
    }
  }

  /**
   * Execute a task in the worker pool
   *
   * @param {Object} task - Task configuration
   * @param {string} task.type - Task type (algorithm name)
   * @param {Object} task.graphData - Serialized graph data
   * @param {Object} [task.options] - Algorithm-specific options
   * @param {Object} [execOptions={}] - Execution options
   * @param {Function} [execOptions.onProgress] - Progress callback
   * @param {number} [execOptions.timeout] - Task timeout override
   * @returns {Promise<any>} Task result
   */
  async execute(task, execOptions = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.workerPool.execute(task, execOptions);
  }

  /**
   * Serialize a graph for transfer to workers
   * Minimizes data transfer by only sending necessary information
   *
   * @param {Graph} graph - Graph to serialize
   * @returns {Object} Serialized graph data
   */
  serializeGraph(graph) {
    return {
      nodes: Array.from(graph.nodes),
      edges: graph.edges.map(edge => ({
        source: edge.u,
        target: edge.v,
        weight: edge.weight
      }))
    };
  }

  /**
   * Get current worker pool status
   *
   * @returns {Object|null} Worker pool status or null if not initialized
   */
  getStatus() {
    if (!this.workerPool) {
      return null;
    }

    return this.workerPool.getStatus();
  }

  /**
   * Terminate the worker pool and cleanup resources
   *
   * @param {boolean} [force=false] - Force immediate termination
   * @returns {Promise<void>}
   */
  async terminate(force = false) {
    if (this.workerPool) {
      await this.workerPool.terminate(force);
      this.workerPool = null;
      this.initialized = false;
    }
  }

  /**
   * Reset the singleton instance (mainly for testing)
   * @private
   */
  static reset() {
    if (WorkerManager.instance) {
      WorkerManager.instance.terminate(true);
      WorkerManager.instance = null;
    }
  }
}

// Static singleton instance
WorkerManager.instance = null;

// Export singleton getter
export default new WorkerManager();
