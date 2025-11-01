/**
 * Modularity / community detection calculator
 * @module features/modularity
 */

import louvain from '../lib.louvain.js';

/**
 * Calculate community assignments using Louvain algorithm
 *
 * @param {Array<string|number>} nodes - List of node IDs
 * @param {Array<Object>} network - Array of edge objects
 * @param {Object} [options] - Calculation options
 * @param {boolean} [options.verbose=false] - Enable logging
 * @returns {Object} Node ID to community ID mapping
 *
 * @example
 * const nodes = ['A', 'B', 'C'];
 * const edges = [{ source: 'A', target: 'B' }];
 * const communities = calculateModularity(nodes, edges);
 * // { 'A': 0, 'B': 0, 'C': 1 }
 */
export function calculateModularity(nodes, network, options = {}) {
  const { verbose = false } = options;

  if (verbose) {
    console.log('Detecting communities (Louvain)...');
  }

  try {
    const community = louvain().nodes(nodes).edges(network);
    return community();
  } catch (error) {
    if (verbose) {
      console.warn('Error detecting communities:', error.message);
    }
    throw new Error(`Modularity calculation failed: ${error.message}`);
  }
}
