/**
 * Graph construction utilities
 * @module graph/builder
 */

import jsnetworkx from 'jsnetworkx';
import { getAllUniqueNodes, edgesToTuples } from './utils.js';

/**
 * Builds a jsnetworkx Graph from edge list
 *
 * @param {Array<Object>} network - Array of edge objects
 * @returns {Object} jsnetworkx Graph instance
 *
 * @example
 * const edges = [
 *   { source: 'A', target: 'B' },
 *   { source: 'B', target: 'C' }
 * ];
 * const graph = buildGraph(edges);
 * console.log(graph.nodes().length); // 3
 */
export function buildGraph(network) {
  const nodes = getAllUniqueNodes(network);
  const edges = edgesToTuples(network);

  const G = new jsnetworkx.Graph();
  G.addNodesFrom(nodes);
  G.addEdgesFrom(edges);

  return G;
}

/**
 * Gets graph metadata
 *
 * @param {Object} graph - jsnetworkx Graph instance
 * @returns {Object} Graph metadata
 *
 * @example
 * const meta = getGraphMetadata(graph);
 * console.log(meta.nodeCount); // 3
 * console.log(meta.edgeCount); // 2
 */
export function getGraphMetadata(graph) {
  return {
    nodeCount: graph.nodes().length,
    edgeCount: graph.edges().length,
  };
}
