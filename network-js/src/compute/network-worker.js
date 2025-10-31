/**
 * Network Worker - Executes compute functions from algorithm modules
 *
 * **Bundler-Friendly Architecture:**
 * - Statically imports all algorithm modules upfront
 * - Creates a registry that maps module paths to their exports
 * - Main thread sends: { id, module, functionName, args }
 * - Worker looks up module from registry and executes function
 *
 * This approach works with all bundlers (Vite, Webpack, Rollup) because
 * imports are known at build time.
 *
 * @module network-worker
 */

import { createLogger } from '@guinetik/logger';

// ============================================================================
// STATIC IMPORTS - All algorithm modules imported upfront
// ============================================================================

// Create logger for worker (runs in separate context, no window.logFilter)
const log = createLogger({
  prefix: 'network-worker',
  level: 'info' // Workers default to info level
});

// Statistics algorithms (node-level and graph-level)
import * as nodeStatsCompute from '../statistics/algorithms/node-stats.js';
import * as graphStatsCompute from '../statistics/algorithms/graph-stats.js';

// Community detection algorithms
import * as louvainCompute from '../community/algorithms/louvain.js';

// Layout algorithms
import * as randomCompute from '../layouts/random.js';
import * as circularCompute from '../layouts/circular.js';
import * as spiralCompute from '../layouts/spiral.js';
import * as shellCompute from '../layouts/shell.js';
import * as spectralCompute from '../layouts/spectral.js';
import * as forceDirectedCompute from '../layouts/force-directed.js';
import * as kamadaKawaiCompute from '../layouts/kamada-kawai.js';
import * as bipartiteCompute from '../layouts/bipartite.js';
import * as multipartiteCompute from '../layouts/multipartite.js';
import * as bfsCompute from '../layouts/bfs.js';

// ============================================================================
// MODULE REGISTRY - Maps module paths to their exports
// ============================================================================

const MODULE_REGISTRY = {
  // Node-level statistics (all in one file)
  '../statistics/algorithms/node-stats.js': nodeStatsCompute,

  // Graph-level statistics
  '../statistics/algorithms/graph-stats.js': graphStatsCompute,

  // Community
  '../community/algorithms/louvain.js': louvainCompute,

  // Layouts
  '../layouts/random.js': randomCompute,
  '../layouts/circular.js': circularCompute,
  '../layouts/spiral.js': spiralCompute,
  '../layouts/shell.js': shellCompute,
  '../layouts/spectral.js': spectralCompute,
  '../layouts/force-directed.js': forceDirectedCompute,
  '../layouts/kamada-kawai.js': kamadaKawaiCompute,
  '../layouts/bipartite.js': bipartiteCompute,
  '../layouts/multipartite.js': multipartiteCompute,
  '../layouts/bfs.js': bfsCompute
};

// ============================================================================
// WORKER MESSAGE HANDLER
// ============================================================================

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

    log.debug('Processing task', {
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

    // Look up algorithm module from registry
    const algorithmModule = MODULE_REGISTRY[module];

    if (!algorithmModule) {
      throw new Error(
        `Module '${module}' not found in registry. ` +
        `Available modules: ${Object.keys(MODULE_REGISTRY).join(', ')}`
      );
    }

    // Get the compute function
    const computeFunction = algorithmModule[functionName];

    if (!computeFunction || typeof computeFunction !== 'function') {
      throw new Error(
        `Function '${functionName}' not found in module '${module}'. ` +
        `Available functions: ${Object.keys(algorithmModule).join(', ')}`
      );
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
    log.error('Task failed', {
      id,
      error: error.message,
      stack: error.stack
    });
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
  log.error('Worker error', {
    error: error.message || 'Worker error occurred',
    stack: error.stack
  });
  self.postMessage({
    status: 'error',
    error: error.message || 'Worker error occurred'
  });
};

// Log worker initialization
log.info('Initialized', { moduleCount: Object.keys(MODULE_REGISTRY).length });
