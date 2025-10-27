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
