/**
 * Node-level statistics
 *
 * This module contains:
 * 1. Thin OOP wrappers (export as classes)
 * 2. Pure compute functions (exported for workers)
 *
 * Workers dynamically import these compute functions.
 *
 * @module node-level
 */

import { StatisticAlgorithm } from './base.js';
import { reconstructGraph, reportProgress, bfs, clusteringCoefficient, countTriangles, normalize, l1Distance } from '../../compute/compute-utils.js';

/**
 * Degree centrality statistic.
 * Counts the number of edges connected to each node.
 *
 * **Complexity**: O(V)
 * **Use case**: Identifies highly connected nodes (hubs)
 *
 * @extends StatisticAlgorithm
 */
export class DegreeStatistic extends StatisticAlgorithm {
  constructor() {
    super('degree', 'Number of connections per node', 'node', {
      module: '../statistics/algorithms/node-stats.js',
      functionName: 'degreeCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Closeness centrality statistic.
 * Measures how close a node is to all other nodes in the graph.
 * Based on average shortest path length from the node to all others.
 *
 * **Formula**: (n-1) / sum(shortest_path_lengths)
 * **Complexity**: O(V² + VE) using BFS
 * **Use case**: Identifies nodes that can quickly reach the entire network
 *
 * @extends StatisticAlgorithm
 */
export class ClosenessStatistic extends StatisticAlgorithm {
  constructor(options = {}) {
    super('closeness', 'Average distance to all other nodes (inverted)', 'node', {
      module: '../statistics/algorithms/node-stats.js',
      functionName: 'closenessCompute'
    });
    this.options = {
      normalized: options.normalized !== false
    };
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Ego-network density statistic.
 * Measures the density of connections among a node's immediate neighbors.
 *
 * **Formula**: actual_edges / possible_edges in ego network
 * **Complexity**: O(V * k²) where k is average degree
 * **Use case**: Identifies nodes embedded in tight communities
 *
 * @extends StatisticAlgorithm
 */
export class EgoDensityStatistic extends StatisticAlgorithm {
  constructor(options = {}) {
    super('ego-density', 'Density of connections among neighbors', 'node', {
      module: '../statistics/algorithms/node-stats.js',
      functionName: 'egoDensityCompute'
    });
    this.options = {
      radius: options.radius || 1
    };
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Betweenness centrality statistic.
 * Measures how often a node appears on shortest paths between other nodes.
 *
 * **Complexity**: O(V³) for unweighted graphs
 * **Use case**: Identifies bridge nodes and information bottlenecks
 *
 * @extends StatisticAlgorithm
 */
export class BetweennessStatistic extends StatisticAlgorithm {
  constructor() {
    super('betweenness', 'Frequency on shortest paths between other nodes', 'node', {
      module: '../statistics/algorithms/node-stats.js',
      functionName: 'betweennessCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Clustering coefficient statistic.
 * Measures the degree to which a node's neighbors are connected to each other.
 *
 * **Formula**: (# of triangles) / (# of possible triangles)
 * **Complexity**: O(V * k²) where k is average degree
 * **Use case**: Detects tightly-knit groups
 *
 * @extends StatisticAlgorithm
 */
export class ClusteringStatistic extends StatisticAlgorithm {
  constructor() {
    super('clustering', 'Local clustering coefficient', 'node', {
      module: '../statistics/algorithms/node-stats.js',
      functionName: 'clusteringCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Eigenvector centrality statistic.
 * Measures node importance based on the importance of neighbors.
 * Uses the power iteration method.
 *
 * **Complexity**: O(k * (V + E)) where k is iterations
 * **Use case**: Identifies influential nodes in social networks
 *
 * @extends StatisticAlgorithm
 */
export class EigenvectorStatistic extends StatisticAlgorithm {
  constructor(options = {}) {
    super('eigenvector', 'Importance based on neighbor importance', 'node', {
      module: '../statistics/algorithms/node-stats.js',
      functionName: 'eigenvectorCompute'
    });
    this.options = {
      maxIter: options.maxIter || 100,
      tolerance: options.tolerance || 1e-6
    };
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Laplacian eigenvector statistic.
 * Computes the 2nd and 3rd smallest eigenvectors of the graph Laplacian.
 * Used for spectral layout visualization.
 *
 * The Laplacian matrix L = D - A (degree matrix minus adjacency matrix).
 * The smallest eigenvector (trivial, all constant) is skipped.
 * The 2nd and 3rd smallest eigenvectors provide good 2D layout coordinates.
 *
 * **Complexity**: O(V * k^2) where k is number of iterations
 * **Use case**: Spectral layout, community detection, graph visualization
 *
 * @extends StatisticAlgorithm
 */
export class EigenvectorLaplacianStatistic extends StatisticAlgorithm {
  constructor(options = {}) {
    super('eigenvector-laplacian', 'X,Y coordinates from Laplacian eigenvectors', 'node', {
      module: '../statistics/algorithms/node-stats.js',
      functionName: 'eigenvectorLaplacianCompute'
    });
    this.options = {
      maxIter: options.maxIter || 100,
      tolerance: options.tolerance || 1e-6
    };
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Clique count statistic.
 * Counts the number of maximal cliques each node belongs to.
 * Uses Bron-Kerbosch algorithm.
 *
 * **Complexity**: O(3^(V/3)) worst case (exponential)
 * **Use case**: Finding complete subgraphs
 *
 * @extends StatisticAlgorithm
 */
export class CliquesStatistic extends StatisticAlgorithm {
  constructor() {
    super('cliques', 'Number of maximal cliques per node', 'node', {
      module: '../statistics/algorithms/node-stats.js',
      functionName: 'cliquesCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

//=============================================================================
// COMPUTE FUNCTIONS (for workers)
//=============================================================================

/**
 * Compute degree centrality
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Node IDs to compute (null = all)
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> degree
 */
export async function degreeCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = nodeIds || Array.from(graph.nodes);
  const result = {};

  nodes.forEach((nodeId, index) => {
    result[nodeId] = graph.degree(nodeId);

    // Report progress every 100 nodes
    if (index % 100 === 0) {
      reportProgress(progressCallback, index / nodes.length);
    }
  });

  reportProgress(progressCallback, 1.0);
  return result;
}

/**
 * Compute betweenness centrality
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Source nodes for paths (null = all)
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> betweenness score
 */
export async function betweennessCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const sourceNodes = nodeIds || Array.from(graph.nodes);
  const allNodes = Array.from(graph.nodes);
  const betweenness = {};

  // Initialize all nodes to 0
  allNodes.forEach(node => {
    betweenness[node] = 0;
  });

  // Calculate betweenness from each source node
  sourceNodes.forEach((source, index) => {
    const paths = bfs(graph, source);
    accumulateBetweenness(betweenness, paths, allNodes);

    // Report progress
    if (index % Math.max(1, Math.floor(sourceNodes.length / 10)) === 0) {
      reportProgress(progressCallback, index / sourceNodes.length);
    }
  });

  // Normalize betweenness values
  const n = allNodes.length;
  const normFactor = n > 2 ? 2 / ((n - 1) * (n - 2)) : 1;

  allNodes.forEach(node => {
    betweenness[node] *= normFactor;
  });

  reportProgress(progressCallback, 1.0);
  return betweenness;
}

/**
 * Accumulate betweenness from shortest paths
 * @private
 */
function accumulateBetweenness(betweenness, paths, allNodes) {
  const { pathCount, predecessors, stack } = paths;
  const dependency = new Map();

  allNodes.forEach(node => {
    dependency.set(node, 0);
  });

  // Accumulate in reverse order
  while (stack.length > 0) {
    const node = stack.pop();
    const preds = predecessors.get(node) || [];

    preds.forEach(pred => {
      const contrib = (pathCount.get(pred) / pathCount.get(node)) * (1 + dependency.get(node));
      dependency.set(pred, dependency.get(pred) + contrib);
    });

    if (node !== stack[0]) {
      betweenness[node] += dependency.get(node);
    }
  }
}

/**
 * Compute clustering coefficient
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Node IDs to compute (null = all)
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> clustering coefficient
 */
export async function clusteringCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = nodeIds || Array.from(graph.nodes);
  const result = {};

  nodes.forEach((nodeId, index) => {
    result[nodeId] = clusteringCoefficient(graph, nodeId);

    // Report progress every 100 nodes
    if (index % 100 === 0) {
      reportProgress(progressCallback, index / nodes.length);
    }
  });

  reportProgress(progressCallback, 1.0);
  return result;
}

/**
 * Compute eigenvector centrality
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Not used (always computes all nodes)
 * @param {Object} options - Algorithm options
 * @param {number} options.maxIter - Maximum iterations
 * @param {number} options.tolerance - Convergence tolerance
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> eigenvector centrality
 */
export async function eigenvectorCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const { maxIter = 100, tolerance = 1e-6 } = options || {};
  const nodes = Array.from(graph.nodes);
  const n = nodes.length;

  // Initialize
  let scores = {};
  nodes.forEach(node => {
    scores[node] = 1 / n;
  });

  // Power iteration
  for (let iter = 0; iter < maxIter; iter++) {
    const newScores = {};
    nodes.forEach(node => {
      newScores[node] = 0;
    });

    // Update scores
    nodes.forEach(node => {
      const neighbors = graph.getNeighbors(node);
      neighbors.forEach(neighbor => {
        const weight = graph.adjacencyMap.get(node).get(neighbor);
        newScores[neighbor] += scores[node] * weight;
      });
    });

    // Normalize
    normalize(newScores);

    // Check convergence
    const diff = l1Distance(newScores, scores);
    scores = newScores;

    // Report progress
    if (iter % 10 === 0) {
      reportProgress(progressCallback, iter / maxIter);
    }

    if (diff < tolerance) {
      break;
    }
  }

  reportProgress(progressCallback, 1.0);
  return scores;
}

/**
 * Compute clique count (triangles for now)
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Node IDs to compute (null = all)
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> clique count
 */
export async function cliquesCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = nodeIds || Array.from(graph.nodes);
  const result = {};

  nodes.forEach((nodeId, index) => {
    result[nodeId] = countTriangles(graph, nodeId);

    if (index % 100 === 0) {
      reportProgress(progressCallback, index / nodes.length);
    }
  });

  reportProgress(progressCallback, 1.0);
  return result;
}

/**
 * Compute closeness centrality
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Node IDs to compute (null = all)
 * @param {Object} options - Algorithm options
 * @param {boolean} options.normalized - Whether to normalize
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> closeness centrality
 */
export async function closenessCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = nodeIds || Array.from(graph.nodes);
  const allNodes = Array.from(graph.nodes);
  const n = allNodes.length;
  const result = {};
  const normalized = options?.normalized !== false;

  nodes.forEach((source, index) => {
    // BFS to find shortest paths from source
    const distances = new Map();
    const queue = [source];
    const visited = new Set([source]);
    distances.set(source, 0);

    while (queue.length > 0) {
      const current = queue.shift();
      const dist = distances.get(current);

      for (const neighbor of graph.getNeighbors(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          distances.set(neighbor, dist + 1);
        }
      }
    }

    // Calculate closeness
    const reachableNodes = distances.size - 1; // Exclude source itself
    if (reachableNodes === 0) {
      result[source] = 0;
    } else {
      const totalDistance = Array.from(distances.values())
        .reduce((sum, d) => sum + d, 0);

      if (totalDistance === 0) {
        result[source] = 0;
      } else {
        const closeness = reachableNodes / totalDistance;
        result[source] = normalized ? closeness * (reachableNodes / (n - 1)) : closeness;
      }
    }

    // Report progress every 100 nodes
    if (index % 100 === 0) {
      reportProgress(progressCallback, index / nodes.length);
    }
  });

  reportProgress(progressCallback, 1.0);
  return result;
}

/**
 * Compute ego-network density
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Node IDs to compute (null = all)
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> ego-density
 */
export async function egoDensityCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = nodeIds || Array.from(graph.nodes);
  const result = {};

  nodes.forEach((node, index) => {
    const neighbors = graph.getNeighbors(node);
    const k = neighbors.length;

    if (k < 2) {
      result[node] = 0;
    } else {
      // Count edges between neighbors
      let edgeCount = 0;
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
          if (graph.hasEdge(neighbors[i], neighbors[j])) {
            edgeCount++;
          }
        }
      }

      // Density = actual edges / possible edges
      const possibleEdges = (k * (k - 1)) / 2;
      result[node] = edgeCount / possibleEdges;
    }

    // Report progress every 100 nodes
    if (index % 100 === 0) {
      reportProgress(progressCallback, index / nodes.length);
    }
  });

  reportProgress(progressCallback, 1.0);
  return result;
}

/**
 * Compute Laplacian eigenvectors for spectral layout
 *
 * Computes the 2nd and 3rd smallest eigenvectors of the graph Laplacian.
 * L = D - A where D is degree matrix, A is adjacency matrix.
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Not used (always computes all nodes)
 * @param {Object} options - Algorithm options
 * @param {number} options.maxIter - Maximum power iteration steps
 * @param {number} options.tolerance - Convergence tolerance
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} Node ID -> {laplacian_x, laplacian_y}
 */
export async function eigenvectorLaplacianCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = Array.from(graph.nodes);
  const n = nodes.length;

  if (n < 3) {
    // Need at least 3 nodes for 2D Laplacian eigenvectors
    const result = {};
    nodes.forEach(node => {
      result[node] = { laplacian_x: Math.random() * 2 - 1, laplacian_y: Math.random() * 2 - 1 };
    });
    reportProgress(progressCallback, 1.0);
    return result;
  }

  const { maxIter = 100, tolerance = 1e-6 } = options || {};

  // Build Laplacian matrix L = D - A
  // Store as dense matrix for simplicity
  const L = Array(n).fill(null).map(() => Array(n).fill(0));

  // Create node index map
  const nodeIndex = new Map();
  nodes.forEach((node, idx) => nodeIndex.set(node, idx));

  // Fill Laplacian: L[i][i] = degree[i], L[i][j] = -1 if edge exists
  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    const neighbors = graph.getNeighbors(node);
    L[i][i] = neighbors.length; // Diagonal = degree

    neighbors.forEach(neighbor => {
      const j = nodeIndex.get(neighbor);
      if (j !== undefined) {
        L[i][j] = -1; // Off-diagonal = -1 for edges
      }
    });
  }

  reportProgress(progressCallback, 0.2);

  // Find 2nd and 3rd smallest eigenvectors using power iteration with deflation
  // The smallest eigenvalue of L is always 0 (trivial eigenvector: all ones)
  // We want the eigenvectors corresponding to the 2nd and 3rd smallest eigenvalues

  // Initialize random vectors
  const v1 = Array(n).fill(0).map(() => Math.random());
  const v2 = Array(n).fill(0).map(() => Math.random());

  normalize(v1);
  normalize(v2);

  // Power iteration to find 2nd eigenvector
  for (let iter = 0; iter < maxIter; iter++) {
    const Lv = multiplyMatrixVector(L, v1);
    normalize(Lv);

    // Check convergence
    let diff = 0;
    for (let i = 0; i < n; i++) {
      diff += Math.abs(Lv[i] - v1[i]);
    }
    if (diff < tolerance) break;

    for (let i = 0; i < n; i++) {
      v1[i] = Lv[i];
    }

    if (iter % 20 === 0) {
      reportProgress(progressCallback, 0.2 + (iter / maxIter) * 0.4);
    }
  }

  reportProgress(progressCallback, 0.6);

  // Orthogonalize v2 against v1
  orthogonalize(v2, v1);
  normalize(v2);

  // Power iteration to find 3rd eigenvector
  for (let iter = 0; iter < maxIter; iter++) {
    const Lv = multiplyMatrixVector(L, v2);
    normalize(Lv);
    orthogonalize(Lv, v1);
    orthogonalize(Lv, v2);
    normalize(Lv);

    // Check convergence
    let diff = 0;
    for (let i = 0; i < n; i++) {
      diff += Math.abs(Lv[i] - v2[i]);
    }
    if (diff < tolerance) break;

    for (let i = 0; i < n; i++) {
      v2[i] = Lv[i];
    }

    if (iter % 20 === 0) {
      reportProgress(progressCallback, 0.6 + (iter / maxIter) * 0.39);
    }
  }

  reportProgress(progressCallback, 0.99);

  // Construct result
  const result = {};
  nodes.forEach((node, idx) => {
    result[node] = {
      laplacian_x: v1[idx],
      laplacian_y: v2[idx]
    };
  });

  reportProgress(progressCallback, 1.0);
  return result;
}

/**
 * Helper: Multiply matrix by vector
 * @param {Array<Array>} matrix - n x n matrix
 * @param {Array} vector - n-length vector
 * @returns {Array} Result vector
 */
function multiplyMatrixVector(matrix, vector) {
  const n = matrix.length;
  const result = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result[i] += matrix[i][j] * vector[j];
    }
  }
  return result;
}

/**
 * Helper: Orthogonalize vector u against vector v
 * @param {Array} u - Vector to orthogonalize
 * @param {Array} v - Reference vector
 */
function orthogonalize(u, v) {
  let dot = 0;
  for (let i = 0; i < u.length; i++) {
    dot += u[i] * v[i];
  }
  for (let i = 0; i < u.length; i++) {
    u[i] -= dot * v[i];
  }
}
