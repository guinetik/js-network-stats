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
 * and moving outward. Follows NetworkX implementation closely.
 *
 * Two modes:
 * - **equidistant=false (default)**: Equal angles, increasing radius (classic spiral)
 * - **equidistant=true**: Nodes equidistant from each other (complex math)
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
 *   resolution: 0.35
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 */
export class SpiralLayout extends Layout {
  /**
   * Create a spiral layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {number} [options.scale=100] - Scale factor for positions
   * @param {Object} [options.center={x:0, y:0}] - Center point
   * @param {number} [options.resolution=0.35] - Spiral compactness (lower = more compressed)
   * @param {boolean} [options.equidistant=false] - True = equidistant nodes, False = equal angles
   */
  constructor(graph, options = {}) {
    super(graph, {
      scale: 100,
      center: { x: 0, y: 0 },
      resolution: 0.35,
      equidistant: false,
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
 * Helper: Rescale layout positions to fit in [-scale, scale]
 *
 * @param {Array} pos - Array of [x, y] positions
 * @param {number} scale - Target scale
 * @returns {Array} Rescaled positions
 */
function rescaleLayout(pos, scale = 1) {
  if (pos.length === 0) return pos;

  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const [x, y] of pos) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const maxDim = Math.max(width, height);

  // Rescale to [-scale, scale]
  const scaleFactor = (2 * scale) / maxDim;

  return pos.map(([x, y]) => [
    (x - minX - width / 2) * scaleFactor + scale,
    (y - minY - height / 2) * scaleFactor + scale
  ]);
}

/**
 * Compute spiral layout - follows NetworkX implementation
 *
 * Default mode: radius = node_index, angle = resolution * node_index
 * This creates a classic Archimedean spiral.
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {number} options.scale - Scale factor for positions (default: 1)
 * @param {Object} options.center - Center point {x, y} (default: {x: 0, y: 0})
 * @param {number} options.resolution - Spiral compactness (default: 0.35)
 * @param {boolean} options.equidistant - Equidistant mode (default: false)
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function spiralCompute(graphData, options, progressCallback) {
  const nodes = Array.from(graphData.nodes || []);
  const n = nodes.length;

  const {
    scale = 1,
    center = { x: 0, y: 0 },
    resolution = 0.35,
    equidistant = false
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

  let pos = [];

  if (equidistant) {
    // Equidistant mode: nodes are positioned equidistant from each other
    // Using constant chord length with varying angle
    const chord = 1;
    let step = 0.5;
    let theta = resolution;
    theta += chord / (step * theta);

    for (let i = 0; i < n; i++) {
      const r = step * theta;
      theta += chord / r;
      pos.push([Math.cos(theta) * r, Math.sin(theta) * r]);
    }
  } else {
    // Default mode: equal angles, increasing radius
    // Following NetworkX: radius = i, angle = resolution * i
    for (let i = 0; i < n; i++) {
      const angle = resolution * i;
      const radius = i;
      pos.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
  }

  // Rescale positions to fit in [-scale, scale]
  pos = rescaleLayout(pos, scale);

  // Convert to position dictionary and apply center offset
  const positions = {};
  nodes.forEach((nodeId, i) => {
    positions[nodeId] = {
      x: pos[i][0] + center.x,
      y: pos[i][1] + center.y
    };
  });

  reportProgress(progressCallback, 1.0);
  return positions;
}
