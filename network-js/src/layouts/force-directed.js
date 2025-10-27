/**
 * Force-directed layout algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module force-directed
 */

import { Layout } from './layout.js';
import { reconstructGraph, reportProgress } from '../compute/compute-utils.js';

/**
 * Force-directed layout using Fruchterman-Reingold-inspired algorithm.
 *
 * Creates a visually pleasing layout by simulating physical forces:
 * - Repulsive forces between all node pairs (like electrical charges)
 * - Attractive forces between connected nodes (like springs)
 *
 * **Time Complexity**: O(iterations * V²) for basic implementation
 * **Use Case**: General-purpose layout for most graph types
 *
 * @extends Layout
 * @class
 * @example
 * import { Graph } from '../graph.js';
 * import { ForceDirectedLayout } from './force-directed.js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D']);
 * graph.addEdge('A', 'B');
 * graph.addEdge('B', 'C');
 * graph.addEdge('C', 'D');
 *
 * const layout = new ForceDirectedLayout(graph, {
 *   iterations: 100,
 *   repulsion: 1000,
 *   attraction: 0.1,
 *   damping: 0.9
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 * // positions = { 'A': {x: 120, y: 240}, 'B': {x: 310, y: 150}, ... }
 */
export class ForceDirectedLayout extends Layout {
  /**
   * Create a force-directed layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {number} [options.iterations=100] - Number of iterations to run
   * @param {number} [options.repulsion=1000] - Repulsive force strength
   * @param {number} [options.attraction=0.1] - Attractive force strength
   * @param {number} [options.damping=0.9] - Damping factor (0-1)
   * @param {Object} [options.initialPositions=null] - Initial node positions
   */
  constructor(graph, options = {}) {
    super(graph, {
      iterations: 100,
      repulsion: 1000,
      attraction: 0.1,
      damping: 0.9,
      initialPositions: null,
      ...options
    }, {
      module: '../layouts/force-directed.js',
      functionName: 'forceDirectedCompute'
    });
  }
  // computePositions() inherited from base class - delegates to worker!
}

export default ForceDirectedLayout;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute force-directed layout
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {number} options.iterations - Number of iterations
 * @param {number} options.repulsion - Repulsion force strength
 * @param {number} options.attraction - Attraction force strength
 * @param {number} options.damping - Damping factor
 * @param {Object} options.initialPositions - Initial positions
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function forceDirectedCompute(graphData, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const {
    iterations = 100,
    repulsion = 1000,
    attraction = 0.1,
    damping = 0.9,
    initialPositions = null
  } = options || {};

  const nodes = Array.from(graph.nodes);

  // Initialize positions
  let positions = initialPositions || {};

  if (!initialPositions) {
    const radius = 100;
    nodes.forEach((nodeId, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      positions[nodeId] = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    });
  }

  // Iterate
  for (let iter = 0; iter < iterations; iter++) {
    const newPositions = {};

    nodes.forEach(nodeId => {
      const pos = positions[nodeId];
      let fx = 0, fy = 0;

      // Repulsive forces from all other nodes
      nodes.forEach(otherId => {
        if (otherId !== nodeId) {
          const otherPos = positions[otherId];
          const dx = pos.x - otherPos.x;
          const dy = pos.y - otherPos.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 1;

          const force = repulsion / distSq;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      });

      // Attractive forces from neighbors
      const neighbors = graph.getNeighbors(nodeId);
      neighbors.forEach(neighborId => {
        const neighborPos = positions[neighborId];
        const dx = neighborPos.x - pos.x;
        const dy = neighborPos.y - pos.y;

        fx += dx * attraction;
        fy += dy * attraction;
      });

      // Update position with damping
      newPositions[nodeId] = {
        x: pos.x + fx * damping,
        y: pos.y + fy * damping
      };
    });

    positions = newPositions;

    // Report progress every 10 iterations
    if (iter % 10 === 0) {
      reportProgress(progressCallback, iter / iterations);
    }
  }

  reportProgress(progressCallback, 1.0);
  return positions;
}
