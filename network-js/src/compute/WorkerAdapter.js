/**
 * WorkerAdapter - Platform abstraction for WebWorkers and Worker Threads
 *
 * Provides a unified interface for parallel computation across browser and Node.js environments.
 *
 * @module WorkerAdapter
 */

/**
 * Abstract base class for worker adapters
 */
export class WorkerAdapter {
  constructor(workerScript) {
    this.workerScript = workerScript;
    this.worker = null;
  }

  /**
   * Factory method to create appropriate worker adapter for current platform
   *
   * @param {string} workerScript - Path to worker script
   * @returns {WorkerAdapter} Platform-specific worker adapter
   * @throws {Error} If workers are not supported
   *
   * @example
   * const worker = WorkerAdapter.create('./network-worker.js');
   * worker.postMessage({ type: 'compute', data: [...] });
   */
  static create(workerScript) {
    if (typeof Worker !== 'undefined') {
      return new BrowserWorkerAdapter(workerScript);
    } else if (typeof require !== 'undefined') {
      try {
        // Check if worker_threads module exists
        require.resolve('worker_threads');
        return new NodeWorkerAdapter(workerScript);
      } catch (e) {
        throw new Error('Worker Threads not available in this Node.js version');
      }
    } else {
      throw new Error('No worker support available in this environment');
    }
  }

  /**
   * Check if workers are supported in current environment
   *
   * @returns {boolean} True if workers are available
   */
  static isSupported() {
    if (typeof Worker !== 'undefined') {
      return true;
    }

    if (typeof require !== 'undefined') {
      try {
        require.resolve('worker_threads');
        return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  /**
   * Post message to worker
   * @abstract
   * @param {Object} message - Message to send
   * @param {Array} [transferList] - Objects to transfer ownership
   */
  postMessage(message, transferList = []) {
    throw new Error('Must implement postMessage');
  }

  /**
   * Set message handler
   * @abstract
   * @param {Function} callback - Handler for messages from worker
   */
  onMessage(callback) {
    throw new Error('Must implement onMessage');
  }

  /**
   * Set error handler
   * @abstract
   * @param {Function} callback - Handler for worker errors
   */
  onError(callback) {
    throw new Error('Must implement onError');
  }

  /**
   * Terminate worker
   * @abstract
   */
  terminate() {
    throw new Error('Must implement terminate');
  }
}

/**
 * Browser WebWorker implementation
 */
export class BrowserWorkerAdapter extends WorkerAdapter {
  constructor(workerScript) {
    super(workerScript);

    // In browser, workerScript can be:
    // 1. URL to worker file
    // 2. Blob URL with worker code
    this.worker = new Worker(workerScript, { type: 'module' });
  }

  /**
   * Create worker from inline code (useful for bundlers)
   *
   * @param {string} code - Worker code as string
   * @returns {BrowserWorkerAdapter}
   *
   * @example
   * const code = `
   *   self.onmessage = (e) => {
   *     const result = compute(e.data);
   *     self.postMessage(result);
   *   };
   * `;
   * const worker = BrowserWorkerAdapter.fromCode(code);
   */
  static fromCode(code) {
    const blob = new Blob([code], { type: 'application/javascript' });
    const blobURL = URL.createObjectURL(blob);
    return new BrowserWorkerAdapter(blobURL);
  }

  postMessage(message, transferList = []) {
    this.worker.postMessage(message, transferList);
  }

  onMessage(callback) {
    this.worker.onmessage = (event) => callback(event.data);
  }

  onError(callback) {
    this.worker.onerror = (event) => {
      callback(new Error(event.message || 'Worker error'));
    };
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Node.js Worker Threads implementation
 */
export class NodeWorkerAdapter extends WorkerAdapter {
  constructor(workerScript) {
    super(workerScript);

    // Dynamic import for Node.js Worker Threads
    // This won't break browser builds
    const { Worker } = require('worker_threads');
    this.worker = new Worker(workerScript);
  }

  postMessage(message, transferList = []) {
    this.worker.postMessage(message, transferList);
  }

  onMessage(callback) {
    this.worker.on('message', callback);
  }

  onError(callback) {
    this.worker.on('error', (error) => {
      callback(error);
    });

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        callback(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Mock adapter for testing or when workers are not available
 * Executes tasks synchronously on main thread
 */
export class MockWorkerAdapter extends WorkerAdapter {
  constructor(workerScript) {
    super(workerScript);
    this.messageHandler = null;
  }

  postMessage(message, transferList = []) {
    // Simulate async execution
    setTimeout(() => {
      if (this.messageHandler) {
        try {
          // In real implementation, this would execute worker code
          const result = this.executeSync(message);
          this.messageHandler(result);
        } catch (error) {
          if (this.errorHandler) {
            this.errorHandler(error);
          }
        }
      }
    }, 0);
  }

  onMessage(callback) {
    this.messageHandler = callback;
  }

  onError(callback) {
    this.errorHandler = callback;
  }

  terminate() {
    this.messageHandler = null;
    this.errorHandler = null;
  }

  /**
   * Synchronous execution placeholder
   * @private
   */
  executeSync(message) {
    // This would need to import and execute the actual worker code
    // For now, return echo
    return {
      id: message.id,
      status: 'complete',
      result: { mock: true }
    };
  }
}
