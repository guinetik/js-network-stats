/**
 * Shell layout algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module shell
 */

import { Layout } from './layout.js';
import { reportProgress } from '../compute/compute-utils.js';

/**
 * Shell layout - arranges nodes in concentric shells/circles.
 *
 * Groups nodes into concentric circles. Each shell can be rotated relative to
 * the previous one for better visualization. Follows NetworkX implementation.
 *
 * **Time Complexity**: O(V)
 * **Use Case**: Hierarchical networks, layer-based visualization
 *
 * @extends Layout
 * @class
 * @example
 * import { Graph } from '../graph.js';
 * import { ShellLayout } from './shell.js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D', 'E']);
 * graph.addEdge('A', 'B');
 * graph.addEdge('B', 'C');
 *
 * const layout = new ShellLayout(graph, {
 *   scale: 200,
 *   nlist: [['A'], ['B', 'C', 'D', 'E']]  // Optional shell grouping
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 */
export class ShellLayout extends Layout {
  /**
   * Create a shell layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {number} [options.scale=100] - Scale factor for positions
   * @param {Object} [options.center={x:0, y:0}] - Center point
   * @param {Array<Array<string>>} [options.nlist=null] - Pre-defined node shells (groups of node IDs)
   * @param {number|null} [options.rotate=null] - Rotation offset between shells (default: π/num_shells)
   */
  constructor(graph, options = {}) {
    super(graph, {
      scale: 100,
      center: { x: 0, y: 0 },
      nlist: null,
      rotate: null,
      ...options
    }, {
      module: '../layouts/shell.js',
      functionName: 'shellCompute'
    });
  }
  // computePositions() inherited from base class - delegates to worker!
}

export default ShellLayout;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute shell layout with concentric circles - NetworkX implementation
 *
 * Key features:
 * - **Default behavior**: Auto-groups nodes by degree (hub nodes in center, peripheral in outer rings)
 * - **Custom grouping**: Accepts nlist parameter for explicit shell definitions
 * - Divides scale evenly among shells (radius_bump = scale / num_shells)
 * - Rotates each shell relative to previous (default rotate = π / num_shells)
 * - Center shell (if single node) at radius 0
 *
 * Default degree grouping creates visual hierarchy:
 * - Inner shells: High-degree hub nodes
 * - Outer shells: Low-degree peripheral nodes
 *
 * @param {Object} graphData - Serialized graph data (with nodes and edges)
 * @param {Object} options - Layout options
 * @param {number} options.scale - Scale factor for positions (default: 1)
 * @param {Object} options.center - Center point {x, y} (default: {x: 0, y: 0})
 * @param {Array<Array<string>>|null} options.nlist - Pre-defined node shells (overrides auto-grouping)
 * @param {number|null} options.rotate - Shell rotation (default: π/num_shells)
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function shellCompute(graphData, options, progressCallback) {
  const nodes = Array.from(graphData.nodes || []);
  const n = nodes.length;

  const {
    scale = 1,
    center = { x: 0, y: 0 },
    nlist = null,
    rotate = null
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

  // Determine which nodes go in which shell
  let shells;

  if (nlist && Array.isArray(nlist)) {
    // Use provided shells
    shells = nlist;
  } else {
    // Default: auto-group by degree (high degree = center, low degree = outer)
    // Calculate degree for each node
    const nodeDegrees = new Map();
    nodes.forEach(node => {
      nodeDegrees.set(node, 0);
    });

    // Count edges for each node
    if (graphData.edges) {
      for (const edge of graphData.edges) {
        const source = edge[0];
        const target = edge[1];
        if (nodeDegrees.has(source)) {
          nodeDegrees.set(source, nodeDegrees.get(source) + 1);
        }
        if (nodeDegrees.has(target)) {
          nodeDegrees.set(target, nodeDegrees.get(target) + 1);
        }
      }
    }

    // Group nodes by degree
    const degreeGroups = new Map();
    nodes.forEach(node => {
      const degree = nodeDegrees.get(node);
      if (!degreeGroups.has(degree)) {
        degreeGroups.set(degree, []);
      }
      degreeGroups.get(degree).push(node);
    });

    // Sort degrees in descending order (high degree first = center shells)
    const sortedDegrees = Array.from(degreeGroups.keys()).sort((a, b) => b - a);

    // Create shells ordered by degree (highest first)
    shells = sortedDegrees.map(degree => degreeGroups.get(degree));
  }

  // Calculate radius increment per shell
  const radiusBump = scale / shells.length;

  // Determine initial radius
  let radius;
  if (shells[0].length === 1) {
    // Single node in first shell: put at center
    radius = 0.0;
  } else {
    // Multiple nodes: start at radius_bump
    radius = radiusBump;
  }

  // Determine rotation offset between shells
  let rotationOffset;
  if (rotate === null) {
    // Default: rotate by π/num_shells between each shell
    rotationOffset = Math.PI / shells.length;
  } else {
    rotationOffset = rotate;
  }

  // Position nodes shell by shell
  const positions = {};
  let firstTheta = rotationOffset;

  for (const shell of shells) {
    const nodesInShell = shell.length;

    if (nodesInShell === 0) continue;

    // Create angle array: evenly spaced around circle [0, 2π)
    const angles = [];
    for (let i = 0; i < nodesInShell; i++) {
      angles.push((2 * Math.PI * i) / nodesInShell + firstTheta);
    }

    // Position nodes for this shell
    shell.forEach((nodeId, i) => {
      const angle = angles[i];
      const x = radius * Math.cos(angle) + center.x;
      const y = radius * Math.sin(angle) + center.y;
      positions[nodeId] = { x, y };
    });

    // Update for next shell
    radius += radiusBump;
    firstTheta += rotationOffset;
  }

  reportProgress(progressCallback, 1.0);
  return positions;
}
