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
 * **NEW**: Worker-first architecture - all detection is async and runs in web workers
 *
 * @class
 *
 * @example
 * import { CommunityDetection, LouvainAlgorithm } from '@guinetik/network-js';
 *
 * // Using algorithm instance (recommended) - NOW ASYNC!
 * const detector = new CommunityDetection(graph);
 * const louvain = new LouvainAlgorithm();
 * const result = await detector.detectCommunities(louvain);
 *
 * console.log(result.communities); // { 'A': 0, 'B': 0, 'C': 1 }
 * console.log(result.modularity); // 0.42
 * console.log(result.numCommunities); // 2
 *
 * @example
 * // Using string name (backward compatibility) - NOW ASYNC!
 * const result2 = await detector.detectCommunities('louvain');
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
   * **NEW**: Now async - all computation happens in web workers
   *
   * @param {CommunityAlgorithm|string} [algorithm='louvain'] - Algorithm instance or name
   * @param {Object} [options={}] - Algorithm-specific options (only used with string names)
   * @param {Function} [options.onProgress] - Progress callback (0-1)
   * @returns {Promise<import('../models/types.js').CommunityResult>} Community detection result
   *
   * @example
   * // Recommended: Pass algorithm instance (NOW ASYNC!)
   * const louvain = new LouvainAlgorithm({ resolution: 1.0 });
   * const result = await detector.detectCommunities(louvain);
   *
   * @example
   * // Backward compatibility: Pass string name (NOW ASYNC!)
   * const result = await detector.detectCommunities('louvain', { resolution: 1.0 });
   *
   * @example
   * // Use custom algorithm (NOW ASYNC!)
   * class MyAlgorithm extends CommunityAlgorithm {
   *   constructor() { super('my-algo', 'My Algorithm'); }
   *   async detect(graph) { /* implementation *\/ }
   * }
   * const result = await detector.detectCommunities(new MyAlgorithm());
   */
  async detectCommunities(algorithm = 'louvain', options = {}) {
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

    // Execute the algorithm's detect method (now async)
    return await algorithmInstance.detect(this.graph, {
      onProgress: options.onProgress
    });
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
   * **NEW**: Now async - all computation happens in web workers
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {CommunityAlgorithm|string} [algorithm='louvain'] - Algorithm instance or name
   * @param {Object} [options={}] - Algorithm options (only used with string names)
   * @param {Function} [options.onProgress] - Progress callback (0-1)
   * @returns {Promise<import('../models/types.js').CommunityResult>} Community detection result
   *
   * @example
   * // Using algorithm instance (NOW ASYNC!)
   * const louvain = new LouvainAlgorithm();
   * const result = await CommunityDetection.detect(graphData, louvain);
   *
   * @example
   * // Using string name (backward compatibility) - NOW ASYNC!
   * const result = await CommunityDetection.detect(graphData, 'louvain');
   */
  static async detect(graphData, algorithm = 'louvain', options = {}) {
    const graph = this.graphFromData(graphData);
    const detector = new CommunityDetection(graph);
    return await detector.detectCommunities(algorithm, options);
  }
}

// Export algorithm classes alongside CommunityDetection
export { CommunityAlgorithm, LouvainAlgorithm } from './algorithms/index.js';

/**
 * Registry of available community detection algorithms with metadata.
 * This is the single source of truth for all available community detection algorithms.
 * Use this in UIs to populate algorithm selectors instead of hardcoding options.
 *
 * @example
 * import { COMMUNITY_REGISTRY } from './community/index.js';
 *
 * // Get all algorithms
 * const allAlgorithms = COMMUNITY_REGISTRY.getAll();
 *
 * // Get specific algorithm metadata
 * const louvain = COMMUNITY_REGISTRY.get('louvain');
 */
export const COMMUNITY_REGISTRY = {
  /**
   * Metadata for each community detection algorithm
   * @private
   */
  algorithms: [
    {
      id: 'louvain',
      name: 'Louvain Method',
      description: 'Fast greedy algorithm that optimizes modularity',
      category: 'modularity',
      complexity: 'O(n log n)',
      bestFor: ['General graphs', 'Large networks', 'Hierarchical communities'],
      supportsWeighted: true,
      supportsDirected: false,
      defaultOptions: {
        resolution: 1.0,
        maxIterations: 100
      }
    }
  ],

  /**
   * Get all available community detection algorithms
   * @returns {Array} Array of algorithm metadata objects
   */
  getAll() {
    return [...this.algorithms];
  },

  /**
   * Get metadata for a specific algorithm
   * @param {string} id - Algorithm ID
   * @returns {Object|null} Algorithm metadata or null if not found
   */
  get(id) {
    return this.algorithms.find(algo => algo.id === id) || null;
  },

  /**
   * Filter algorithms by predicate function
   * @param {Function} predicate - Filter function
   * @returns {Array} Filtered array of algorithm metadata
   */
  filter(predicate) {
    return this.algorithms.filter(predicate);
  },

  /**
   * Get algorithm IDs only
   * @returns {Array<string>} Array of algorithm IDs
   */
  getIds() {
    return this.algorithms.map(algo => algo.id);
  }
};

export default CommunityDetection;
