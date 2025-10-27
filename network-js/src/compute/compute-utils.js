/**
 * Shared compute utilities for worker functions
 *
 * These are pure helper functions that can be imported by
 * algorithm compute functions. Think of this like React's
 * dependency array - algorithms declare their dependencies.
 *
 * @module compute-utils
 */

import { Graph } from '../graph.js';

/**
 * Reconstruct a Graph instance from serialized data
 *
 * @param {Object} graphData - Serialized graph
 * @param {Array} graphData.nodes - Node IDs
 * @param {Array} graphData.edges - Edge list
 * @returns {Graph} Reconstructed graph instance
 */
export function reconstructGraph(graphData) {
  const graph = new Graph();

  // Add all nodes
  if (graphData.nodes) {
    graphData.nodes.forEach(nodeId => {
      graph.addNode(nodeId);
    });
  }

  // Add all edges
  if (graphData.edges) {
    graphData.edges.forEach(edge => {
      const { source, target, weight = 1 } = edge;
      graph.addEdge(source, target, weight);
    });
  }

  return graph;
}

/**
 * Report progress via callback (safe wrapper)
 *
 * @param {Function|null} callback - Progress callback
 * @param {number} progress - Progress value (0-1)
 */
export function reportProgress(callback, progress) {
  if (callback && typeof callback === 'function') {
    callback(Math.min(Math.max(progress, 0), 1));
  }
}

/**
 * Breadth-First Search from a source node
 * Returns distances and predecessor information
 *
 * @param {Graph} graph - Graph to search
 * @param {string|number} source - Source node
 * @returns {Object} { distance: Map, pathCount: Map, predecessors: Map, stack: Array }
 */
export function bfs(graph, source) {
  const distance = new Map([[source, 0]]);
  const pathCount = new Map([[source, 1]]);
  const predecessors = new Map();
  const queue = [source];
  const stack = [];

  while (queue.length > 0) {
    const node = queue.shift();
    stack.push(node);

    const neighbors = graph.getNeighbors(node);
    const currentDist = distance.get(node);

    neighbors.forEach(neighbor => {
      // First time we see this neighbor
      if (!distance.has(neighbor)) {
        distance.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }

      // Shortest path to neighbor
      if (distance.get(neighbor) === currentDist + 1) {
        pathCount.set(neighbor, (pathCount.get(neighbor) || 0) + pathCount.get(node));

        if (!predecessors.has(neighbor)) {
          predecessors.set(neighbor, []);
        }
        predecessors.get(neighbor).push(node);
      }
    });
  }

  return { distance, pathCount, predecessors, stack };
}

/**
 * Simple BFS for distance calculations only
 *
 * @param {Graph} graph - Graph to search
 * @param {string|number} source - Source node
 * @returns {Map} Map of node -> distance from source
 */
export function bfsDistances(graph, source) {
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

  return distances;
}

/**
 * Calculate clustering coefficient for a single node
 *
 * @param {Graph} graph - Graph to analyze
 * @param {string|number} node - Node to analyze
 * @returns {number} Clustering coefficient [0, 1]
 */
export function clusteringCoefficient(graph, node) {
  const neighbors = graph.getNeighbors(node);
  const k = neighbors.length;

  if (k < 2) {
    return 0;
  }

  // Count triangles (connections between neighbors)
  let triangles = 0;
  for (let i = 0; i < neighbors.length; i++) {
    for (let j = i + 1; j < neighbors.length; j++) {
      if (graph.hasEdge(neighbors[i], neighbors[j])) {
        triangles++;
      }
    }
  }

  // Clustering coefficient formula
  return (2 * triangles) / (k * (k - 1));
}

/**
 * Count triangles that a node participates in
 *
 * @param {Graph} graph - Graph to analyze
 * @param {string|number} node - Node to analyze
 * @returns {number} Triangle count
 */
export function countTriangles(graph, node) {
  const neighbors = graph.getNeighbors(node);
  let triangles = 0;

  for (let i = 0; i < neighbors.length; i++) {
    for (let j = i + 1; j < neighbors.length; j++) {
      if (graph.hasEdge(neighbors[i], neighbors[j])) {
        triangles++;
      }
    }
  }

  return triangles;
}

/**
 * Normalize a vector (in-place for efficiency)
 *
 * @param {Object} vector - Object mapping keys to numeric values
 * @returns {Object} Normalized vector
 */
export function normalize(vector) {
  const norm = Math.sqrt(
    Object.values(vector).reduce((sum, val) => sum + val * val, 0)
  );

  if (norm > 0) {
    Object.keys(vector).forEach(key => {
      vector[key] /= norm;
    });
  }

  return vector;
}

/**
 * Calculate L1 distance between two vectors
 *
 * @param {Object} v1 - First vector
 * @param {Object} v2 - Second vector
 * @returns {number} L1 distance (sum of absolute differences)
 */
export function l1Distance(v1, v2) {
  const keys = Object.keys(v1);
  let distance = 0;

  for (const key of keys) {
    distance += Math.abs((v1[key] || 0) - (v2[key] || 0));
  }

  return distance;
}
