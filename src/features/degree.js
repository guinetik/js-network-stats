/**
 * Degree centrality calculator
 * @module features/degree
 */

import jsnetworkx from 'jsnetworkx';

/**
 * Calculate degree centrality for all nodes in a graph
 *
 * @param {Object} graph - jsnetworkx Graph instance
 * @param {Object} [options] - Calculation options
 * @param {boolean} [options.verbose=false] - Enable logging
 * @returns {Object} Node ID to degree mapping
 *
 * @example
 * const degrees = calculateDegree(graph, { verbose: true });
 * // { 'A': 2, 'B': 3, 'C': 1 }
 */
export function calculateDegree(graph, options = {}) {
  const { verbose = false } = options;

  if (verbose) {
    console.log('Calculating degree centrality...');
  }

  try {
    return jsnetworkx.degree(graph)._stringValues;
  } catch (error) {
    if (verbose) {
      console.warn('Error calculating degree:', error.message);
    }
    throw new Error(`Degree calculation failed: ${error.message}`);
  }
}
