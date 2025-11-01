/**
 * js-network-stats - Network graph statistics calculator
 * A micro-package for calculating network graph metrics
 * @module js-network-stats
 */

import { FEATURES } from './core/constants.js';
import { normalizeFeatures } from './core/normalizer.js';
import { validateNetwork } from './validators/network.js';
import { validateFeatures } from './validators/features.js';
import { getAllUniqueNodes } from './graph/utils.js';
import { buildGraph } from './graph/builder.js';
import { calculateFeatures } from './features/index.js';

// Re-export FEATURES constant
export { FEATURES };

/**
 * @typedef {Object} NetworkEdge
 * @property {string} source - The ID of the source node
 * @property {string} target - The ID of the target node
 * @property {number} [weight] - Optional edge weight
 */

/**
 * @typedef {Object} NetworkOptions
 * @property {number} [maxIter=100000] - Maximum iterations for eigenvector calculation
 * @property {boolean} [verbose=true] - Enable console output
 */

/**
 * @typedef {Object} NodeStats
 * @property {string} id - Node identifier
 * @property {number} [degree] - Node degree (number of connections)
 * @property {number} [eigenvector] - Eigenvector centrality score
 * @property {number} [betweenness] - Betweenness centrality score
 * @property {number} [clustering] - Clustering coefficient
 * @property {number} [cliques] - Number of cliques containing this node
 * @property {number} [modularity] - Community/modularity assignment
 */

/**
 * Generates statistics for a network graph
 *
 * @param {Array<NetworkEdge>} network - Array of edge objects with source and target properties
 * @param {Array<string>} [features] - Array of features to calculate. If null, calculates all features
 * @param {NetworkOptions} [options] - Configuration options
 * @param {number} [options.maxIter=100000] - Maximum iterations for eigenvector calculation
 * @param {boolean} [options.verbose=true] - Enable detailed console output
 * @returns {Array<NodeStats>} Array of node objects with calculated statistics
 *
 * @throws {TypeError} If network is not an array or features is not an array
 * @throws {Error} If network is empty or contains invalid edges
 *
 * @example
 * import { getNetworkStats, FEATURES } from 'js-network-stats';
 *
 * const network = [
 *   { source: 'A', target: 'B' },
 *   { source: 'B', target: 'C' },
 *   { source: 'C', target: 'A' }
 * ];
 *
 * const stats = getNetworkStats(network, [FEATURES.DEGREE, FEATURES.EIGENVECTOR]);
 * console.log(stats);
 * // [
 * //   { id: 'A', degree: 2, eigenvector: 0.577 },
 * //   { id: 'B', degree: 2, eigenvector: 0.577 },
 * //   { id: 'C', degree: 2, eigenvector: 0.577 }
 * // ]
 */
export function getNetworkStats(
  network,
  features = null,
  options = { maxIter: 100000, verbose: true }
) {
  const startTime = performance.now();

  // Validate network input
  try {
    validateNetwork(network);
  } catch (error) {
    if (options.verbose) {
      console.error('Network validation failed:', error.message);
    }
    throw error;
  }

  // Default to all features if none specified
  if (!features) {
    features = FEATURES.ALL;
  }

  // Validate features
  try {
    validateFeatures(features);
  } catch (error) {
    if (options.verbose) {
      console.error('Features validation failed:', error.message);
    }
    throw error;
  }

  if (options.verbose) {
    console.log(`Processing ${network.length} edges...`);
  }

  // Extract unique nodes
  const nodes = getAllUniqueNodes(network);

  // Build graph
  const graph = buildGraph(network);

  if (options.verbose) {
    console.log(`Graph created with ${nodes.length} nodes and ${network.length} edges`);
  }

  // Calculate features
  const stats = calculateFeatures(features, graph, nodes, network, options);

  // Normalize results
  const result = normalizeFeatures(stats, nodes);

  if (options.verbose) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Completed in ${elapsed}s`);
  }

  return result;
}

// Default export for CommonJS compatibility
export default getNetworkStats;
