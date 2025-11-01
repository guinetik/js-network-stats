/**
 * Worker pool for managing parallel computation tasks
 * @module worker/WorkerPool
 */

import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Manages a pool of worker threads for parallel computation
 */
export class WorkerPool {
  /**
   * @param {Object} options - Pool configuration
   * @param {number} [options.maxWorkers] - Maximum number of workers (defaults to CPU count - 1)
   * @param {number} [options.taskTimeout=60000] - Task timeout in milliseconds
   */
  constructor(options = {}) {
    const cpuCount = cpus().length;
    this.maxWorkers = options.maxWorkers || Math.max(1, cpuCount - 1);
    this.taskTimeout = options.taskTimeout || 60000;

    this.workers = [];
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.nextTaskId = 0;
    this.initialized = false;
  }

  /**
   * Initialize worker threads
   */
  initialize() {
    if (this.initialized) return;

    const workerPath = join(__dirname, 'compute-worker.js');

    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(workerPath);

      worker.on('message', (result) => this.handleWorkerMessage(worker, result));
      worker.on('error', (error) => this.handleWorkerError(worker, error));
      worker.on('exit', (code) => this.handleWorkerExit(worker, code));

      this.workers.push({
        worker,
        busy: false,
        currentTaskId: null
      });
    }

    this.initialized = true;
  }

  /**
   * Handle message from worker
   */
  handleWorkerMessage(worker, result) {
    const workerInfo = this.workers.find(w => w.worker === worker);
    if (!workerInfo) return;

    const task = this.activeTasks.get(result.id);
    if (!task) return;

    // Clear timeout
    if (task.timeoutId) {
      clearTimeout(task.timeoutId);
    }

    // Resolve or reject the task
    if (result.success) {
      task.resolve(result);
    } else {
      const error = new Error(result.error.message);
      error.stack = result.error.stack;
      task.reject(error);
    }

    // Clean up
    this.activeTasks.delete(result.id);
    workerInfo.busy = false;
    workerInfo.currentTaskId = null;

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  handleWorkerError(worker, error) {
    const workerInfo = this.workers.find(w => w.worker === worker);
    if (!workerInfo) return;

    // Reject current task if any
    if (workerInfo.currentTaskId !== null) {
      const task = this.activeTasks.get(workerInfo.currentTaskId);
      if (task) {
        task.reject(error);
        this.activeTasks.delete(workerInfo.currentTaskId);
      }
    }

    workerInfo.busy = false;
    workerInfo.currentTaskId = null;
  }

  /**
   * Handle worker exit
   */
  handleWorkerExit(worker, code) {
    if (code !== 0) {
      console.error(`Worker exited with code ${code}`);
    }
  }

  /**
   * Execute a task in the worker pool
   *
   * @param {Array} network - Network edges
   * @param {Array<string>} features - Features to calculate
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Computation results
   */
  execute(network, features, options = {}) {
    if (!this.initialized) {
      this.initialize();
    }

    return new Promise((resolve, reject) => {
      const taskId = this.nextTaskId++;
      const task = {
        id: taskId,
        network,
        features,
        options,
        resolve,
        reject,
        timeoutId: null
      };

      // Set timeout
      task.timeoutId = setTimeout(() => {
        this.activeTasks.delete(taskId);
        reject(new Error(`Task ${taskId} timed out after ${this.taskTimeout}ms`));
      }, this.taskTimeout);

      this.activeTasks.set(taskId, task);
      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Process queued tasks
   */
  processQueue() {
    while (this.taskQueue.length > 0) {
      // Find available worker
      const availableWorker = this.workers.find(w => !w.busy);
      if (!availableWorker) break;

      // Get next task
      const task = this.taskQueue.shift();

      // Assign task to worker
      availableWorker.busy = true;
      availableWorker.currentTaskId = task.id;

      availableWorker.worker.postMessage({
        id: task.id,
        network: task.network,
        features: task.features,
        options: task.options
      });
    }
  }

  /**
   * Terminate all workers and clean up
   */
  async terminate() {
    const terminationPromises = this.workers.map(({ worker }) => worker.terminate());
    await Promise.all(terminationPromises);

    this.workers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
    this.initialized = false;
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      maxWorkers: this.maxWorkers,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size
    };
  }
}

/**
 * Singleton worker pool instance
 */
let sharedPool = null;

/**
 * Get or create the shared worker pool
 */
export function getSharedPool(options = {}) {
  if (!sharedPool) {
    sharedPool = new WorkerPool(options);
  }
  return sharedPool;
}

/**
 * Terminate the shared worker pool
 */
export async function terminateSharedPool() {
  if (sharedPool) {
    await sharedPool.terminate();
    sharedPool = null;
  }
}
