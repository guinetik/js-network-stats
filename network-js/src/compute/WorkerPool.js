/**
 * WorkerPool - Manages a pool of workers for parallel computation
 *
 * Features:
 * - Auto-scaling based on CPU cores
 * - Task queueing and distribution
 * - Worker lifecycle management
 * - Progress tracking
 * - Error recovery
 *
 * @module WorkerPool
 */

import { WorkerAdapter } from './WorkerAdapter.js';

/**
 * Pool of workers for parallel task execution
 *
 * @example
 * const pool = new WorkerPool({
 *   maxWorkers: 4,
 *   workerScript: './network-worker.js'
 * });
 *
 * await pool.initialize();
 *
 * const result = await pool.execute({
 *   type: 'betweenness',
 *   graphData: { nodes: [...], edges: [...] }
 * }, {
 *   onProgress: (p) => console.log(`${Math.round(p*100)}%`)
 * });
 *
 * await pool.terminate();
 */
export class WorkerPool {
  /**
   * Create a new worker pool
   *
   * @param {Object} options - Configuration options
   * @param {number} [options.maxWorkers] - Maximum number of workers (default: CPU count)
   * @param {string} [options.workerScript] - Path to worker script
   * @param {number} [options.taskTimeout] - Task timeout in ms (default: 60000)
   * @param {boolean} [options.verbose] - Enable verbose logging
   */
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || this.detectCPUCount();
    this.workerScript = options.workerScript || this.getDefaultWorkerScript();
    this.taskTimeout = options.taskTimeout || 60000; // 60 seconds
    this.verbose = options.verbose || false;

    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTasks = new Map(); // taskId -> { resolve, reject, onProgress, timeout }
    this.taskIdCounter = 0;
    this.initialized = false;
  }

  /**
   * Detect number of CPU cores
   * @private
   * @returns {number} CPU count
   */
  detectCPUCount() {
    // Browser
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      return navigator.hardwareConcurrency;
    }

    // Node.js
    if (typeof require !== 'undefined') {
      try {
        const os = require('os');
        return os.cpus().length;
      } catch (e) {
        // Ignore
      }
    }

    return 4; // Safe default
  }

  /**
   * Get default worker script path
   * @private
   * @returns {string} Worker script path
   */
  getDefaultWorkerScript() {
    // In browser: relative to main script
    if (typeof window !== 'undefined') {
      return new URL('./network-worker.js', import.meta.url).href;
    }

    // In Node.js: relative to this file
    if (typeof require !== 'undefined') {
      const path = require('path');
      return path.join(__dirname, 'network-worker.js');
    }

    return './network-worker.js';
  }

  /**
   * Initialize worker pool
   *
   * @returns {Promise<void>}
   * @throws {Error} If workers are not supported
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    if (!WorkerAdapter.isSupported()) {
      throw new Error('Workers not supported in this environment');
    }

    this.log(`Initializing worker pool with ${this.maxWorkers} workers`);

    try {
      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = await this.createWorker(i);
        this.workers.push(worker);
        this.availableWorkers.push(worker);
      }

      this.initialized = true;
      this.log('Worker pool initialized successfully');
    } catch (error) {
      this.log(`Failed to initialize worker pool: ${error.message}`);
      // Clean up any workers that were created
      await this.terminate();
      throw error;
    }
  }

  /**
   * Create a worker with message and error handlers
   * @private
   * @param {number} id - Worker ID for logging
   * @returns {WorkerAdapter} Configured worker
   */
  async createWorker(id) {
    const worker = WorkerAdapter.create(this.workerScript);
    worker.id = id;
    worker.currentTaskId = null;

    worker.onMessage((message) => {
      this.handleWorkerMessage(worker, message);
    });

    worker.onError((error) => {
      this.handleWorkerError(worker, error);
    });

    this.log(`Worker ${id} created`);
    return worker;
  }

  /**
   * Execute task on worker pool
   *
   * @param {Object} task - Task to execute
   * @param {string} task.type - Task type (algorithm name)
   * @param {Object} [options] - Execution options
   * @param {Function} [options.onProgress] - Progress callback (0-1)
   * @param {number} [options.timeout] - Task timeout in ms
   * @returns {Promise<any>} Task result
   *
   * @example
   * const result = await pool.execute({
   *   type: 'degree',
   *   graphData: { nodes: [...], edges: [...] },
   *   nodeIds: ['a', 'b', 'c']
   * }, {
   *   onProgress: (progress) => console.log(`${progress * 100}%`),
   *   timeout: 30000
   * });
   */
  async execute(task, options = {}) {
    if (!this.initialized) {
      throw new Error('Worker pool not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const taskId = `task_${this.taskIdCounter++}`;
      const taskWithId = { id: taskId, ...task };
      const timeout = options.timeout || this.taskTimeout;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.handleTaskTimeout(taskId);
      }, timeout);

      // Store task info
      this.activeTasks.set(taskId, {
        resolve,
        reject,
        onProgress: options.onProgress,
        timeoutId,
        startTime: Date.now()
      });

      // Try to assign to available worker
      if (this.availableWorkers.length > 0) {
        const worker = this.availableWorkers.pop();
        this.assignTask(worker, taskWithId);
        this.log(`Task ${taskId} assigned to worker ${worker.id}`);
      } else {
        // Queue task if no workers available
        this.taskQueue.push(taskWithId);
        this.log(`Task ${taskId} queued (${this.taskQueue.length} in queue)`);
      }
    });
  }

  /**
   * Assign task to worker
   * @private
   * @param {WorkerAdapter} worker - Worker to assign to
   * @param {Object} task - Task to execute
   */
  assignTask(worker, task) {
    worker.currentTaskId = task.id;
    worker.postMessage(task);
  }

  /**
   * Handle message from worker
   * @private
   * @param {WorkerAdapter} worker - Worker that sent message
   * @param {Object} message - Message from worker
   */
  handleWorkerMessage(worker, message) {
    const { id, status, result, progress, error } = message;
    const taskInfo = this.activeTasks.get(id);

    if (!taskInfo) {
      this.log(`Received message for unknown task: ${id}`);
      return;
    }

    if (status === 'progress') {
      // Progress update
      if (taskInfo.onProgress) {
        taskInfo.onProgress(progress);
      }
      this.log(`Task ${id} progress: ${Math.round(progress * 100)}%`);
    } else if (status === 'complete') {
      // Task completed successfully
      const duration = Date.now() - taskInfo.startTime;
      this.log(`Task ${id} completed in ${duration}ms`);

      clearTimeout(taskInfo.timeoutId);
      taskInfo.resolve(result);
      this.activeTasks.delete(id);
      this.freeWorker(worker);
    } else if (status === 'error') {
      // Task failed
      this.log(`Task ${id} failed: ${error}`);

      clearTimeout(taskInfo.timeoutId);
      taskInfo.reject(new Error(error));
      this.activeTasks.delete(id);
      this.freeWorker(worker);
    }
  }

  /**
   * Handle worker error
   * @private
   * @param {WorkerAdapter} worker - Worker that errored
   * @param {Error} error - Error object
   */
  handleWorkerError(worker, error) {
    this.log(`Worker ${worker.id} error: ${error.message}`);

    // Reject current task if any
    if (worker.currentTaskId) {
      const taskInfo = this.activeTasks.get(worker.currentTaskId);
      if (taskInfo) {
        clearTimeout(taskInfo.timeoutId);
        taskInfo.reject(error);
        this.activeTasks.delete(worker.currentTaskId);
      }
    }

    // Restart worker
    this.restartWorker(worker);
  }

  /**
   * Handle task timeout
   * @private
   * @param {string} taskId - Task that timed out
   */
  handleTaskTimeout(taskId) {
    const taskInfo = this.activeTasks.get(taskId);
    if (!taskInfo) return;

    this.log(`Task ${taskId} timed out`);

    taskInfo.reject(new Error(`Task timed out after ${this.taskTimeout}ms`));
    this.activeTasks.delete(taskId);

    // Find and restart the worker running this task
    const worker = this.workers.find(w => w.currentTaskId === taskId);
    if (worker) {
      this.restartWorker(worker);
    }
  }

  /**
   * Free worker and assign next queued task
   * @private
   * @param {WorkerAdapter} worker - Worker to free
   */
  freeWorker(worker) {
    worker.currentTaskId = null;

    if (this.taskQueue.length > 0) {
      // Assign next queued task
      const nextTask = this.taskQueue.shift();
      this.assignTask(worker, nextTask);
      this.log(`Task ${nextTask.id} assigned to worker ${worker.id} (from queue)`);
    } else {
      // Return to available pool
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Restart failed worker
   * @private
   * @param {WorkerAdapter} oldWorker - Worker to restart
   */
  async restartWorker(oldWorker) {
    const index = this.workers.indexOf(oldWorker);
    if (index === -1) return;

    this.log(`Restarting worker ${oldWorker.id}`);

    try {
      // Terminate old worker
      oldWorker.terminate();

      // Create new worker
      const newWorker = await this.createWorker(oldWorker.id);
      this.workers[index] = newWorker;
      this.availableWorkers.push(newWorker);

      this.log(`Worker ${oldWorker.id} restarted successfully`);
    } catch (error) {
      this.log(`Failed to restart worker ${oldWorker.id}: ${error.message}`);
      // Remove from workers array if can't restart
      this.workers.splice(index, 1);
    }
  }

  /**
   * Wait for active tasks to complete
   *
   * @param {number} [timeout=5000] - Max time to wait in ms
   * @returns {Promise<void>}
   */
  async waitForActiveTasks(timeout = 5000) {
    if (this.activeTasks.size === 0) {
      return;
    }

    this.log(`Waiting for ${this.activeTasks.size} active tasks...`);

    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.activeTasks.size === 0 || Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          this.log(`Wait complete (${this.activeTasks.size} tasks remaining)`);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Terminate all workers and clean up
   *
   * @param {boolean} [force=false] - Force termination without waiting
   * @returns {Promise<void>}
   */
  async terminate(force = false) {
    if (!this.initialized) {
      return;
    }

    this.log('Terminating worker pool...');

    // Wait for tasks to complete unless forced
    if (!force) {
      await this.waitForActiveTasks(5000);
    }

    // Reject any remaining active tasks
    this.activeTasks.forEach((taskInfo, taskId) => {
      clearTimeout(taskInfo.timeoutId);
      taskInfo.reject(new Error('Worker pool terminated'));
    });
    this.activeTasks.clear();

    // Terminate all workers
    this.workers.forEach(worker => {
      try {
        worker.terminate();
      } catch (e) {
        this.log(`Error terminating worker ${worker.id}: ${e.message}`);
      }
    });

    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.initialized = false;

    this.log('Worker pool terminated');
  }

  /**
   * Get current pool status
   *
   * @returns {Object} Status information
   *
   * @example
   * const status = pool.getStatus();
   * console.log(`Workers: ${status.availableWorkers}/${status.totalWorkers}`);
   * console.log(`Queue: ${status.queuedTasks}, Active: ${status.activeTasks}`);
   */
  getStatus() {
    return {
      initialized: this.initialized,
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.workers.length - this.availableWorkers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length
    };
  }

  /**
   * Log message if verbose mode enabled
   * @private
   * @param {string} message - Message to log
   */
  log(message) {
    console.log(`[WorkerPool] ${message}`);
  }
}

export default WorkerPool;
