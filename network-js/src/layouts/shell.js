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
 * Groups nodes into concentric circles based on a metric or provided grouping.
 * Useful for visualizing hierarchical structures or node importance.
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
 *   scale: 200
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 * // positions = { 'A': {x: 0, y: 0}, 'B': {x: 100, y: 0}, ... }
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
   * @param {Function} [options.shellSortBy=null] - Function to sort nodes into shells based on property
   */
  constructor(graph, options = {}) {
    super(graph, {
      scale: 100,
      center: { x: 0, y: 0 },
      nlist: null,
      shellSortBy: null,
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
 * Compute shell layout with concentric circles
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {number} options.scale - Scale factor for positions (default: 1)
 * @param {Object} options.center - Center point {x, y} (default: {x: 0, y: 0})
 * @param {Array<Array<string>>} options.nlist - Pre-defined node shells
 * @param {Function} options.shellSortBy - Function to sort nodes into shells
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
    shellSortBy = null
  } = options || {};

  const positions = {};

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
  } else if (shellSortBy && typeof shellSortBy === 'function') {
    // Sort nodes by property and create shells
    // This is simplified - group nodes by property value
    const grouped = new Map();
    nodes.forEach(node => {
      const key = shellSortBy(node);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(node);
    });
    shells = Array.from(grouped.values());
  } else {
    // Default: distribute nodes evenly into sqrt(n) shells
    const numShells = Math.max(1, Math.ceil(Math.sqrt(n)));
    const nodesPerShell = Math.ceil(n / numShells);
    shells = [];

    for (let i = 0; i < numShells; i++) {
      const start = i * nodesPerShell;
      const end = Math.min(start + nodesPerShell, n);
      shells.push(nodes.slice(start, end));
    }
  }

  // Position nodes in each shell as a circle
  shells.forEach((shell, shellIndex) => {
    const shellCount = shells.length;

    // Radius for this shell (increase from center)
    // First shell at center, others at increasing radii
    let radius;
    if (shellIndex === 0) {
      radius = 0; // Center shell at origin
    } else {
      // Linear spacing from scale/2 to scale
      const maxRadius = scale;
      const minRadius = scale * 0.1;
      radius = minRadius + (shellIndex / (shellCount - 1)) * (maxRadius - minRadius);
    }

    const nodesInShell = shell.length;

    // Place nodes around circle for this shell
    shell.forEach((nodeId, nodeIndex) => {
      if (nodesInShell === 1) {
        // Single node in shell: place at center of this shell
        positions[nodeId] = { x: center.x, y: center.y };
      } else {
        // Multiple nodes: arrange in circle
        const angle = (2 * Math.PI * nodeIndex) / nodesInShell;
        const x = radius * Math.cos(angle) + center.x;
        const y = radius * Math.sin(angle) + center.y;
        positions[nodeId] = { x, y };
      }
    });
  });

  reportProgress(progressCallback, 1.0);
  return positions;
}
