/**
 * Generic Network Worker - Executes compute functions dynamically
 *
 * This worker uses dynamic imports to load algorithm modules and
 * execute their compute functions. It's generic and doesn't know
 * about specific algorithms - they're loaded on demand.
 *
 * **Architecture:**
 * - Main thread sends: { id, module, functionName, args }
 * - Worker imports module dynamically
 * - Worker executes function with args
 * - Worker sends back result
 *
 * @module network-worker
 */

// Platform detection
const isNodeEnvironment = typeof importScripts === 'undefined';

// Setup Node.js worker thread environment (if needed)
if (isNodeEnvironment) {
  try {
    const { parentPort } = require('worker_threads');

    // Adapt Node.js Worker Thread API to WebWorker-like interface
    global.self = {
      postMessage: (msg) => parentPort.postMessage(msg),
      onmessage: null
    };

    parentPort.on('message', (msg) => {
      if (global.self.onmessage) {
        global.self.onmessage({ data: msg });
      }
    });
  } catch (e) {
    console.error('Failed to initialize Node.js worker:', e.message);
  }
}

/**
 * Main message handler - receives tasks and delegates to algorithm modules
 */
self.onmessage = async function(event) {
  const { id, module, functionName, args = [] } = event.data;

  try {
    // Validate message format
    if (!module || !functionName) {
      throw new Error('Invalid task: module and functionName are required');
    }

    // Debug: Log task being processed
    console.log('[network-worker] Processing task:', {
      id,
      module,
      functionName,
      argsLength: args?.length || 0
    });

    // Create progress callback that reports back to main thread
    const progressCallback = (progress) => {
      self.postMessage({
        id,
        status: 'progress',
        progress: Math.min(Math.max(progress, 0), 1) // Clamp to [0, 1]
      });
    };

    // Dynamic import of algorithm module
    let algorithmModule;

    if (isNodeEnvironment) {
      // Node.js: use require (dynamic import may not work in some Node versions)
      algorithmModule = require(module);
    } else {
      // Browser: use dynamic import with proper URL resolution
      // Resolve module path relative to this worker file
      let moduleUrl = module;
      if (!module.startsWith('/') && !module.startsWith('http')) {
        // For relative paths, resolve them relative to the worker's location
        try {
          moduleUrl = new URL(module, import.meta.url).href;
          console.log(`[network-worker] Resolved module path: '${module}' -> '${moduleUrl}'`);
        } catch (e) {
          // If URL constructor fails, fall back to the original module path
          console.warn(`[network-worker] Failed to resolve module URL for '${module}':`, e.message);
        }
      }
      console.log(`[network-worker] Importing module: '${moduleUrl}'`);
      algorithmModule = await import(moduleUrl);
      console.log(`[network-worker] Successfully imported module. Exports:`, Object.keys(algorithmModule || {}));
    }

    // Get the compute function
    const computeFunction = algorithmModule[functionName];

    if (!computeFunction || typeof computeFunction !== 'function') {
      throw new Error(`Function '${functionName}' not found in module '${module}'`);
    }

    // Execute the compute function
    // Last arg is always the progress callback
    const result = await computeFunction(...args, progressCallback);

    // Send successful result
    self.postMessage({
      id,
      status: 'complete',
      result
    });

  } catch (error) {
    // Send error
    self.postMessage({
      id,
      status: 'error',
      error: error.message || 'Unknown error',
      stack: error.stack
    });
  }
};

/**
 * Handle worker errors
 */
self.onerror = function(error) {
  console.error('Worker error:', error);
  self.postMessage({
    status: 'error',
    error: error.message || 'Worker error occurred'
  });
};
