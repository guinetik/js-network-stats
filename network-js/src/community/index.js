import { Graph } from '../graph.js';
import { CommunityAlgorithm, LouvainAlgorithm } from './algorithms/index.js';

/**
 * Community Detection for network graphs
 *
 * Detects communities (clusters, groups) in networks using various algorithms.
 * Communities are groups of nodes that are more densely connected to each other
 * than to the rest of the network.
 *
 * **Design Pattern**: Strategy pattern - accepts any CommunityAlgorithm implementation
 *
 * @class
 *
 * @example
 * import { CommunityDetection, LouvainAlgorithm } from '@guinetik/network-js';
 *
 * // Using algorithm instance (recommended)
 * const detector = new CommunityDetection(graph);
 * const louvain = new LouvainAlgorithm();
 * const result = detector.detectCommunities(louvain);
 *
 * console.log(result.communities); // { 'A': 0, 'B': 0, 'C': 1 }
 * console.log(result.modularity); // 0.42
 * console.log(result.numCommunities); // 2
 *
 * @example
 * // Using string name (backward compatibility)
 * const result2 = detector.detectCommunities('louvain');
 */
export class CommunityDetection {
  /**
   * Create a new CommunityDetection instance
   *
   * @param {Graph} [graph=null] - Optional Graph instance to analyze
   */
  constructor(graph = null) {
    this.graph = graph;
  }

  /**
   * Set or update the graph to analyze
   *
   * @param {Graph} graph - Graph instance
   * @returns {CommunityDetection} This instance (for chaining)
   */
  setGraph(graph) {
    this.graph = graph;
    return this;
  }

  /**
   * Detect communities using the specified algorithm
   *
   * **Strategy Pattern**: Accepts either:
   * - A CommunityAlgorithm instance (recommended)
   * - A string name for backward compatibility ('louvain', etc.)
   *
   * @param {CommunityAlgorithm|string} [algorithm='louvain'] - Algorithm instance or name
   * @param {Object} [options={}] - Algorithm-specific options (only used with string names)
   * @returns {import('../models/types.js').CommunityResult} Community detection result
   *
   * @example
   * // Recommended: Pass algorithm instance
   * const louvain = new LouvainAlgorithm({ resolution: 1.0 });
   * const result = detector.detectCommunities(louvain);
   *
   * @example
   * // Backward compatibility: Pass string name
   * const result = detector.detectCommunities('louvain', { resolution: 1.0 });
   *
   * @example
   * // Use custom algorithm
   * class MyAlgorithm extends CommunityAlgorithm {
   *   constructor() { super('my-algo', 'My Algorithm'); }
   *   detect(graph) { /* implementation *\/ }
   * }
   * const result = detector.detectCommunities(new MyAlgorithm());
   */
  detectCommunities(algorithm = 'louvain', options = {}) {
    if (!this.graph) {
      throw new Error('No graph set. Use setGraph() or provide graph in constructor.');
    }

    let algorithmInstance;

    // Strategy Pattern: Accept algorithm instance or string name
    if (algorithm instanceof CommunityAlgorithm) {
      // Use provided algorithm instance
      algorithmInstance = algorithm;
    } else if (typeof algorithm === 'string') {
      // Backward compatibility: Create algorithm from string name
      algorithmInstance = this._createAlgorithmFromName(algorithm, options);
    } else {
      throw new Error(
        'Algorithm must be a CommunityAlgorithm instance or a string name'
      );
    }

    // Execute the algorithm's detect method
    return algorithmInstance.detect(this.graph);
  }

  /**
   * Create algorithm instance from string name (for backward compatibility)
   *
   * @private
   * @param {string} name - Algorithm name
   * @param {Object} options - Algorithm options
   * @returns {CommunityAlgorithm} Algorithm instance
   */
  _createAlgorithmFromName(name, options = {}) {
    switch (name.toLowerCase()) {
      case 'louvain':
        return new LouvainAlgorithm(options);
      default:
        throw new Error(`Unknown community detection algorithm: ${name}`);
    }
  }

  /**
   * Calculate modularity of a given community partition
   *
   * Modularity measures the strength of division of a network into communities.
   * Values range from -1 to 1, with higher values indicating stronger community structure.
   *
   * @param {import('../models/types.js').CommunityAssignment} communities - Node to community mapping
   * @returns {number} Modularity score
   */
  calculateModularity(communities) {
    if (!this.graph) {
      throw new Error('No graph set');
    }

    const m = this.graph.numberOfEdges();
    if (m === 0) return 0;

    let Q = 0;
    const nodes = Array.from(this.graph.nodes.keys());

    for (const i of nodes) {
      for (const j of nodes) {
        if (communities[i] === communities[j]) {
          const Aij = this.graph.hasEdge(i, j) ? this.graph.getEdgeWeight(i, j) : 0;
          const ki = this.graph.degree(i);
          const kj = this.graph.degree(j);

          Q += Aij - (ki * kj) / (2 * m);
        }
      }
    }

    return Q / (2 * m);
  }

  /**
   * Get nodes in a specific community
   *
   * @param {import('../models/types.js').CommunityAssignment} communities - Node to community mapping
   * @param {number} communityId - Community ID
   * @returns {Array<string>} Array of node IDs in the community
   *
   * @example
   * const nodesInCommunity0 = detector.getNodesInCommunity(result.communities, 0);
   */
  static getNodesInCommunity(communities, communityId) {
    return Object.keys(communities).filter(nodeId => communities[nodeId] === communityId);
  }

  /**
   * Get all communities as groups of nodes
   *
   * @param {import('../models/types.js').CommunityAssignment} communities - Node to community mapping
   * @returns {Object.<number, Array<string>>} Map of community ID to array of node IDs
   *
   * @example
   * const groups = CommunityDetection.getCommunityGroups(result.communities);
   * // { 0: ['A', 'B'], 1: ['C', 'D'] }
   */
  static getCommunityGroups(communities) {
    const groups = {};

    for (const [nodeId, communityId] of Object.entries(communities)) {
      if (!groups[communityId]) {
        groups[communityId] = [];
      }
      groups[communityId].push(nodeId);
    }

    return groups;
  }

  /**
   * Create a Graph instance from GraphData format
   *
   * Helper method to convert GraphData to Graph for community detection
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @returns {Graph} Graph instance
   *
   * @example
   * const graph = CommunityDetection.graphFromData(graphData);
   * const detector = new CommunityDetection(graph);
   */
  static graphFromData(graphData) {
    const graph = new Graph();

    // Add all nodes
    for (const node of graphData.nodes) {
      graph.addNode(node.id);
    }

    // Add all edges
    for (const edge of graphData.edges) {
      graph.addEdge(edge.source, edge.target, edge.weight || 1);
    }

    return graph;
  }

  /**
   * Detect communities directly from GraphData
   *
   * Convenience method that handles Graph creation internally
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {CommunityAlgorithm|string} [algorithm='louvain'] - Algorithm instance or name
   * @param {Object} [options={}] - Algorithm options (only used with string names)
   * @returns {import('../models/types.js').CommunityResult} Community detection result
   *
   * @example
   * // Using algorithm instance
   * const louvain = new LouvainAlgorithm();
   * const result = CommunityDetection.detect(graphData, louvain);
   *
   * @example
   * // Using string name (backward compatibility)
   * const result = CommunityDetection.detect(graphData, 'louvain');
   */
  static detect(graphData, algorithm = 'louvain', options = {}) {
    const graph = this.graphFromData(graphData);
    const detector = new CommunityDetection(graph);
    return detector.detectCommunities(algorithm, options);
  }
}

// Export algorithm classes alongside CommunityDetection
export { CommunityAlgorithm, LouvainAlgorithm } from './algorithms/index.js';

export default CommunityDetection;
