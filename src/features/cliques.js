/**
 * Cliques calculator
 * @module features/cliques
 */

import jsnetworkx from 'jsnetworkx';

/**
 * Calculate number of cliques for all nodes in a graph
 *
 * @param {Object} graph - jsnetworkx Graph instance
 * @param {Object} [options] - Calculation options
 * @param {boolean} [options.verbose=false] - Enable logging
 * @returns {Object} Node ID to clique count mapping
 *
 * @example
 * const cliques = calculateCliques(graph);
 * // { 'A': 2, 'B': 3, 'C': 1 }
 */
export function calculateCliques(graph, options = {}) {
  const { verbose = false } = options;

  if (verbose) {
    console.log('Calculating cliques...');
  }

  try {
    return jsnetworkx.numberOfCliques(graph)._stringValues;
  } catch (error) {
    if (verbose) {
      console.warn('Error calculating cliques:', error.message);
    }
    throw new Error(`Cliques calculation failed: ${error.message}`);
  }
}
