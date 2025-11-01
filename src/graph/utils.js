/**
 * Graph utility functions
 * @module graph/utils
 */

/**
 * Extracts distinct node IDs from network edges
 *
 * @param {Array<Object>} network - Network edges
 * @param {string} prop - Property to extract ('source' or 'target')
 * @returns {Array<string|number>} Distinct node IDs
 *
 * @example
 * const edges = [
 *   { source: 'A', target: 'B' },
 *   { source: 'B', target: 'C' },
 *   { source: 'A', target: 'C' }
 * ];
 * getDistinctNodes(edges, 'source'); // ['A', 'B']
 * getDistinctNodes(edges, 'target'); // ['B', 'C']
 */
export function getDistinctNodes(network, prop) {
  return network
    .map((item) => item[prop])
    .filter((value, index, self) => self.indexOf(value) === index);
}

/**
 * Extracts all unique nodes from a network
 *
 * @param {Array<Object>} network - Network edges
 * @returns {Array<string|number>} All unique node IDs
 *
 * @example
 * const edges = [
 *   { source: 'A', target: 'B' },
 *   { source: 'B', target: 'C' }
 * ];
 * getAllUniqueNodes(edges); // ['A', 'B', 'C']
 */
export function getAllUniqueNodes(network) {
  const sourceNodes = getDistinctNodes(network, 'source');
  const targetNodes = getDistinctNodes(network, 'target');
  const allNodes = [...sourceNodes, ...targetNodes];
  return [...new Set(allNodes)]; // Remove duplicates
}

/**
 * Converts edge objects to edge tuples for jsnetworkx
 *
 * @param {Array<Object>} network - Network edges
 * @returns {Array<Array>} Array of [source, target] tuples
 *
 * @example
 * const edges = [
 *   { source: 'A', target: 'B', weight: 2 },
 *   { source: 'B', target: 'C' }
 * ];
 * edgesToTuples(edges); // [['A', 'B'], ['B', 'C']]
 */
export function edgesToTuples(network) {
  return network.map(edge => [edge.source, edge.target]);
}
