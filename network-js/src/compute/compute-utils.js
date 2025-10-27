/**
 * Shared compute utilities for worker functions
 *
 * These are pure helper functions that can be imported by
 * algorithm compute functions. Think of this like React's
 * dependency array - algorithms declare their dependencies.
 *
 * @module compute-utils
 */

import Graph from '../graph.js';

/**
 * Reconstruct a Graph instance from serialized data
 *
 * @param {Object} graphData - Serialized graph
 * @param {Array} graphData.nodes - Node IDs
 * @param {Array} graphData.edges - Edge list
 * @returns {Graph} Reconstructed graph instance
 */
export function reconstructGraph(graphData) {
  console.log('[reconstructGraph] Starting reconstruction with:', {
    isObject: graphData && typeof graphData === 'object',
    hasNodes: graphData && 'nodes' in graphData,
    hasEdges: graphData && 'edges' in graphData,
    graphDataKeys: graphData ? Object.keys(graphData) : 'N/A'
  });

  const graph = new Graph();

  // Defensive: ensure graphData is valid
  if (!graphData || typeof graphData !== 'object') {
    console.error('Invalid graphData passed to reconstructGraph:', graphData);
    return graph;
  }

  // Add all nodes - handle both array and iterable formats
  if (graphData.nodes !== undefined && graphData.nodes !== null) {
    console.log('[reconstructGraph] Processing nodes:', {
      type: typeof graphData.nodes,
      isArray: Array.isArray(graphData.nodes),
      length: Array.isArray(graphData.nodes) ? graphData.nodes.length : 'N/A'
    });

    try {
      // Convert to array if needed (handles Set, Array, or other iterables)
      let nodeArray;
      if (Array.isArray(graphData.nodes)) {
        nodeArray = graphData.nodes;
      } else if (graphData.nodes[Symbol.iterator]) {
        // Check if it's iterable
        nodeArray = Array.from(graphData.nodes);
      } else {
        throw new Error(`nodes is not iterable: ${typeof graphData.nodes}`);
      }

      console.log('[reconstructGraph] Node array created:', { length: nodeArray.length });

      nodeArray.forEach(nodeId => {
        graph.addNode(nodeId);
      });

      console.log('[reconstructGraph] Nodes added successfully, graph.nodes:', {
        type: typeof graph.nodes,
        size: graph.nodes.size
      });
    } catch (error) {
      console.error('[reconstructGraph] Error adding nodes:', error);
      console.error('  nodes value:', graphData.nodes);
      console.error('  nodes type:', typeof graphData.nodes);
      console.error('  nodes constructor:', graphData.nodes?.constructor?.name);
      throw new Error(`Failed to reconstruct nodes: ${error.message}`);
    }
  } else {
    console.warn('[reconstructGraph] No nodes found in graphData');
  }

  // Add all edges - handle edge format variations
  if (graphData.edges !== undefined && graphData.edges !== null) {
    console.log('[reconstructGraph] Processing edges:', {
      type: typeof graphData.edges,
      isArray: Array.isArray(graphData.edges),
      length: Array.isArray(graphData.edges) ? graphData.edges.length : 'N/A'
    });

    try {
      let edgeArray;
      if (Array.isArray(graphData.edges)) {
        edgeArray = graphData.edges;
      } else if (graphData.edges[Symbol.iterator]) {
        edgeArray = Array.from(graphData.edges);
      } else {
        throw new Error(`edges is not iterable: ${typeof graphData.edges}`);
      }

      console.log('[reconstructGraph] Edge array created:', { length: edgeArray.length });

      edgeArray.forEach(edge => {
        // Handle both {source, target} and {u, v} formats
        const source = edge.source !== undefined ? edge.source : edge.u;
        const target = edge.target !== undefined ? edge.target : edge.v;
        const weight = edge.weight || 1;

        if (source !== undefined && target !== undefined) {
          graph.addEdge(source, target, weight);
        }
      });

      console.log('[reconstructGraph] Edges added successfully');
    } catch (error) {
      console.error('[reconstructGraph] Error adding edges:', error);
      console.error('  edges value:', graphData.edges);
      console.error('  edges type:', typeof graphData.edges);
      throw new Error(`Failed to reconstruct edges: ${error.message}`);
    }
  } else {
    console.warn('[reconstructGraph] No edges found in graphData');
  }

  console.log('[reconstructGraph] Reconstruction complete:', {
    nodes: graph.nodes.size,
    edges: graph.edges.length
  });

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
