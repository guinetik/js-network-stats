/**
 * Result normalization utilities
 * @module core/normalizer
 */

/**
 * Normalizes feature statistics into per-node objects
 *
 * @param {Object<string, Object>} stats - Raw statistics from algorithms
 * @param {Array<string>} nodes - List of node IDs
 * @returns {Array<Object>} Normalized node statistics
 *
 * @example
 * const stats = {
 *   degree: { 'A': 2, 'B': 3 },
 *   eigenvector: { 'A': 0.5, 'B': 0.7 }
 * };
 * const nodes = ['A', 'B'];
 * const result = normalizeFeatures(stats, nodes);
 * // [
 * //   { id: 'A', degree: 2, eigenvector: 0.5 },
 * //   { id: 'B', degree: 3, eigenvector: 0.7 }
 * // ]
 */
export function normalizeFeatures(stats, nodes) {
  if (!stats || typeof stats !== 'object') {
    throw new TypeError('Stats must be an object');
  }

  if (!Array.isArray(nodes)) {
    throw new TypeError('Nodes must be an array');
  }

  const normalized = [];

  for (const node of nodes) {
    const nodeStats = { id: node };

    for (const feature in stats) {
      if (stats.hasOwnProperty(feature)) {
        nodeStats[feature] = stats[feature][node];
      }
    }

    normalized.push(nodeStats);
  }

  return normalized;
}
