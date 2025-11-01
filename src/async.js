/**
 * Async API for network statistics with worker thread support
 * @module async
 */

import { FEATURES } from './core/constants.js';
import { normalizeFeatures } from './core/normalizer.js';
import { validateNetwork } from './validators/network.js';
import { validateFeatures } from './validators/features.js';
import { getSharedPool } from './worker/WorkerPool.js';
import { getNetworkStats } from './index.js';

/**
 * Default threshold for using workers (number of edges)
 * Graphs with more edges than this will use workers by default
 */
const DEFAULT_WORKER_THRESHOLD = 500;

/**
 * Async version of getNetworkStats with worker thread support
 *
 * @param {Array<Object>} network - Array of edge objects
 * @param {Array<string>} [features] - Features to calculate (null = all)
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.verbose=true] - Enable console output
 * @param {number} [options.maxIter=100000] - Max iterations for eigenvector
 * @param {boolean|string} [options.workers='auto'] - Worker mode: true, false, or 'auto'
 * @param {number} [options.workerThreshold=500] - Edge count threshold for auto worker mode
 * @param {number} [options.maxWorkers] - Maximum number of workers
 * @param {number} [options.taskTimeout=60000] - Task timeout in milliseconds
 * @param {Function} [options.onProgress] - Progress callback (receives 0-1)
 * @returns {Promise<Array<Object>>} Node statistics
 *
 * @example
 * // Simple async usage
 * const stats = await getNetworkStatsAsync(network, ['degree']);
 *
 * @example
 * // With progress callback
 * const stats = await getNetworkStatsAsync(network, ['betweenness'], {
 *   onProgress: (progress) => console.log(`${Math.round(progress * 100)}%`)
 * });
 *
 * @example
 * // Force workers on
 * const stats = await getNetworkStatsAsync(network, ['degree'], {
 *   workers: true
 * });
 *
 * @example
 * // Force workers off (sync mode)
 * const stats = await getNetworkStatsAsync(network, ['degree'], {
 *   workers: false
 * });
 */
export async function getNetworkStatsAsync(
  network,
  features = null,
  options = {}
) {
  const {
    verbose = true,
    maxIter = 100000,
    workers = 'auto',
    workerThreshold = DEFAULT_WORKER_THRESHOLD,
    maxWorkers,
    taskTimeout,
    onProgress
  } = options;

  const startTime = performance.now();

  // Validate inputs
  try {
    validateNetwork(network);
  } catch (error) {
    if (verbose) {
      console.error('Network validation failed:', error.message);
    }
    throw error;
  }

  // Default to all features
  if (!features) {
    features = FEATURES.ALL;
  }

  // Validate features
  try {
    validateFeatures(features);
  } catch (error) {
    if (verbose) {
      console.error('Features validation failed:', error.message);
    }
    throw error;
  }

  if (verbose) {
    console.log(`Processing ${network.length} edges (async mode)...`);
  }

  // Determine whether to use workers
  const shouldUseWorkers = decideWorkerUsage(workers, network.length, workerThreshold);

  if (verbose && shouldUseWorkers) {
    console.log(`Using worker threads for parallel computation`);
  }

  let result;

  try {
    if (shouldUseWorkers) {
      // Use workers
      result = await computeWithWorkers(network, features, {
        maxIter,
        maxWorkers,
        taskTimeout,
        onProgress,
        verbose
      });
    } else {
      // Use sync computation (wrapped in Promise for consistent API)
      result = await computeSync(network, features, {
        maxIter,
        verbose,
        onProgress
      });
    }

    if (verbose) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`✓ Completed in ${elapsed}s`);
    }

    return result;
  } catch (error) {
    if (verbose) {
      console.error('Computation failed:', error.message);
    }
    throw error;
  }
}

/**
 * Decide whether to use workers based on configuration and graph size
 */
function decideWorkerUsage(workersOption, edgeCount, threshold) {
  if (workersOption === true) return true;
  if (workersOption === false) return false;
  if (workersOption === 'auto') {
    return edgeCount > threshold;
  }
  return false;
}

/**
 * Compute stats using worker threads
 */
async function computeWithWorkers(network, features, options) {
  const { onProgress } = options;

  // Report initial progress
  if (onProgress) {
    onProgress(0);
  }

  const pool = getSharedPool({
    maxWorkers: options.maxWorkers,
    taskTimeout: options.taskTimeout
  });

  try {
    // Execute in worker
    const result = await pool.execute(network, features, {
      maxIter: options.maxIter
    });

    // Report progress during computation (simulated for now)
    if (onProgress) {
      onProgress(0.5);
    }

    // Normalize results
    const normalized = normalizeFeatures(result.stats, result.nodes);

    // Report completion
    if (onProgress) {
      onProgress(1.0);
    }

    return normalized;
  } catch (error) {
    // If worker fails, fall back to sync
    if (options.verbose) {
      console.warn('Worker computation failed, falling back to sync:', error.message);
    }
    return computeSync(network, features, options);
  }
}

/**
 * Compute stats synchronously (wrapped in Promise)
 */
async function computeSync(network, features, options) {
  const { onProgress } = options;

  // Report initial progress
  if (onProgress) {
    onProgress(0);
  }

  // Use sync implementation
  const result = getNetworkStats(network, features, {
    maxIter: options.maxIter,
    verbose: false // Already handled in async wrapper
  });

  // Report completion
  if (onProgress) {
    onProgress(1.0);
  }

  return result;
}

/**
 * Cleanup helper - terminates worker pool
 * Call this when you're done with async operations to free resources
 *
 * @example
 * import { getNetworkStatsAsync, cleanup } from 'js-network-stats/async';
 *
 * const stats = await getNetworkStatsAsync(network, ['degree']);
 * await cleanup(); // Free worker threads
 */
export async function cleanup() {
  const { terminateSharedPool } = await import('./worker/WorkerPool.js');
  await terminateSharedPool();
}

export default getNetworkStatsAsync;
