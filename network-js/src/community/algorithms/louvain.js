import { CommunityAlgorithm } from './base.js';
import { Louvain } from '../../louvain.js';

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
 * const result = algorithm.detect(graph);
 * console.log(result.communities); // { 'A': 0, 'B': 0, 'C': 1, 'D': 1 }
 */
export class LouvainAlgorithm extends CommunityAlgorithm {
  /**
   * Create a Louvain algorithm instance
   *
   * @param {Object} [options={}] - Algorithm options
   * @param {number} [options.resolution=1.0] - Resolution parameter for modularity
   * @param {number} [options.randomize=false] - Whether to randomize node order
   */
  constructor(options = {}) {
    super(
      'louvain',
      'Louvain method for community detection using modularity optimization'
    );

    this.options = {
      resolution: options.resolution || 1.0,
      randomize: options.randomize || false
    };
  }

  /**
   * Detect communities using the Louvain algorithm
   *
   * @param {Graph} graph - The graph to analyze
   * @returns {import('../../models/types.js').CommunityResult} Community detection results
   * @throws {Error} If graph is null or invalid
   */
  detect(graph) {
    if (!graph) {
      throw new Error('Graph is required for Louvain algorithm');
    }

    // Initialize Louvain instance
    const louvain = new Louvain();

    // Get nodes and edges from graph
    const nodes = Array.from(graph.nodes.keys());
    const edges = [];

    for (const nodeId of nodes) {
      const neighbors = graph.getNeighbors(nodeId);
      for (const neighborId of neighbors) {
        const weight = graph.getEdgeWeight(nodeId, neighborId);
        edges.push({
          source: nodeId,
          target: neighborId,
          weight
        });
      }
    }

    // Run Louvain algorithm
    const communities = louvain
      .setNodes(nodes)
      .setEdges(edges)
      .execute();

    // Calculate modularity
    const modularity = this._calculateModularity(graph, communities);

    // Count unique communities
    const numCommunities = new Set(Object.values(communities)).size;

    return {
      communities,
      modularity,
      numCommunities,
      algorithm: this.name,
      options: this.options
    };
  }

  /**
   * Calculate modularity score for a given community assignment
   *
   * @private
   * @param {Graph} graph - The graph
   * @param {Object.<string, number>} communities - Community assignments
   * @returns {number} Modularity score
   */
  _calculateModularity(graph, communities) {
    const nodes = Array.from(graph.nodes.keys());
    let m = 0; // Total edge weight

    // Calculate total edge weight
    for (const node of nodes) {
      const neighbors = graph.getNeighbors(node);
      for (const neighbor of neighbors) {
        m += graph.getEdgeWeight(node, neighbor);
      }
    }
    m /= 2; // Each edge counted twice

    if (m === 0) return 0;

    let Q = 0;

    // Calculate modularity
    for (const i of nodes) {
      for (const j of nodes) {
        if (communities[i] === communities[j]) {
          // Get actual edge weight (0 if no edge)
          const Aij = graph.hasEdge(i, j) ? graph.getEdgeWeight(i, j) : 0;

          // Calculate expected edge weight
          const ki = graph.getNeighbors(i).reduce(
            (sum, neighbor) => sum + graph.getEdgeWeight(i, neighbor),
            0
          );
          const kj = graph.getNeighbors(j).reduce(
            (sum, neighbor) => sum + graph.getEdgeWeight(j, neighbor),
            0
          );

          Q += Aij - (ki * kj) / (2 * m);
        }
      }
    }

    return Q / (2 * m);
  }
}

export default LouvainAlgorithm;
