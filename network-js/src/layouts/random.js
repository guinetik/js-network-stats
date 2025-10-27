/**
 * Random layout algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module random
 */

import { Layout } from './layout.js';
import { reportProgress } from '../compute/compute-utils.js';

/**
 * Random layout - places nodes at random positions.
 *
 * Useful for:
 * - Initial visualization before applying expensive layout
 * - Stress testing visualization systems
 * - Quick exploration of graph structure
 *
 * **Time Complexity**: O(V)
 * **Use Case**: Quick, random positioning for any graph
 *
 * @extends Layout
 * @class
 * @example
 * import { Graph } from '../graph.js';
 * import { RandomLayout } from './random.js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D', 'E']);
 * graph.addEdge('A', 'B');
 * graph.addEdge('B', 'C');
 *
 * const layout = new RandomLayout(graph, {
 *   scale: 500
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 * // positions = { 'A': {x: 234, y: 412}, 'B': {x: 89, y: 156}, ... }
 */
export class RandomLayout extends Layout {
  /**
   * Create a random layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {number} [options.scale=100] - Scale factor for positions
   * @param {Object} [options.center={x:0, y:0}] - Center point
   * @param {number} [options.seed=null] - Random seed for reproducibility (null = non-deterministic)
   */
  constructor(graph, options = {}) {
    super(graph, {
      scale: 100,
      center: { x: 0, y: 0 },
      seed: null,
      ...options
    }, {
      module: '../layouts/random.js',
      functionName: 'randomCompute'
    });
  }
  // computePositions() inherited from base class - delegates to worker!
}

export default RandomLayout;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute random layout
 *
 * @param {Object} graphData - Serialized graph data (unused for random layout)
 * @param {Object} options - Layout options
 * @param {number} options.scale - Scale factor for positions (default: 1)
 * @param {Object} options.center - Center point {x, y} (default: {x: 0, y: 0})
 * @param {number} options.seed - Random seed for reproducibility (null = non-deterministic)
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function randomCompute(graphData, options, progressCallback) {
  // Extract nodes from graph data
  const nodes = Array.from(graphData.nodes || []);
  const {
    scale = 1,
    center = { x: 0, y: 0 },
    seed = null
  } = options || {};

  const positions = {};

  // Initialize pseudo-random generator if seed provided
  let rng;
  if (seed !== null) {
    // Seeded random generator (mulberry32)
    function mulberry32(seed) {
      return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      }
    }
    rng = mulberry32(seed);
  } else {
    // Use native Math.random()
    rng = Math.random;
  }

  // Generate random positions for each node
  nodes.forEach(nodeId => {
    // Random position in [-scale, scale] range, centered at center point
    const x = (rng() * 2 - 1) * scale + center.x;
    const y = (rng() * 2 - 1) * scale + center.y;
    positions[nodeId] = { x, y };
  });

  reportProgress(progressCallback, 1.0);
  return positions;
}
