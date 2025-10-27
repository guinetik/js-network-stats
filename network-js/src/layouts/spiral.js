/**
 * Spiral layout algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module spiral
 */

import { Layout } from './layout.js';
import { reportProgress } from '../compute/compute-utils.js';

/**
 * Spiral layout - arranges nodes in a spiral pattern.
 *
 * Places nodes along an Archimedean spiral, starting from center
 * and moving outward. Creates visually interesting layouts for
 * ordered node sequences.
 *
 * **Time Complexity**: O(V)
 * **Use Case**: Sequential node ordering, time series networks, aesthetic layouts
 *
 * @extends Layout
 * @class
 * @example
 * import { Graph } from '../graph.js';
 * import { SpiralLayout } from './spiral.js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D', 'E']);
 * graph.addEdge('A', 'B');
 * graph.addEdge('B', 'C');
 *
 * const layout = new SpiralLayout(graph, {
 *   scale: 200,
 *   spacing: 10
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 * // positions = { 'A': {x: 0, y: 0}, 'B': {x: 10, y: 0.1}, ... }
 */
export class SpiralLayout extends Layout {
  /**
   * Create a spiral layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {number} [options.scale=100] - Maximum radius of spiral
   * @param {Object} [options.center={x:0, y:0}] - Center point
   * @param {number} [options.spacing=1] - Distance between spiral loops
   * @param {number} [options.direction=1] - Direction: 1 = counter-clockwise, -1 = clockwise
   * @param {Function} [options.sortBy=null] - Optional sort function for node ordering
   */
  constructor(graph, options = {}) {
    super(graph, {
      scale: 100,
      center: { x: 0, y: 0 },
      spacing: 1,
      direction: 1,
      sortBy: null,
      ...options
    }, {
      module: '../layouts/spiral.js',
      functionName: 'spiralCompute'
    });
  }
  // computePositions() inherited from base class - delegates to worker!
}

export default SpiralLayout;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute spiral layout using Archimedean spiral
 * Formula: r = a + b*θ, where θ is angle in radians
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {number} options.scale - Maximum radius of spiral (default: 1)
 * @param {Object} options.center - Center point {x, y} (default: {x: 0, y: 0})
 * @param {number} options.spacing - Distance between spiral loops (default: 1)
 * @param {number} options.direction - Direction: 1 or -1 (default: 1)
 * @param {Function} options.sortBy - Optional sort function
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function spiralCompute(graphData, options, progressCallback) {
  const graph = new (await import('../graph.js')).Graph();

  // Rebuild graph from serialized data
  Array.from(graphData.nodes || []).forEach(node => {
    graph.addNode(node);
  });

  let nodes = Array.from(graph.nodes);
  const n = nodes.length;

  const {
    scale = 1,
    center = { x: 0, y: 0 },
    spacing = 1,
    direction = 1,
    sortBy = null
  } = options || {};

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

  // Optional: sort nodes by a property
  if (sortBy && typeof sortBy === 'function') {
    nodes = nodes.sort(sortBy);
  }

  const positions = {};

  // Archimedean spiral: r = a + b*θ
  // For even distribution, we increase θ progressively
  const totalAngle = spacing * 2 * Math.PI * Math.ceil(n / (spacing * 10));
  const angleStep = totalAngle / n;

  nodes.forEach((nodeId, i) => {
    // Angle in radians
    const theta = angleStep * i * direction;

    // Radius increases linearly with angle (Archimedean spiral)
    // Normalize to [0, 1] range, then scale
    const maxTheta = angleStep * (n - 1);
    const r = (theta / maxTheta) * scale;

    // Convert polar to cartesian coordinates
    const x = r * Math.cos(theta) + center.x;
    const y = r * Math.sin(theta) + center.y;

    positions[nodeId] = { x, y };
  });

  reportProgress(progressCallback, 1.0);
  return positions;
}
