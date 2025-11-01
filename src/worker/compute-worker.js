/**
 * Worker thread entry point for parallel computation
 * This runs in a separate thread via Node.js worker_threads
 * @module worker/compute-worker
 */

import { parentPort } from 'worker_threads';
import { buildGraph } from '../graph/builder.js';
import { getAllUniqueNodes } from '../graph/utils.js';
import { calculateFeatures } from '../features/index.js';

/**
 * Process a computation task from the main thread
 */
parentPort.on('message', async (task) => {
  const { id, network, features, options } = task;

  try {
    // Extract nodes
    const nodes = getAllUniqueNodes(network);

    // Build graph
    const graph = buildGraph(network);

    // Calculate features
    const stats = calculateFeatures(features, graph, nodes, network, {
      ...options,
      verbose: false // Disable logging in workers
    });

    // Send results back to main thread
    parentPort.postMessage({
      id,
      success: true,
      stats,
      nodes
    });
  } catch (error) {
    // Send error back to main thread
    parentPort.postMessage({
      id,
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});
