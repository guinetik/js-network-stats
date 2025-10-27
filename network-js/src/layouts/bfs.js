/**
 * BFS (Breadth-First Search) layout algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module bfs
 */

import { Layout } from './layout.js';
import { reconstructGraph, reportProgress } from '../compute/compute-utils.js';
import { rescaleLayout } from './layout-utils.js';

/**
 * BFS layout algorithm.
 *
 * Positions nodes in layers based on breadth-first search distance from a starting node.
 * All nodes at the same distance from the source are placed in the same layer.
 * Nodes within a layer are arranged evenly spaced.
 *
 * **Time Complexity**: O(n + m) for BFS + O(n) for positioning
 * **Use Case**: Tree-like structures, hierarchical visualization, network exploration
 *
 * @extends Layout
 * @class
 * @example
 * import { Graph } from '../graph.js';
 * import { BFSLayout } from './bfs.js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D', 'E']);
 * graph.addEdge('A', 'B');
 * graph.addEdge('A', 'C');
 * graph.addEdge('B', 'D');
 * graph.addEdge('C', 'E');
 *
 * const layout = new BFSLayout(graph, {
 *   startNode: 'A',
 *   align: 'vertical',
 *   scale: 200
 * });
 *
 * const positions = await layout.getPositions(); // NOW ASYNC!
 */
export class BFSLayout extends Layout {
  /**
   * Create a BFS layout instance
   *
   * @param {Graph} graph - The graph to layout
   * @param {Object} [options={}] - Layout options
   * @param {string} [options.startNode=null] - Starting node for BFS (first node if null)
   * @param {string} [options.align='vertical'] - 'vertical' or 'horizontal'
   * @param {number} [options.scale=1] - Scale factor for positions
   * @param {Object} [options.center={x:0, y:0}] - Center point
   */
  constructor(graph, options = {}) {
    super(graph, {
      startNode: null,
      align: 'vertical',
      scale: 1,
      center: { x: 0, y: 0 },
      ...options
    }, {
      module: '../layouts/bfs.js',
      functionName: 'bfsCompute'
    });
  }
  // computePositions() inherited from base class - delegates to worker!
}

export default BFSLayout;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute BFS layout
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Layout options
 * @param {string} options.startNode - Starting node for BFS
 * @param {string} options.align - 'vertical' or 'horizontal'
 * @param {number} options.scale - Scale factor for final positions
 * @param {Object} options.center - Center point {x, y}
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> { x, y }
 */
export async function bfsCompute(graphData, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const {
    startNode = null,
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

  reportProgress(progressCallback, 0.2);

  // Determine start node
  let start = startNode;
  if (!start || !nodes.includes(start)) {
    start = nodes[0];
  }

  reportProgress(progressCallback, 0.3);

  // Perform BFS to get layers
  const layers = bfs(graph, start, nodes);

  reportProgress(progressCallback, 0.6);

  // Check that all nodes are reachable
  const allNodesInLayers = new Set();
  layers.forEach(layer => {
    layer.forEach(node => allNodesInLayers.add(node));
  });

  if (allNodesInLayers.size !== n) {
    // Some nodes are unreachable from start node
    // Place them in an extra layer
    const unreachable = nodes.filter(n => !allNodesInLayers.has(n));
    if (unreachable.length > 0) {
      layers.push(unreachable);
    }
  }

  reportProgress(progressCallback, 0.7);

  // Position nodes in layers
  const posArray = [];
  const numLayers = layers.length;
  const maxWidth = Math.max(...layers.map(l => l.length));

  layers.forEach((layer, layerIdx) => {
    const x = (numLayers > 1) ? (2 * layerIdx / (numLayers - 1) - 1) : 0;
    const w = layer.length - 1 || 1;

    layer.forEach((node, nodeIdx) => {
      const y = w > 0 ? (2 * nodeIdx / w - 1) : 0;
      posArray.push([x, y]);
    });
  });

  reportProgress(progressCallback, 0.85);

  // Rescale - build nodeOrder array to track which nodes correspond to posArray indices
  const nodeOrder = [];
  layers.forEach(layer => {
    layer.forEach(node => {
      nodeOrder.push(node);
    });
  });

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

  reportProgress(progressCallback, 0.95);

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

/**
 * Perform BFS from a starting node and return nodes grouped by distance
 *
 * @param {Map} graph - Graph with adjacency structure
 * @param {string} startNode - Starting node
 * @param {Array} allNodes - All nodes in graph
 * @returns {Array<Array<string>>} Array of layers, where each layer is an array of nodes
 */
function bfs(graph, startNode, allNodes) {
  const layers = [];
  const visited = new Set();
  const queue = [startNode];
  let currentLayer = [];
  visited.add(startNode);

  while (queue.length > 0) {
    const node = queue.shift();
    currentLayer.push(node);

    const neighbors = graph.getNeighbors(node) || [];
    const unvisitedNeighbors = neighbors.filter(n => !visited.has(n));

    unvisitedNeighbors.forEach(n => {
      visited.add(n);
      queue.push(n);
    });

    // Check if we need to move to next layer
    // This is a bit tricky with queue-based BFS
    // Simple approach: collect all at same distance level
    if (queue.length === 0 || unvisitedNeighbors.length > 0) {
      if (currentLayer.length > 0) {
        layers.push([...currentLayer]);
        currentLayer = [];
      }
    }
  }

  // Proper BFS layering: need to track distance
  layers.length = 0;
  currentLayer = [];
  const distance = new Map();
  const q = [startNode];
  let qIdx = 0;
  distance.set(startNode, 0);
  let currentDist = 0;

  while (qIdx < q.length) {
    const node = q[qIdx];
    const nodeDist = distance.get(node);

    if (nodeDist > currentDist) {
      if (currentLayer.length > 0) {
        layers.push([...currentLayer]);
        currentLayer = [];
      }
      currentDist = nodeDist;
    }

    currentLayer.push(node);

    const neighbors = graph.getNeighbors(node) || [];
    neighbors.forEach(neighbor => {
      if (!distance.has(neighbor)) {
        distance.set(neighbor, nodeDist + 1);
        q.push(neighbor);
      }
    });

    qIdx++;
  }

  if (currentLayer.length > 0) {
    layers.push([...currentLayer]);
  }

  return layers;
}
