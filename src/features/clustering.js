/**
 * Clustering coefficient calculator
 * @module features/clustering
 */

import jsnetworkx from 'jsnetworkx';

/**
 * Calculate clustering coefficient for all nodes in a graph
 *
 * @param {Object} graph - jsnetworkx Graph instance
 * @param {Object} [options] - Calculation options
 * @param {boolean} [options.verbose=false] - Enable logging
 * @returns {Object} Node ID to clustering coefficient mapping
 *
 * @example
 * const clustering = calculateClustering(graph);
 * // { 'A': 0.5, 'B': 1.0, 'C': 0.0 }
 */
export function calculateClustering(graph, options = {}) {
  const { verbose = false } = options;

  if (verbose) {
    console.log('Calculating clustering coefficient...');
  }

  try {
    return jsnetworkx.clustering(graph)._stringValues;
  } catch (error) {
    if (verbose) {
      console.warn('Error calculating clustering coefficient:', error.message);
    }
    throw new Error(`Clustering calculation failed: ${error.message}`);
  }
}
