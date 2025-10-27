/**
 * Circular layout algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module circular
 */

import { Layout } from './layout.js';
import { reconstructGraph, reportProgress } from '../compute/compute-utils.js';

/**
 * Circular layout - arranges nodes in a circle.
 *
 * Places nodes evenly spaced around a circle.
 * Useful for visualizing cycles, rings, or when you want all nodes
 * to have equal visual prominence.
 *
 * **Time Complexity**: O(V)
 * **Use Case**: Ring topologies, small graphs, aesthetic layouts
 *
 * @extends Layout
 * @class
 * @example
 * import { Graph } from '../graph.js';
 * import { CircularLayout } from './circular.js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D', 'E']);
 * graph.addEdge('A', 'B');
 * graph.addEdge('B', 'C');
 *
 * const layout = new CircularLayout(graph, {
 *   radius: 200
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 * // positions = { 'A': {x: 200, y: 0}, 'B': {x: 61.8, y: 190.2}, ... }
 */
export class CircularLayout extends Layout {
  /**
   * Create a circular layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {number} [options.radius=100] - Circle radius
   * @param {Function} [options.sortBy=null] - Optional sort function for node ordering
   */
  constructor(graph, options = {}) {
    super(graph, {
      radius: 100,
      sortBy: null,
      ...options
    }, {
      module: '../layouts/circular.js',
      functionName: 'circularCompute'
    });
  }
  // computePositions() inherited from base class - delegates to worker!
}

export default CircularLayout;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute circular layout
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {number} options.radius - Circle radius
 * @param {Function} options.sortBy - Optional sort function
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function circularCompute(graphData, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const { radius = 100, sortBy = null } = options || {};
  let nodes = Array.from(graph.nodes);

  // Optional: sort nodes by a property
  if (sortBy && typeof sortBy === 'function') {
    nodes = nodes.sort(sortBy);
  }

  const positions = {};
  const n = nodes.length;

  nodes.forEach((nodeId, i) => {
    const angle = (2 * Math.PI * i) / n;
    positions[nodeId] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  });

  reportProgress(progressCallback, 1.0);
  return positions;
}
