/**
 * Feature calculators registry
 * @module features
 */

import { FEATURES } from '../core/constants.js';
import { calculateDegree } from './degree.js';
import { calculateEigenvector } from './eigenvector.js';
import { calculateBetweenness } from './betweenness.js';
import { calculateClustering } from './clustering.js';
import { calculateCliques } from './cliques.js';
import { calculateModularity } from './modularity.js';

/**
 * Feature calculator registry
 * Maps feature names to their calculator functions
 */
export const featureCalculators = {
  [FEATURES.DEGREE]: calculateDegree,
  [FEATURES.EIGENVECTOR]: calculateEigenvector,
  [FEATURES.BETWEENNESS]: calculateBetweenness,
  [FEATURES.CLUSTERING]: calculateClustering,
  [FEATURES.CLIQUES]: calculateCliques,
  [FEATURES.MODULARITY]: calculateModularity,
};

/**
 * Calculate a single feature for a graph
 *
 * @param {string} featureName - Name of the feature to calculate
 * @param {Object} graph - jsnetworkx Graph instance
 * @param {Array<string|number>} nodes - List of node IDs (for modularity)
 * @param {Array<Object>} network - Network edges (for modularity)
 * @param {Object} [options] - Calculation options
 * @returns {Object} Feature results
 * @throws {Error} If feature is unknown
 *
 * @example
 * const result = calculateFeature('degree', graph, nodes, network, { verbose: true });
 */
export function calculateFeature(featureName, graph, nodes, network, options = {}) {
  const calculator = featureCalculators[featureName];

  if (!calculator) {
    throw new Error(`Unknown feature: ${featureName}`);
  }

  // Modularity needs nodes and network, others just need graph
  if (featureName === FEATURES.MODULARITY) {
    return calculator(nodes, network, options);
  }

  return calculator(graph, options);
}

/**
 * Calculate multiple features for a graph
 *
 * @param {Array<string>} features - List of feature names to calculate
 * @param {Object} graph - jsnetworkx Graph instance
 * @param {Array<string|number>} nodes - List of node IDs
 * @param {Array<Object>} network - Network edges
 * @param {Object} [options] - Calculation options
 * @returns {Object} Map of feature names to results
 *
 * @example
 * const results = calculateFeatures(
 *   ['degree', 'eigenvector'],
 *   graph,
 *   nodes,
 *   network,
 *   { verbose: true }
 * );
 * // {
 * //   degree: { 'A': 2, 'B': 3 },
 * //   eigenvector: { 'A': 0.577, 'B': 0.707 }
 * // }
 */
export function calculateFeatures(features, graph, nodes, network, options = {}) {
  const results = {};

  for (const feature of features) {
    try {
      results[feature] = calculateFeature(feature, graph, nodes, network, options);
    } catch (error) {
      // Feature calculation failed, skip it (already logged if verbose)
      if (options.verbose) {
        console.warn(`Skipping feature '${feature}' due to error`);
      }
    }
  }

  return results;
}
