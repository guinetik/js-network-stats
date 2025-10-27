/**
 * Bipartite layout algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module bipartite
 */

import { Layout } from './layout.js';
import { reconstructGraph, reportProgress } from '../compute/compute-utils.js';
import { rescaleLayout } from './layout-utils.js';

/**
 * Bipartite layout algorithm.
 *
 * Positions nodes in two parallel lines (vertical or horizontal).
 * Partitions nodes into two sets and places them on opposite sides.
 * Useful for visualizing bipartite graphs or any graph that can be partitioned.
 *
 * **Time Complexity**: O(n)
 * **Use Case**: Bipartite graphs, two-level hierarchies
 *
 * @extends Layout
 * @class
 * @example
 * import { Graph } from '../graph.js';
 * import { BipartiteLayout } from './bipartite.js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D', 'E', 'F']);
 * graph.addEdge('A', 'D');
 * graph.addEdge('B', 'E');
 * graph.addEdge('C', 'F');
 *
 * const layout = new BipartiteLayout(graph, {
 *   partition: ['A', 'B', 'C'], // First set
 *   align: 'vertical',
 *   scale: 200
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 */
export class BipartiteLayout extends Layout {
  /**
   * Create a bipartite layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {Array} [options.partition=null] - Node IDs for first partition (auto-detect if null)
   * @param {string} [options.align='vertical'] - 'vertical' or 'horizontal'
   * @param {number} [options.scale=1] - Scale factor for positions
   * @param {number} [options.aspectRatio=4/3] - Width to height ratio
   * @param {Object} [options.center={x:0, y:0}] - Center point
   */
  constructor(graph, options = {}) {
    super(graph, {
      partition: null,
      align: 'vertical',
      scale: 1,
      aspectRatio: 4 / 3,
      center: { x: 0, y: 0 },
      ...options
    }, {
      module: '../layouts/bipartite.js',
      functionName: 'bipartiteCompute'
    });
  }
  // computePositions() inherited from base class - delegates to worker!
}

export default BipartiteLayout;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute bipartite layout
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {Array} options.partition - Node IDs for first partition (auto-detect if null)
 * @param {string} options.align - 'vertical' or 'horizontal'
 * @param {number} options.scale - Scale factor for final positions
 * @param {number} options.aspectRatio - Width to height ratio
 * @param {Object} options.center - Center point {x, y}
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function bipartiteCompute(graphData, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const {
    partition = null,
    align = 'vertical',
    scale = 1,
    aspectRatio = 4 / 3,
    center = { x: 0, y: 0 }
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

  reportProgress(progressCallback, 0.3);

  // Determine partition
  let set1, set2;
  if (partition && partition.length > 0) {
    set1 = new Set(partition);
    set2 = new Set(nodes.filter(n => !set1.has(n)));
  } else {
    // Simple partition: alternate nodes
    set1 = new Set();
    set2 = new Set();
    nodes.forEach((node, i) => {
      if (i % 2 === 0) {
        set1.add(node);
      } else {
        set2.add(node);
      }
    });
  }

  reportProgress(progressCallback, 0.5);

  const set1Array = Array.from(set1);
  const set2Array = Array.from(set2);

  // Position nodes in two parallel lines
  const posArray = [];
  const nodeToPos = {};

  const h1 = set1Array.length - 1 || 1;
  const h2 = set2Array.length - 1 || 1;
  const maxH = Math.max(h1, h2);

  const width = aspectRatio * 2;
  const height = 2;
  const xOffset = width / 2;
  const yOffset = height / 2;

  // Place first set on the left
  set1Array.forEach((node, i) => {
    const x = -xOffset;
    const y = (h1 > 0) ? (i * height / h1 - yOffset) : 0;
    nodeToPos[node] = [x, y];
    posArray.push([x, y]);
  });

  // Place second set on the right
  set2Array.forEach((node, i) => {
    const x = xOffset;
    const y = (h2 > 0) ? (i * height / h2 - yOffset) : 0;
    nodeToPos[node] = [x, y];
    posArray.push([x, y]);
  });

  reportProgress(progressCallback, 0.7);

  // Rescale - build nodeOrder array to track which nodes correspond to posArray indices
  const nodeOrder = [...set1Array, ...set2Array];

  // Convert posArray to positions dictionary for rescaleLayout
  const positionsDict = {};
  nodeOrder.forEach((node, i) => {
    positionsDict[node] = {
      x: posArray[i][0],
      y: posArray[i][1]
    };
  });

  // Call rescaleLayout with correct signature
  const rescaledDict = rescaleLayout(positionsDict, nodeOrder, scale, center);

  reportProgress(progressCallback, 0.9);

  // Create result dictionary from rescaled positions
  const positions = {};
  nodeOrder.forEach(node => {
    positions[node] = rescaledDict[node];
  });

  // Handle horizontal/vertical swap
  if (align === 'horizontal') {
    Object.keys(positions).forEach(node => {
      const temp = positions[node].x;
      positions[node].x = positions[node].y;
      positions[node].y = temp;
    });
  }

  reportProgress(progressCallback, 1.0);
  return positions;
}
