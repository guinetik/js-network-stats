/**
 * Eigenvector centrality calculator
 * @module features/eigenvector
 */

import jsnetworkx from 'jsnetworkx';

/**
 * Calculate eigenvector centrality for all nodes in a graph
 *
 * @param {Object} graph - jsnetworkx Graph instance
 * @param {Object} [options] - Calculation options
 * @param {number} [options.maxIter=100000] - Maximum iterations
 * @param {boolean} [options.verbose=false] - Enable logging
 * @returns {Object} Node ID to eigenvector centrality mapping
 *
 * @example
 * const eigenvector = calculateEigenvector(graph, { maxIter: 100000 });
 * // { 'A': 0.577, 'B': 0.707, 'C': 0.408 }
 */
export function calculateEigenvector(graph, options = {}) {
  const { maxIter = 100000, verbose = false } = options;

  if (verbose) {
    console.log('Calculating eigenvector centrality...');
  }

  try {
    return jsnetworkx.eigenvectorCentrality(graph, { maxIter })._stringValues;
  } catch (error) {
    if (verbose) {
      console.warn('Error calculating eigenvector centrality:', error.message);
    }
    throw new Error(`Eigenvector calculation failed: ${error.message}`);
  }
}
