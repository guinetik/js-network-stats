/**
 * Graph-level statistics
 *
 * This module contains:
 * 1. Thin OOP wrappers (export as classes)
 * 2. Pure compute functions (exported for workers)
 *
 * Workers dynamically import these compute functions.
 *
 * @module graph-level
 */

import { StatisticAlgorithm } from './base.js';
import { reconstructGraph, reportProgress, clusteringCoefficient, bfsDistances } from '../../compute/compute-utils.js';

/**
 * Graph density statistic.
 * Measures how close the network is to being complete.
 *
 * **Formula**: 2m / (n(n-1)) for undirected graphs
 * **Complexity**: O(1) - just counting edges and nodes
 * **Use case**: Measure overall network connectivity
 * **Range**: [0, 1] where 1 is a complete graph
 *
 * @extends StatisticAlgorithm
 */
export class DensityStatistic extends StatisticAlgorithm {
  constructor() {
    super('density', 'Ratio of actual edges to possible edges', 'graph', {
      module: '../statistics/algorithms/graph-stats.js',
      functionName: 'densityCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Graph diameter statistic.
 * The longest shortest path in the graph.
 *
 * **Complexity**: O(V³) using Floyd-Warshall or O(VE) using repeated BFS
 * **Use case**: Measure maximum separation in network
 * **Note**: Returns Infinity for disconnected graphs
 *
 * @extends StatisticAlgorithm
 */
export class DiameterStatistic extends StatisticAlgorithm {
  constructor() {
    super('diameter', 'Longest shortest path in the graph', 'graph', {
      module: '../statistics/algorithms/graph-stats.js',
      functionName: 'diameterCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Average clustering coefficient statistic.
 * Mean of all node clustering coefficients in the graph.
 *
 * **Complexity**: O(V * k²) where k is average degree
 * **Use case**: Measure overall tendency to form clusters
 * **Range**: [0, 1]
 *
 * @extends StatisticAlgorithm
 */
export class AverageClusteringStatistic extends StatisticAlgorithm {
  constructor() {
    super('average_clustering', 'Mean clustering coefficient across all nodes', 'graph', {
      module: '../statistics/algorithms/graph-stats.js',
      functionName: 'averageClusteringCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Average shortest path length statistic.
 * Mean of all pairwise shortest path lengths.
 *
 * **Complexity**: O(V² + VE) using repeated BFS
 * **Use case**: Measure typical separation between nodes
 * **Note**: Only considers connected pairs
 *
 * @extends StatisticAlgorithm
 */
export class AverageShortestPathStatistic extends StatisticAlgorithm {
  constructor() {
    super('average_shortest_path', 'Mean distance between all node pairs', 'graph', {
      module: '../statistics/algorithms/graph-stats.js',
      functionName: 'averageShortestPathCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Connected components statistic.
 * Counts the number of disconnected subgraphs.
 *
 * **Complexity**: O(V + E) using BFS/DFS
 * **Use case**: Identify network fragmentation
 * **Returns**: { count: number, components: {nodeId: componentId} }
 *
 * @extends StatisticAlgorithm
 */
export class ConnectedComponentsStatistic extends StatisticAlgorithm {
  constructor() {
    super('connected_components', 'Number of disconnected subgraphs', 'graph', {
      module: '../statistics/algorithms/graph-stats.js',
      functionName: 'connectedComponentsCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

/**
 * Average degree statistic.
 * Mean number of connections per node.
 *
 * **Complexity**: O(V)
 * **Use case**: Measure overall network connectivity
 *
 * @extends StatisticAlgorithm
 */
export class AverageDegreeStatistic extends StatisticAlgorithm {
  constructor() {
    super('average_degree', 'Mean number of connections per node', 'graph', {
      module: '../statistics/algorithms/graph-stats.js',
      functionName: 'averageDegreeCompute'
    });
  }
  // calculate() inherited from base class - delegates to worker!
}

//=============================================================================
// COMPUTE FUNCTIONS (for workers)
//=============================================================================

/**
 * Compute graph density
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Not used for graph-level stats
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {number} Graph density
 */
export async function densityCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const n = graph.nodes.size;
  const m = graph.edges.length;

  if (n < 2) {
    return 0;
  }

  // For undirected graph: density = 2m / (n(n-1))
  const maxEdges = (n * (n - 1)) / 2;
  const density = m / maxEdges;

  reportProgress(progressCallback, 1.0);
  return density;
}

/**
 * Compute graph diameter
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Not used for graph-level stats
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {number} Graph diameter
 */
export async function diameterCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = Array.from(graph.nodes);
  let diameter = 0;

  // BFS from each node to find longest shortest path
  nodes.forEach((source, index) => {
    const distances = bfsDistances(graph, source);

    // Find max distance from this source
    for (const dist of distances.values()) {
      if (dist > diameter) {
        diameter = dist;
      }
    }

    // Report progress
    if (index % Math.max(1, Math.floor(nodes.length / 10)) === 0) {
      reportProgress(progressCallback, index / nodes.length);
    }
  });

  reportProgress(progressCallback, 1.0);
  return diameter;
}

/**
 * Compute average clustering coefficient
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Not used for graph-level stats
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {number} Average clustering coefficient
 */
export async function averageClusteringCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = Array.from(graph.nodes);
  let sum = 0;

  nodes.forEach((node, index) => {
    sum += clusteringCoefficient(graph, node);

    if (index % 100 === 0) {
      reportProgress(progressCallback, index / nodes.length);
    }
  });

  reportProgress(progressCallback, 1.0);
  return nodes.length > 0 ? sum / nodes.length : 0;
}

/**
 * Compute average shortest path length
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Not used for graph-level stats
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {number} Average shortest path length
 */
export async function averageShortestPathCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = Array.from(graph.nodes);
  let totalPaths = 0;
  let totalDistance = 0;

  nodes.forEach((source, index) => {
    // BFS from source
    const distances = bfsDistances(graph, source);

    // Sum distances (excluding self)
    distances.forEach((dist, target) => {
      if (target !== source) {
        totalDistance += dist;
        totalPaths++;
      }
    });

    if (index % Math.max(1, Math.floor(nodes.length / 10)) === 0) {
      reportProgress(progressCallback, index / nodes.length);
    }
  });

  reportProgress(progressCallback, 1.0);
  return totalPaths > 0 ? totalDistance / totalPaths : 0;
}

/**
 * Compute connected components
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Not used for graph-level stats
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} { count, components }
 */
export async function connectedComponentsCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = Array.from(graph.nodes);
  const visited = new Set();
  const components = {};
  let componentId = 0;

  nodes.forEach(node => {
    if (!visited.has(node)) {
      // BFS to find all nodes in this component
      const queue = [node];
      visited.add(node);
      components[node] = componentId;

      while (queue.length > 0) {
        const current = queue.shift();

        for (const neighbor of graph.getNeighbors(current)) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
            components[neighbor] = componentId;
          }
        }
      }

      componentId++;
    }
  });

  reportProgress(progressCallback, 1.0);
  return {
    count: componentId,
    components
  };
}

/**
 * Compute average degree
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Array} nodeIds - Not used for graph-level stats
 * @param {Object} options - Algorithm options
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {number} Average degree
 */
export async function averageDegreeCompute(graphData, nodeIds, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const nodes = Array.from(graph.nodes);
  let sum = 0;

  nodes.forEach(node => {
    sum += graph.getNeighbors(node).length;
  });

  reportProgress(progressCallback, 1.0);
  return nodes.length > 0 ? sum / nodes.length : 0;
}
