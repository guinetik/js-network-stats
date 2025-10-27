/**
 * Multipartite layout algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module multipartite
 */

import { Layout } from './layout.js';
import { reconstructGraph, reportProgress } from '../compute/compute-utils.js';
import { rescaleLayout } from './layout-utils.js';

/**
 * Multipartite layout algorithm.
 *
 * Positions nodes in multiple layers of parallel lines.
 * Partitions nodes into k sets and arranges them in k vertical (or horizontal) layers.
 * Useful for multi-level hierarchies and layered graph visualization.
 *
 * **Time Complexity**: O(n)
 * **Use Case**: Multi-level graphs, DAGs, hierarchical structures
 *
 * @extends Layout
 * @class
 * @example
 * import { Graph } from '../graph.js';
 * import { MultipartiteLayout } from './multipartite.js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D', 'E', 'F']);
 * graph.addEdge('A', 'D');
 *
 * const layout = new MultipartiteLayout(graph, {
 *   subsets: {
 *     0: ['A', 'B'],
 *     1: ['C'],
 *     2: ['D', 'E', 'F']
 *   },
 *   align: 'vertical',
 *   scale: 200
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 */
export class MultipartiteLayout extends Layout {
  /**
   * Create a multipartite layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {Object} [options.subsets=null] - Map of subset_id -> array of node IDs
   * @param {string} [options.align='vertical'] - 'vertical' or 'horizontal'
   * @param {number} [options.scale=1] - Scale factor for positions
   * @param {Object} [options.center={x:0, y:0}] - Center point
   */
  constructor(graph, options = {}) {
    super(graph, {
      subsets: null,
      align: 'vertical',
      scale: 1,
      center: { x: 0, y: 0 },
      ...options
    }, {
      module: '../layouts/multipartite.js',
      functionName: 'multipartiteCompute'
    });
  }
  // computePositions() inherited from base class - delegates to worker!
}

export default MultipartiteLayout;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute multipartite layout
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {Object} options.subsets - Map of subset_id -> array of node IDs
 * @param {string} options.align - 'vertical' or 'horizontal'
 * @param {number} options.scale - Scale factor for final positions
 * @param {Object} options.center - Center point {x, y}
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function multipartiteCompute(graphData, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const {
    subsets = null,
    align = 'vertical',
    scale = 1,
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

  // Determine subsets
  let layers;
  if (subsets && Object.keys(subsets).length > 0) {
    // Sort by layer number
    const sortedKeys = Object.keys(subsets)
      .sort((a, b) => {
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        return isNaN(aNum) ? 1 : isNaN(bNum) ? -1 : aNum - bNum;
      });
    layers = sortedKeys.map(key => subsets[key]);
  } else {
    // Simple layering: alternate nodes
    const layerMap = new Map();
    nodes.forEach((node, i) => {
      const layer = i % 3;
      if (!layerMap.has(layer)) {
        layerMap.set(layer, []);
      }
      layerMap.get(layer).push(node);
    });
    layers = Array.from(layerMap.values());
  }

  reportProgress(progressCallback, 0.5);

  const posArray = [];
  const positions = {};

  const numLayers = layers.length;
  const width = numLayers * 2 - 1;
  const xOffset = width / 2;

  // Position nodes in each layer
  let globalIdx = 0;
  layers.forEach((layer, layerIdx) => {
    const h = layer.length - 1 || 1;
    const x = (layerIdx * 2 - width / 2) / (numLayers - 1 || 1);

    layer.forEach((node, nodeIdx) => {
      const y = h > 0 ? (2 * nodeIdx / h - 1) : 0;
      posArray.push([x, y]);
      globalIdx++;
    });
  });

  reportProgress(progressCallback, 0.7);

  // Rescale
  const rescaled = rescaleLayout(posArray, scale);

  reportProgress(progressCallback, 0.9);

  // Create result dictionary
  let rescaledIdx = 0;
  layers.forEach(layer => {
    layer.forEach(node => {
      positions[node] = {
        x: rescaled[rescaledIdx][0] + center.x,
        y: rescaled[rescaledIdx][1] + center.y
      };
      rescaledIdx++;
    });
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
