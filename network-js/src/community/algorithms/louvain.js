/**
 * Louvain community detection algorithm
 *
 * This module contains:
 * 1. Thin OOP wrapper (export as class)
 * 2. Pure compute function (exported for workers)
 *
 * Workers dynamically import the compute function.
 *
 * @module louvain
 */

import { CommunityAlgorithm } from './base.js';
import { reconstructGraph, reportProgress } from '../../compute/compute-utils.js';

/**
 * Louvain community detection algorithm implementation.
 *
 * The Louvain method is a greedy optimization method that attempts to optimize
 * the modularity of a partition of the network. It's one of the most popular
 * community detection algorithms due to its speed and effectiveness.
 *
 * **Time Complexity**: O(n log n) where n is the number of nodes
 * **Space Complexity**: O(n + m) where m is the number of edges
 *
 * @extends CommunityAlgorithm
 * @class
 * @example
 * import { Graph } from '@guinetik/network-js';
 * import { LouvainAlgorithm } from '@guinetik/network-js';
 *
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C', 'D']);
 * graph.addEdge('A', 'B', 1);
 * graph.addEdge('B', 'C', 1);
 * graph.addEdge('C', 'D', 1);
 *
 * const algorithm = new LouvainAlgorithm();
 * const result = await algorithm.detect(graph); // NOW ASYNC!
 * console.log(result.communities); // { 'A': 0, 'B': 0, 'C': 1, 'D': 1 }
 */
export class LouvainAlgorithm extends CommunityAlgorithm {
  /**
   * Create a Louvain algorithm instance
   *
   * @param {Object} [options={}] - Algorithm options
   * @param {number} [options.resolution=1.0] - Resolution parameter for modularity
   * @param {number} [options.maxIterations=100] - Maximum number of iterations
   */
  constructor(options = {}) {
    super(
      'louvain',
      'Louvain method for community detection using modularity optimization',
      {
        module: '../community/algorithms/louvain.js',
        functionName: 'louvainCompute'
      }
    );

    this.options = {
      resolution: options.resolution || 1.0,
      maxIterations: options.maxIterations || 100
    };
  }
  // detect() inherited from base class - delegates to worker!
}

export default LouvainAlgorithm;

//=============================================================================
// COMPUTE FUNCTION (for workers)
//=============================================================================

/**
 * Compute Louvain community detection
 *
 * @param {Object} graphData - Serialized graph data
 * @param {Object} options - Algorithm options
 * @param {number} options.resolution - Resolution parameter
 * @param {number} options.maxIterations - Maximum iterations
 * @param {Function} progressCallback - Progress reporting callback
 * @returns {Object} { communities, modularity, numCommunities, iterations }
 */
export async function louvainCompute(graphData, options, progressCallback) {
  const graph = reconstructGraph(graphData);
  const { resolution = 1.0, maxIterations = 100 } = options || {};
  const nodes = Array.from(graph.nodes);

  // Helper function to get weighted degree of a node
  const getWeightedDegree = (node) => {
    const neighbors = graph.getNeighbors(node);
    let weightedDegree = 0;
    neighbors.forEach(neighbor => {
      weightedDegree += graph.getEdgeWeight(node, neighbor);
    });
    return weightedDegree;
  };

  // Calculate total edge weight (2m for undirected graphs)
  let totalWeight = 0;
  graph.edges.forEach(edge => {
    totalWeight += edge.weight;
  });
  const m2 = 2 * totalWeight; // 2m for undirected graphs

  // Initialize: each node in its own community
  const communities = {};
  nodes.forEach(node => {
    communities[node] = node;
  });

  let improved = true;
  let iteration = 0;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;

    // Phase 1: Local moving
    for (const node of nodes) {
      const currentCommunity = communities[node];
      const neighbors = graph.getNeighbors(node);

      // Find neighbor communities
      const neighborCommunities = new Set();
      neighbors.forEach(neighbor => {
        neighborCommunities.add(communities[neighbor]);
      });

      // Calculate weighted degree of the node
      const nodeDegree = getWeightedDegree(node);

      // Try moving to each neighbor community
      let bestCommunity = currentCommunity;
      let bestModularityDelta = 0;

      neighborCommunities.forEach(targetCommunity => {
        if (targetCommunity === currentCommunity) return;

        // Calculate modularity delta if we move node to targetCommunity
        const delta = calculateModularityDelta(
          graph, node, currentCommunity, targetCommunity, communities, m2, resolution, nodeDegree, getWeightedDegree
        );

        if (delta > bestModularityDelta) {
          bestModularityDelta = delta;
          bestCommunity = targetCommunity;
        }
      });

      // Move node if improvement found
      if (bestCommunity !== currentCommunity) {
        communities[node] = bestCommunity;
        improved = true;
      }
    }

    // Report progress
    reportProgress(progressCallback, Math.min(iteration / maxIterations, 0.9));

    if (!improved) break;
  }

  // Normalize community IDs to be sequential integers starting from 0
  const uniqueCommunities = Array.from(new Set(Object.values(communities)));
  const communityMap = {};
  uniqueCommunities.forEach((comm, index) => {
    communityMap[comm] = index;
  });

  const normalizedCommunities = {};
  Object.keys(communities).forEach(node => {
    normalizedCommunities[node] = communityMap[communities[node]];
  });

  // Calculate final modularity
  const modularity = calculateModularity(graph, normalizedCommunities, totalWeight, getWeightedDegree);

  reportProgress(progressCallback, 1.0);

  return {
    communities: normalizedCommunities,
    modularity,
    numCommunities: uniqueCommunities.length,
    iterations: iteration
  };
}

/**
 * Calculate modularity delta for moving a node to a new community
 * @private
 */
function calculateModularityDelta(graph, node, fromCommunity, toCommunity, communities, m2, resolution, nodeDegree, getWeightedDegree) {
  const neighbors = graph.getNeighbors(node);

  // Sum of weights to nodes in the target community
  let ki_in = 0;
  // Sum of weights to nodes in the current community
  let ki_out = 0;

  neighbors.forEach(neighbor => {
    const weight = graph.getEdgeWeight(node, neighbor);
    if (communities[neighbor] === toCommunity) {
      ki_in += weight;
    }
    if (communities[neighbor] === fromCommunity && neighbor !== node) {
      ki_out += weight;
    }
  });

  // Calculate total weighted degree of nodes in target and source communities
  const nodes = Array.from(graph.nodes);
  let sigma_tot_new = 0;
  let sigma_tot_old = 0;

  nodes.forEach(n => {
    if (communities[n] === toCommunity) {
      sigma_tot_new += getWeightedDegree(n);
    }
    if (communities[n] === fromCommunity) {
      sigma_tot_old += getWeightedDegree(n);
    }
  });

  // Modularity gain formula
  const deltaQ =
    (ki_in / m2 - resolution * (sigma_tot_new * nodeDegree) / (m2 * m2)) -
    (ki_out / m2 - resolution * (sigma_tot_old * nodeDegree) / (m2 * m2));

  return deltaQ;
}

/**
 * Calculate modularity for a partition
 * Uses the community-based formula: Q = Σ_c [ (lc/2m) - (dc/2m)² ]
 * Where lc = edges within community c, dc = sum of weighted degrees in community c
 * @private
 */
function calculateModularity(graph, communities, m, getWeightedDegree) {
  if (m === 0) return 0;

  const m2 = 2 * m; // 2m for undirected graphs

  // Get unique communities
  const communitiesSet = new Set(Object.values(communities));

  let Q = 0;

  // For each community
  communitiesSet.forEach(community => {
    // Sum of edge weights within the community (lc)
    let lc = 0;

    // Sum of weighted degrees of nodes in the community (dc)
    let dc = 0;

    // Get all nodes in this community
    const nodesInCommunity = Object.keys(communities).filter(
      node => communities[node] === community
    );

    // Calculate dc (sum of weighted degrees)
    nodesInCommunity.forEach(node => {
      dc += getWeightedDegree(node);
    });

    // Calculate lc (sum of internal edge weights)
    graph.edges.forEach(edge => {
      const u = edge.u;
      const v = edge.v;
      const weight = edge.weight;

      // Count edge if both endpoints are in this community
      if (communities[u] === community && communities[v] === community) {
        lc += weight;
      }
    });

    // Add this community's contribution to modularity
    Q += (lc / m2) - Math.pow(dc / m2, 2);
  });

  return Q;
}
