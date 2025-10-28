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
      iterations: 200,
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
  // Debug: Log what we're receiving
  console.log('[Kamada-Kawai] Received graphData:', {
    hasNodes: 'nodes' in graphData,
    nodesType: typeof graphData.nodes,
    nodesIsArray: Array.isArray(graphData.nodes),
    hasEdges: 'edges' in graphData,
    edgesType: typeof graphData.edges,
    edgesIsArray: Array.isArray(graphData.edges)
  });

  const graph = reconstructGraph(graphData);

  console.log('[Kamada-Kawai] After reconstructGraph, graph.nodes:', {
    type: typeof graph.nodes,
    isSet: graph.nodes instanceof Set,
    size: graph.nodes?.size || 'N/A'
  });

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

  console.log('[Kamada-Kawai] Nodes array:', {
    length: nodes.length,
    isArray: Array.isArray(nodes),
    sample: nodes.slice(0, 3)
  });

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
  console.log('[Kamada-Kawai] About to compute all-pairs shortest paths:', {
    nodesLength: nodes.length,
    nodesIsArray: Array.isArray(nodes),
    nodesType: typeof nodes
  });

  let distances;
  try {
    distances = computeAllPairsShortestPaths(graph, nodes);
    console.log('[Kamada-Kawai] All-pairs shortest paths computed successfully');

    // Debug: Check for infinite or NaN distances
    let hasInfinity = false, hasNaN = false;
    let infinityCount = 0, nanCount = 0;
    for (let i = 0; i < distances.length; i++) {
      for (let j = 0; j < distances[i].length; j++) {
        if (!isFinite(distances[i][j])) {
          hasInfinity = distances[i][j] === Infinity;
          hasNaN = isNaN(distances[i][j]);
          if (hasInfinity) infinityCount++;
          if (hasNaN) nanCount++;
        }
      }
    }
    if (infinityCount > 0 || nanCount > 0) {
      console.warn('[Kamada-Kawai] Distances contain problematic values:', {
        infinityCount,
        nanCount,
        totalDistances: distances.length * distances[0].length,
        sample: distances[0].slice(0, 5)
      });
    }
  } catch (err) {
    console.error('[Kamada-Kawai] Error in computeAllPairsShortestPaths:', err.message, err.stack);
    throw err;
  }

  reportProgress(progressCallback, 0.3);

  // Initialize positions
  console.log('[Kamada-Kawai] About to initialize positions');
  let pos;
  try {
    pos = initializePositions(nodes, initialPositions);
    console.log('[Kamada-Kawai] Positions initialized successfully, pos:', {
      type: typeof pos,
      isArray: Array.isArray(pos),
      length: pos?.length || 'N/A'
    });
  } catch (err) {
    console.error('[Kamada-Kawai] Error in initializePositions:', err.message, err.stack);
    throw err;
  }

  // Calculate scaling factor K
  // IMPORTANT: Filter out both Infinity and 1e6 placeholder values for disconnected pairs
  // Only use actual graph distances computed via BFS
  const finiteDistances = distances.flat().filter(d => isFinite(d) && d < 1e6);

  if (finiteDistances.length === 0) {
    console.warn('[Kamada-Kawai] All distances are infinite - graph may be disconnected!');
  }

  const Lmax = finiteDistances.length > 0 ? Math.max(...finiteDistances) : 1;
  const Ld = 2 * Lmax; // length of domain edge
  const Kval = K !== null ? K : Ld / n;

  console.log('[Kamada-Kawai] Distance matrix stats:', {
    totalPairs: distances.flat().length,
    finitePairs: finiteDistances.length,
    infinitePairs: distances.flat().length - finiteDistances.length,
    Lmax,
    Ld,
    Kval,
    isKvalFinite: isFinite(Kval)
  });

  reportProgress(progressCallback, 0.4);

  // Optimization loop
  const nodeIndex = {};
  console.log('[Kamada-Kawai] About to call nodes.forEach for nodeIndex');
  try {
    nodes.forEach((node, i) => {
      nodeIndex[node] = i;
    });
    console.log('[Kamada-Kawai] nodeIndex forEach completed successfully');
  } catch (err) {
    console.error('[Kamada-Kawai] Error in nodeIndex forEach:', err.message);
    console.error('  nodes type:', typeof nodes);
    console.error('  nodes isArray:', Array.isArray(nodes));
    console.error('  nodes value:', nodes);
    throw err;
  }

  // Check initial positions before optimization
  console.log('[Kamada-Kawai] Checking initial positions before optimization loop');
  let initialNaNCount = 0;
  for (let i = 0; i < pos.length; i++) {
    if (isNaN(pos[i][0]) || isNaN(pos[i][1])) {
      initialNaNCount++;
      if (initialNaNCount <= 3) {
        console.warn('[Kamada-Kawai] Initial position has NaN at index', i, ':', pos[i]);
      }
    }
  }
  if (initialNaNCount > 0) {
    console.error('[Kamada-Kawai] WARNING: ' + initialNaNCount + ' initial positions have NaN!');
  }

  for (let iter = 0; iter < iterations; iter++) {
    let delta = 0;

    // For each node
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      const [xi, yi] = pos[i];

      // Safety check: detect NaN early - first occurrence only
      if ((isNaN(xi) || isNaN(yi)) && iter < 2) {
        console.warn('[Kamada-Kawai] NaN detected early at iteration', iter, 'node index', i, 'node:', node);
      }

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

        // Skip disconnected node pairs (Infinity or 1e6 placeholder distance)
        if (!isFinite(dij) || dij >= 1e6) {
          continue;
        }

        if (rij === 0) continue; // Skip if nodes are at same position

        const lij = Kval * dij;

        // Safety check: avoid division issues
        if (lij === 0) {
          continue;
        }

        const rijOverLij = rij / lij;

        // Spring force
        const Fspring = (rijOverLij - 1) / dij;

        // Check for NaN in force calculation
        if (!isFinite(Fspring)) {
          continue; // Skip invalid forces
        }

        dxi += Fspring * dx;
        dyi += Fspring * dy;
      }

      // Check for NaN before updating position
      if (isNaN(dxi) || isNaN(dyi)) {
        console.warn('[Kamada-Kawai] NaN in delta at iteration', iter, 'node', i, 'dxi:', dxi, 'dyi:', dyi);
        dxi = isNaN(dxi) ? 0 : dxi;
        dyi = isNaN(dyi) ? 0 : dyi;
      }

      // Use a learning rate to prevent overshooting and oscillation
      const learningRate = 0.1;
      const scaledDxi = learningRate * dxi;
      const scaledDyi = learningRate * dyi;
      delta += Math.sqrt(scaledDxi * scaledDxi + scaledDyi * scaledDyi);
      pos[i][0] -= scaledDxi;
      pos[i][1] -= scaledDyi;

      // Safety check after update
      if (isNaN(pos[i][0]) || isNaN(pos[i][1])) {
        console.error('[Kamada-Kawai] Position became NaN after update at iteration', iter, 'node', i, 'delta was:', dxi, dyi, 'position:', pos[i]);
      }
    }

    reportProgress(progressCallback, 0.4 + (0.6 * (iter + 1) / iterations));

    // Check convergence
    if (delta < threshold) {
      break;
    }
  }

  reportProgress(progressCallback, 0.95);

  // Rescale positions
  // NOTE: rescaleLayout expects (positionsDict, nodesArray, scale, center)
  // But our positions are stored as array of [x, y] pairs
  // Convert to the format rescaleLayout expects, then convert back
  console.log('[Kamada-Kawai] Before rescaling - preparing positions');

  // Create positions object for rescaleLayout
  const positionsDict = {};
  nodes.forEach((nodeId, i) => {
    positionsDict[nodeId] = {
      x: pos[i][0],
      y: pos[i][1]
    };
  });

  // Debug: log sample positions BEFORE rescaling
  const sampleNode = nodes[0];
  console.log('[Kamada-Kawai] Sample positions BEFORE rescaling:', {
    sample: sampleNode,
    value: positionsDict[sampleNode],
    allCount: Object.keys(positionsDict).length,
    minMax: (() => {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      Object.values(positionsDict).forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
      return { minX, maxX, minY, maxY, rangeX: maxX - minX, rangeY: maxY - minY };
    })()
  });

  console.log('[Kamada-Kawai] Calling rescaleLayout with correct signature, scale:', scale, 'center:', center);
  const rescaledDict = rescaleLayout(positionsDict, nodes, scale, center);
  console.log('[Kamada-Kawai] rescaleLayout completed successfully');

  // Debug: log sample positions AFTER rescaling
  console.log('[Kamada-Kawai] Sample positions AFTER rescaling:', {
    sample: sampleNode,
    value: rescaledDict[sampleNode],
    minMax: (() => {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      Object.values(rescaledDict).forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
      return { minX, maxX, minY, maxY, rangeX: maxX - minX, rangeY: maxY - minY };
    })()
  });

  // Create result dictionary from rescaled positions
  const positions = {};
  console.log('[Kamada-Kawai] Creating final positions dictionary');

  try {
    Object.entries(rescaledDict).forEach(([nodeId, posValue]) => {
      positions[nodeId] = {
        x: posValue.x,
        y: posValue.y
      };
    });
    console.log('[Kamada-Kawai] Final positions dictionary created successfully, count:', Object.keys(positions).length);

    // Log a few sample final positions
    const samples = nodes.slice(0, 3);
    const samplePositions = {};
    samples.forEach(n => {
      samplePositions[n] = positions[n];
    });
    console.log('[Kamada-Kawai] Sample final positions:', samplePositions);
  } catch (err) {
    console.error('[Kamada-Kawai] Error creating positions dictionary:', err.message);
    console.error('  rescaledDict:', rescaledDict);
    throw err;
  }

  reportProgress(progressCallback, 1.0);
  return positions;
}

/**
 * Compute all-pairs shortest paths using BFS
 *
 * NetworkX handles disconnected components by using 1e6 instead of Infinity
 * This allows the algorithm to handle graphs with multiple connected components
 *
 * @param {Map} graph - Graph with adjacency structure
 * @param {Array} nodes - List of node IDs
 * @returns {Array<Array<number>>} Distance matrix
 */
function computeAllPairsShortestPaths(graph, nodes) {
  const n = nodes.length;
  // Initialize with 1e6 for disconnected pairs (like NetworkX does)
  // This avoids NaN issues with Infinity in calculations
  const distances = Array(n).fill(null).map(() => Array(n).fill(1e6));
  const nodeIndex = {};

  nodes.forEach((node, i) => {
    nodeIndex[node] = i;
    distances[i][i] = 0;  // Distance to self is 0
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
