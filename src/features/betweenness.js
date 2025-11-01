/**
 * Betweenness centrality calculator
 * @module features/betweenness
 */

import jsnetworkx from 'jsnetworkx';

/**
 * Calculate betweenness centrality for all nodes in a graph
 *
 * @param {Object} graph - jsnetworkx Graph instance
 * @param {Object} [options] - Calculation options
 * @param {boolean} [options.verbose=false] - Enable logging
 * @returns {Object} Node ID to betweenness centrality mapping
 *
 * @example
 * const betweenness = calculateBetweenness(graph);
 * // { 'A': 0.0, 'B': 0.5, 'C': 0.0 }
 */
export function calculateBetweenness(graph, options = {}) {
  const { verbose = false } = options;

  if (verbose) {
    console.log('Calculating betweenness centrality...');
  }

  try {
    return jsnetworkx.betweennessCentrality(graph)._stringValues;
  } catch (error) {
    if (verbose) {
      console.warn('Error calculating betweenness centrality:', error.message);
    }
    throw new Error(`Betweenness calculation failed: ${error.message}`);
  }
}
