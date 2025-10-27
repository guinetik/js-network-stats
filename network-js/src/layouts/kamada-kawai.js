/**
 * Kamada-Kawai layout algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module kamada-kawai
 */

import { Layout } from './layout.js';
import { reconstructGraph, reportProgress } from '../compute/compute-utils.js';
import { rescaleLayout } from './layout-utils.js';

/**
 * Kamada-Kawai layout algorithm.
 *
 * Positions nodes using energy minimization based on all-pairs shortest paths.
 * The algorithm tries to place nodes such that their Euclidean distance matches
 * the graph-theoretic distance.
 *
 * **Time Complexity**: O(n³) for all-pairs shortest paths + O(iterations * n²) for optimization
 * **Use Case**: Small to medium graphs (<1000 nodes), tree layouts, planar graphs
 *
 * @extends Layout
 * @class
 * @example
 * import { Graph } from '../graph.js';
 * import { KamadaKawaiLayout } from './kamada-kawai.js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D']);
 * graph.addEdge('A', 'B');
 * graph.addEdge('B', 'C');
 * graph.addEdge('C', 'D');
 *
 * const layout = new KamadaKawaiLayout(graph, {
 *   iterations: 100,
 *   scale: 200
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 * // positions = { 'A': {x: 120, y: 240}, 'B': {x: 310, y: 150}, ... }
 */
export class KamadaKawaiLayout extends Layout {
  /**
   * Create a Kamada-Kawai layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {number} [options.iterations=100] - Number of iterations to run
   * @param {number} [options.scale=1] - Scale factor for positions
   * @param {Object} [options.center={x:0, y:0}] - Center point
   * @param {Object} [options.initialPositions=null] - Initial node positions
   * @param {number} [options.threshold=1e-4] - Convergence threshold
   * @param {number} [options.K=null] - Scaling factor for spring constant (auto-calculated if null)
   */
  constructor(graph, options = {}) {
    super(graph, {
      iterations: 100,
      scale: 1,
      center: { x: 0, y: 0 },
      initialPositions: null,
      threshold: 1e-4,
      K: null,
      ...options
    }, {
      module: '../layouts/kamada-kawai.js',
      functionName: 'kamadaKawaiCompute'
    });
  }
  // computePositions() inherited from base class - delegates to worker!
}

export default KamadaKawaiLayout;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute Kamada-Kawai layout
 * (matches NetworkX implementation)
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {number} options.iterations - Number of iterations (default: 100)
 * @param {number} options.scale - Scale factor for final positions (default: 1)
 * @param {Object} options.center - Center point {x, y} (default: {x: 0, y: 0})
 * @param {Object} options.initialPositions - Initial positions
 * @param {number} options.threshold - Convergence threshold (default: 1e-4)
 * @param {number} options.K - Scaling factor for spring constant (auto-calculated if null)
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function kamadaKawaiCompute(graphData, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const {
    iterations = 100,
    scale = 1,
    center = { x: 0, y: 0 },
    initialPositions = null,
    threshold = 1e-4,
    K = null
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

  // Compute all-pairs shortest paths using BFS from each node
  reportProgress(progressCallback, 0.1);
  const distances = computeAllPairsShortestPaths(graph, nodes);

  reportProgress(progressCallback, 0.3);

  // Initialize positions
  let pos = initializePositions(nodes, initialPositions);

  // Calculate scaling factor K
  const Lmax = Math.max(...distances.flat());
  const Ld = 2 * Lmax; // length of domain edge
  const Kval = K !== null ? K : Ld / n;

  reportProgress(progressCallback, 0.4);

  // Optimization loop
  const nodeIndex = {};
  nodes.forEach((node, i) => {
    nodeIndex[node] = i;
  });

  for (let iter = 0; iter < iterations; iter++) {
    let delta = 0;

    // For each node
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      const [xi, yi] = pos[i];

      // Calculate gradient
      let dxi = 0;
      let dyi = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;

        const [xj, yj] = pos[j];
        const dx = xi - xj;
        const dy = yi - yj;
        const rij = Math.sqrt(dx * dx + dy * dy);
        const dij = distances[i][j];

        if (rij === 0) continue; // Skip if nodes are at same position

        const lij = Kval * dij;
        const rijOverLij = rij / lij;

        // Spring force
        const Fspring = (rijOverLij - 1) / dij;
        dxi += Fspring * dx;
        dyi += Fspring * dy;
      }

      delta += Math.sqrt(dxi * dxi + dyi * dyi);
      pos[i][0] -= dxi;
      pos[i][1] -= dyi;
    }

    reportProgress(progressCallback, 0.4 + (0.6 * (iter + 1) / iterations));

    // Check convergence
    if (delta < threshold) {
      break;
    }
  }

  reportProgress(progressCallback, 0.95);

  // Rescale positions
  const posArray = pos.map(p => [...p]);
  const rescaled = rescaleLayout(posArray, scale);

  // Create result dictionary
  const positions = {};
  nodes.forEach((nodeId, i) => {
    positions[nodeId] = {
      x: rescaled[i][0] + center.x,
      y: rescaled[i][1] + center.y
    };
  });

  reportProgress(progressCallback, 1.0);
  return positions;
}

/**
 * Compute all-pairs shortest paths using BFS
 *
 * @param {Map} graph - Graph with adjacency structure
 * @param {Array} nodes - List of node IDs
 * @returns {Array<Array<number>>} Distance matrix
 */
function computeAllPairsShortestPaths(graph, nodes) {
  const n = nodes.length;
  const distances = Array(n).fill(null).map(() => Array(n).fill(Infinity));
  const nodeIndex = {};

  nodes.forEach((node, i) => {
    nodeIndex[node] = i;
    distances[i][i] = 0;
  });

  // BFS from each node
  for (let start = 0; start < n; start++) {
    const startNode = nodes[start];
    const queue = [[startNode, 0]];
    const visited = new Set([startNode]);

    while (queue.length > 0) {
      const [node, dist] = queue.shift();
      const nodeIdx = nodeIndex[node];

      if (nodeIdx !== undefined) {
        distances[start][nodeIdx] = dist;
      }

      const neighbors = graph.getNeighbors(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, dist + 1]);
        }
      }
    }
  }

  return distances;
}

/**
 * Initialize node positions
 *
 * @param {Array} nodes - List of node IDs
 * @param {Object} initialPositions - Optional initial positions
 * @returns {Array<Array<number>>} Array of [x, y] positions
 */
function initializePositions(nodes, initialPositions) {
  const n = nodes.length;
  const positions = [];

  if (initialPositions && Object.keys(initialPositions).length > 0) {
    // Use provided initial positions
    nodes.forEach(node => {
      const pos = initialPositions[node];
      if (pos) {
        positions.push([pos.x || 0, pos.y || 0]);
      } else {
        // Random fallback
        positions.push([Math.random(), Math.random()]);
      }
    });
  } else {
    // Circular initial positions
    const angle = (2 * Math.PI) / n;
    for (let i = 0; i < n; i++) {
      const x = Math.cos(i * angle);
      const y = Math.sin(i * angle);
      positions.push([x, y]);
    }
  }

  return positions;
}
