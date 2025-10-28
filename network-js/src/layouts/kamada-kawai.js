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
      iterations: 1000,
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

  // Calculate scaling factors following igraph's approach
  // IMPORTANT: Only use actual BFS distances (finite distances)
  // After replacement in computeAllPairsShortestPaths, all values are finite,
  // but we still filter out the special self-distance (0)
  const finiteDistances = distances.flat().filter(d => isFinite(d) && d > 0);

  if (finiteDistances.length === 0) {
    console.warn('[Kamada-Kawai] All distances are placeholder (disconnected)!');
  }

  // Use reduce instead of Math.max(...) to avoid "too many function arguments" error
  // for large graphs (spread operator has argument limit ~65k-100k)
  const max_dij = finiteDistances.length > 0
    ? finiteDistances.reduce((max, d) => Math.max(max, d), 0)
    : 1;

  // Following igraph's implementation:
  // L0 = sqrt(n) - natural length scale
  // L = L0 / max_dij - scales desired distances to fit layout space
  // K = kkconst (default: n) - spring constant strength
  const L0 = Math.sqrt(n);
  const L = L0 / max_dij;
  const kkconst = K !== null ? K : n; // Default to number of vertices like igraph

  console.log('[Kamada-Kawai] Distance matrix stats:', {
    totalPairs: distances.flat().length,
    finitePairs: finiteDistances.length,
    infinitePairs: distances.flat().length - finiteDistances.length,
    max_dij,
    L0,
    L,
    kkconst,
    isKvalFinite: isFinite(kkconst) && isFinite(L),
    avgDij: finiteDistances.reduce((a, b) => a + b, 0) / finiteDistances.length
  });

  reportProgress(progressCallback, 0.4);

  // Pre-compute kij and lij matrices (following igraph)
  const kij = Array(n).fill(null).map(() => Array(n).fill(0));
  const lij = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dij = distances[i][j];
      kij[i][j] = kkconst / (dij * dij);
      lij[i][j] = L * dij;
    }
  }

  // Sample some kij and lij values to verify they're reasonable
  if (n > 1) {
    const sampleI = 0, sampleJ = 1;
    const initialDist = Math.sqrt(
      Math.pow(pos[sampleI][0] - pos[sampleJ][0], 2) +
      Math.pow(pos[sampleI][1] - pos[sampleJ][1], 2)
    );
    console.log('[Kamada-Kawai] Sample spring values:', {
      'graph_dist[0,1]': distances[sampleI][sampleJ],
      'spring_const_kij[0,1]': kij[sampleI][sampleJ].toExponential(4),
      'desired_dist_lij[0,1]': lij[sampleI][sampleJ].toFixed(4),
      'initial_euclidean_dist': initialDist.toFixed(4),
      'stress_ratio': (initialDist / lij[sampleI][sampleJ]).toFixed(4),
      'force': (kij[sampleI][sampleJ] * Math.abs(initialDist - lij[sampleI][sampleJ])).toExponential(4)
    });
  }

  // Initialize gradient vectors D1 and D2 (following igraph lines 220-234)
  const D1 = Array(n).fill(0);
  const D2 = Array(n).fill(0);

  for (let m = 0; m < n; m++) {
    for (let i = 0; i < n; i++) {
      if (i === m) continue;

      const dx = pos[m][0] - pos[i][0];
      const dy = pos[m][1] - pos[i][1];
      const mi_dist = Math.sqrt(dx * dx + dy * dy);

      if (mi_dist === 0) continue;

      D1[m] += kij[m][i] * (dx - lij[m][i] * dx / mi_dist);
      D2[m] += kij[m][i] * (dy - lij[m][i] * dy / mi_dist);
    }
  }

  // Log initial gradient statistics
  const initialEnergies = D1.map((d1, i) => Math.sqrt(d1 * d1 + D2[i] * D2[i]));
  const maxInitialEnergy = Math.max(...initialEnergies);
  const avgInitialEnergy = initialEnergies.reduce((a, b) => a + b, 0) / n;
  console.log('[Kamada-Kawai] Initial gradient stats:', {
    maxEnergy: maxInitialEnergy.toFixed(4),
    avgEnergy: avgInitialEnergy.toFixed(4),
    threshold: Math.sqrt(threshold).toFixed(6)
  });

  // Optimization loop - following igraph's one-node-at-a-time approach
  for (let iter = 0; iter < iterations; iter++) {
    // Select node with maximum gradient (following igraph lines 246-253)
    let m = 0;
    let max_delta = -1;
    for (let i = 0; i < n; i++) {
      const delta = D1[i] * D1[i] + D2[i] * D2[i];
      if (delta > max_delta) {
        m = i;
        max_delta = delta;
      }
    }

    // Check convergence
    if (max_delta < threshold) {
      console.log(`[Kamada-Kawai] Converged at iteration ${iter}/${iterations} with max_delta ${Math.sqrt(max_delta).toFixed(6)} (threshold: ${Math.sqrt(threshold).toFixed(6)})`);
      break;
    }

    reportProgress(progressCallback, 0.4 + (0.6 * (iter + 1) / iterations));

    // Enhanced progress logging
    if (iter % 500 === 0 || iter < 5 || iter === iterations - 1) {
      console.log(`[Kamada-Kawai] Iteration ${iter}/${iterations}: max_delta = ${Math.sqrt(max_delta).toFixed(6)}, node ${m}`);
    }

    const old_x = pos[m][0];
    const old_y = pos[m][1];

    // Calculate Hessian matrix elements (following igraph lines 260-273)
    let A = 0, B = 0, C = 0;
    for (let i = 0; i < n; i++) {
      if (i === m) continue;

      const dx = old_x - pos[i][0];
      const dy = old_y - pos[i][1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) continue;

      const den = dist * (dx * dx + dy * dy);
      A += kij[m][i] * (1 - lij[m][i] * dy * dy / den);
      B += kij[m][i] * lij[m][i] * dx * dy / den;
      C += kij[m][i] * (1 - lij[m][i] * dx * dx / den);
    }

    // Solve 2x2 linear system using Cramer's rule (following igraph lines 288-295)
    let delta_x = 0, delta_y = 0;
    const KK_EPS = 1e-13;
    const myD1 = D1[m];
    const myD2 = D2[m];

    if (myD1 * myD1 + myD2 * myD2 >= KK_EPS * KK_EPS) {
      const det = C * A - B * B;
      if (Math.abs(det) > 1e-10) {
        delta_y = (B * myD1 - A * myD2) / det;
        delta_x = (B * myD2 - C * myD1) / det;
      } else if (iter < 5) {
        console.warn(`[Kamada-Kawai] Iteration ${iter}: Singular matrix (det=${det.toExponential(2)}) for node ${m}`);
      }
    } else if (iter < 5) {
      console.warn(`[Kamada-Kawai] Iteration ${iter}: Gradient too small for node ${m}`);
    }

    // Debug: Log deltas for first few iterations
    if (iter < 3 && m === 0) {
      console.log(`[Kamada-Kawai] Iteration ${iter}, node ${m}:`, {
        A: A.toFixed(4),
        B: B.toFixed(4),
        C: C.toFixed(4),
        det: (C * A - B * B).toExponential(4),
        myD1: myD1.toFixed(4),
        myD2: myD2.toFixed(4),
        delta_x: delta_x.toFixed(6),
        delta_y: delta_y.toFixed(6),
        old_pos: [old_x.toFixed(2), old_y.toFixed(2)]
      });
    }

    const new_x = old_x + delta_x;
    const new_y = old_y + delta_y;

    // Update gradients incrementally (following igraph lines 315-341)
    D1[m] = 0;
    D2[m] = 0;

    for (let i = 0; i < n; i++) {
      if (i === m) continue;

      const old_dx = old_x - pos[i][0];
      const old_dy = old_y - pos[i][1];
      const old_mi_dist = Math.sqrt(old_dx * old_dx + old_dy * old_dy);

      const new_dx = new_x - pos[i][0];
      const new_dy = new_y - pos[i][1];
      const new_mi_dist = Math.sqrt(new_dx * new_dx + new_dy * new_dy);

      if (old_mi_dist === 0 || new_mi_dist === 0) continue;

      // Update gradient for node i
      D1[i] -= kij[m][i] * (-old_dx + lij[m][i] * old_dx / old_mi_dist);
      D2[i] -= kij[m][i] * (-old_dy + lij[m][i] * old_dy / old_mi_dist);
      D1[i] += kij[m][i] * (-new_dx + lij[m][i] * new_dx / new_mi_dist);
      D2[i] += kij[m][i] * (-new_dy + lij[m][i] * new_dy / new_mi_dist);

      // Update gradient for node m
      D1[m] += kij[m][i] * (new_dx - lij[m][i] * new_dx / new_mi_dist);
      D2[m] += kij[m][i] * (new_dy - lij[m][i] * new_dy / new_mi_dist);
    }

    // Update position
    pos[m][0] = new_x;
    pos[m][1] = new_y;
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
  // Initialize with Infinity (igraph approach)
  const distances = Array(n).fill(null).map(() => Array(n).fill(Infinity));
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

  // Find maximum finite distance
  let max_dij = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isFinite(distances[i][j]) && distances[i][j] > max_dij) {
        max_dij = distances[i][j];
      }
    }
  }

  // Replace infinite distances with max_dij (igraph approach)
  // This effectively makes the graph connected
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (distances[i][j] > max_dij) {
        distances[i][j] = max_dij;
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
    // Choose initialization strategy based on graph size
    const L0 = Math.sqrt(n);

    if (n > 100) {
      // Random initialization for large graphs
      // Circular creates too much artificial structure
      // Spread nodes in a square region roughly matching desired final scale
      const spread = L0 * 3; // Larger spread to avoid initial overcrowding
      console.log(`[Kamada-Kawai] Random initialization: spread=${spread.toFixed(2)}, L0=${L0.toFixed(2)}`);
      for (let i = 0; i < n; i++) {
        // Random positions in [-spread/2, spread/2] x [-spread/2, spread/2]
        const x = (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * spread;
        positions.push([x, y]);
      }
    } else {
      // Circular initial positions for small graphs
      const angle = (2 * Math.PI) / n;
      const radius = L0 * 2;
      console.log(`[Kamada-Kawai] Circular initialization: radius=${radius.toFixed(2)}, L0=${L0.toFixed(2)}`);
      for (let i = 0; i < n; i++) {
        const x = radius * Math.cos(i * angle);
        const y = radius * Math.sin(i * angle);
        positions.push([x, y]);
      }
    }
  }

  return positions;
}
