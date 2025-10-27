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
import { rescaleLayout } from './layout-utils.js';

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
   * @param {number} [options.iterations=50] - Number of iterations to run
   * @param {number} [options.k=null] - Optimal distance between nodes (auto-calculated if null)
   * @param {number} [options.scale=1] - Scale factor for positions
   * @param {Object} [options.center={x:0, y:0}] - Center point
   * @param {Object} [options.initialPositions=null] - Initial node positions
   * @param {number} [options.threshold=1e-4] - Convergence threshold
   */
  constructor(graph, options = {}) {
    super(graph, {
      iterations: 50,
      k: null,
      scale: 1,
      center: { x: 0, y: 0 },
      initialPositions: null,
      threshold: 1e-4,
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
 * Compute force-directed layout using Fruchterman-Reingold algorithm
 * (matches NetworkX implementation)
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {number} options.iterations - Number of iterations (default: 50)
 * @param {number} options.k - Optimal distance between nodes (default: auto-calculated)
 * @param {number} options.scale - Scale factor for final positions (default: 1)
 * @param {Object} options.center - Center point {x, y} (default: {x: 0, y: 0})
 * @param {Object} options.initialPositions - Initial positions
 * @param {number} options.threshold - Convergence threshold (default: 1e-4)
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function forceDirectedCompute(graphData, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const {
    iterations = 50,
    k = null,
    scale = 1,
    center = { x: 0, y: 0 },
    initialPositions = null,
    threshold = 1e-4
  } = options || {};

  const nodes = Array.from(graph.nodes);
  const n = nodes.length;

  // Handle edge cases
  if (n === 0) {
    reportProgress(progressCallback, 1.0);
    return {};
  }

  if (n === 1) {
    const positions = { [nodes[0]]: { x: center.x, y: center.y } };
    reportProgress(progressCallback, 1.0);
    return positions;
  }

  // Initialize positions
  let positions = {};
  if (initialPositions) {
    positions = { ...initialPositions };
  } else {
    // Random initial positions
    nodes.forEach(nodeId => {
      positions[nodeId] = {
        x: Math.random(),
        y: Math.random()
      };
    });
  }

  // Optimal distance between nodes (NetworkX approach)
  const optimalK = k !== null ? k : Math.sqrt(1.0 / n);

  // Calculate initial temperature (NetworkX: 0.1 of domain area)
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  nodes.forEach(nodeId => {
    const pos = positions[nodeId];
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  });
  let temperature = Math.max(maxX - minX, maxY - minY) * 0.1;

  // Cooling schedule (NetworkX: linear)
  const dt = temperature / (iterations + 1);

  // Build adjacency info for efficiency
  const adjacency = new Map();
  nodes.forEach(nodeId => {
    const neighbors = new Set(graph.getNeighbors(nodeId));
    adjacency.set(nodeId, neighbors);
  });

  // Main iteration loop
  for (let iter = 0; iter < iterations; iter++) {
    const displacement = {};

    // Initialize displacements
    nodes.forEach(nodeId => {
      displacement[nodeId] = { x: 0, y: 0 };
    });

    // Calculate forces for each node
    nodes.forEach(nodeId => {
      const pos = positions[nodeId];
      let fx = 0, fy = 0;

      // Forces from all other nodes
      nodes.forEach(otherId => {
        if (otherId !== nodeId) {
          const otherPos = positions[otherId];
          const dx = pos.x - otherPos.x;
          const dy = pos.y - otherPos.y;

          // Distance with minimum threshold (NetworkX: 0.01)
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 0.01) distance = 0.01;

          // Check if nodes are connected
          const isConnected = adjacency.get(nodeId).has(otherId);

          // NetworkX formula: k*k/distance^2 - A*distance/k
          // where A is 1 if connected, 0 otherwise
          const repulsion = (optimalK * optimalK) / (distance * distance);
          const attraction = isConnected ? distance / optimalK : 0;
          const force = repulsion - attraction;

          fx += (dx / distance) * force;
          fy += (dy / distance) * force;
        }
      });

      displacement[nodeId] = { x: fx, y: fy };
    });

    // Update positions
    let totalDisplacement = 0;
    nodes.forEach(nodeId => {
      const disp = displacement[nodeId];
      const dispLength = Math.sqrt(disp.x * disp.x + disp.y * disp.y);

      if (dispLength > 0) {
        // Limit displacement by temperature (NetworkX approach)
        const limitedLength = Math.max(dispLength, 0.01);
        const factor = temperature / limitedLength;

        positions[nodeId].x += disp.x * factor;
        positions[nodeId].y += disp.y * factor;

        totalDisplacement += dispLength;
      }
    });

    // Cool temperature
    temperature -= dt;

    // Check convergence (NetworkX: relative error < threshold)
    if ((totalDisplacement / n) < threshold) {
      reportProgress(progressCallback, 1.0);
      break;
    }

    // Report progress
    if (iter % 10 === 0) {
      reportProgress(progressCallback, iter / iterations);
    }
  }

  // Rescale layout to fit in [-scale, scale] (NetworkX approach)
  const rescaledPositions = rescaleLayout(positions, nodes, scale, center);

  reportProgress(progressCallback, 1.0);
  return rescaledPositions;
}
