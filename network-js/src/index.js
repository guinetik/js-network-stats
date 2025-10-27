/**
 * NetworkStats - Worker-First Network Analysis Library
 *
 * **NEW ARCHITECTURE:**
 * - All computation happens in workers
 * - All methods are async
 * - Simple, clean API
 *
 * @module index
 */

import { createLogger } from "@guinetik/logger";
import { Graph } from "./graph.js";
import { WorkerManager } from "./compute/index.js";
import {
  NetworkStatistics,
  DegreeStatistic,
  BetweennessStatistic,
  ClusteringStatistic,
  EigenvectorStatistic,
  EigenvectorLaplacianStatistic,
  CliquesStatistic,
  ClosenessStatistic,
  EgoDensityStatistic
} from "./statistics/index.js";
import {
  DensityStatistic,
  DiameterStatistic,
  AverageClusteringStatistic,
  AverageShortestPathStatistic,
  ConnectedComponentsStatistic,
  AverageDegreeStatistic
} from "./statistics/algorithms/graph-stats.js";
import { CommunityDetection, LouvainAlgorithm } from "./community/index.js";

/**
 * Main class for analyzing network graphs.
 *
 * **Worker-First Design:**
 * - All analysis is async (uses web workers)
 * - Optimal performance regardless of graph size
 * - Clean, simple API
 *
 * @class
 * @example
 * import NetworkStats from '@guinetik/network-js';
 *
 * const analyzer = new NetworkStats({ verbose: true });
 * const network = [
 *   { source: 'A', target: 'B', weight: 1 },
 *   { source: 'B', target: 'C', weight: 2 },
 *   { source: 'C', target: 'A', weight: 1 }
 * ];
 *
 * const results = await analyzer.analyze(network, ['degree', 'eigenvector']);
 * console.log(results);
 * // [
 * //   { id: 'A', degree: 2, eigenvector: 0.577 },
 * //   { id: 'B', degree: 2, eigenvector: 0.577 },
 * //   { id: 'C', degree: 2, eigenvector: 0.577 }
 * // ]
 */
export class NetworkStats {
  /**
   * Available network analysis features.
   *
   * @static
   * @type {Object}
   */
  static FEATURES = {
    EIGENVECTOR: "eigenvector",
    EIGENVECTOR_LAPLACIAN: "eigenvector-laplacian",
    MODULARITY: "modularity",
    BETWEENNESS: "betweenness",
    CLUSTERING: "clustering",
    CLIQUES: "cliques",
    DEGREE: "degree",
    CLOSENESS: "closeness",
    EGO_DENSITY: "ego-density",
    ALL: [
      "degree",
      "betweenness",
      "clustering",
      "eigenvector",
      "eigenvector-laplacian",
      "cliques",
      "closeness",
      "ego-density"
    ],
  };

  /**
   * Available graph-level statistics
   *
   * @static
   * @type {Object}
   */
  static GRAPH_STATS = {
    DENSITY: "density",
    DIAMETER: "diameter",
    AVERAGE_CLUSTERING: "average_clustering",
    AVERAGE_SHORTEST_PATH: "average_shortest_path",
    CONNECTED_COMPONENTS: "connected_components",
    AVERAGE_DEGREE: "average_degree",
    ALL: [
      "density",
      "diameter",
      "average_clustering",
      "average_shortest_path",
      "connected_components",
      "average_degree"
    ]
  };

  /**
   * Available community detection algorithms.
   *
   * @static
   * @type {Object}
   */
  static COMMUNITY_DETECTION = {
    LOUVAIN: "louvain",
    ALL: ["louvain"],
  };

  /**
   * Create a new NetworkStats analyzer instance.
   *
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.verbose=true] - Enable detailed logging
   * @param {number} [options.maxWorkers] - Maximum number of workers (default: auto-detect)
   * @param {number} [options.taskTimeout=60000] - Task timeout in milliseconds
   * @param {string} [options.workerScript] - Path to worker script (for bundlers like Vite)
   * @example
   * const analyzer = new NetworkStats({
   *   verbose: false,
   *   maxWorkers: 4
   * });
   */
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose !== undefined ? options.verbose : true,
      maxWorkers: options.maxWorkers,
      taskTimeout: options.taskTimeout || 60000,
      workerScript: options.workerScript
    };

    // Initialize logger
    this.log = createLogger({
      prefix: 'NetworkStats',
      level: this.options.verbose ? 'debug' : 'info'
    });

    // Initialize WorkerManager (singleton - happens once)
    WorkerManager.initialize({
      maxWorkers: this.options.maxWorkers,
      taskTimeout: this.options.taskTimeout,
      verbose: this.options.verbose,
      workerScript: this.options.workerScript
    }).catch(err => {
      this.log.error('Failed to initialize workers:', err);
    });

    // Map feature names to statistic classes
    this.statisticClasses = {
      [NetworkStats.FEATURES.DEGREE]: DegreeStatistic,
      [NetworkStats.FEATURES.BETWEENNESS]: BetweennessStatistic,
      [NetworkStats.FEATURES.CLUSTERING]: ClusteringStatistic,
      [NetworkStats.FEATURES.EIGENVECTOR]: EigenvectorStatistic,
      [NetworkStats.FEATURES.EIGENVECTOR_LAPLACIAN]: EigenvectorLaplacianStatistic,
      [NetworkStats.FEATURES.CLIQUES]: CliquesStatistic,
      [NetworkStats.FEATURES.CLOSENESS]: ClosenessStatistic,
      [NetworkStats.FEATURES.EGO_DENSITY]: EgoDensityStatistic,
      [NetworkStats.FEATURES.MODULARITY]: 'modularity' // Special case
    };

    // Map graph stat names to classes
    this.graphStatClasses = {
      [NetworkStats.GRAPH_STATS.DENSITY]: DensityStatistic,
      [NetworkStats.GRAPH_STATS.DIAMETER]: DiameterStatistic,
      [NetworkStats.GRAPH_STATS.AVERAGE_CLUSTERING]: AverageClusteringStatistic,
      [NetworkStats.GRAPH_STATS.AVERAGE_SHORTEST_PATH]: AverageShortestPathStatistic,
      [NetworkStats.GRAPH_STATS.CONNECTED_COMPONENTS]: ConnectedComponentsStatistic,
      [NetworkStats.GRAPH_STATS.AVERAGE_DEGREE]: AverageDegreeStatistic
    };
  }

  /**
   * Analyze a network and compute the requested statistical features.
   *
   * **ASYNC**: All analysis happens in web workers
   *
   * @param {Array<Object>} network - Array of edge objects representing the network
   * @param {string|number} network[].source - Source node identifier
   * @param {string|number} network[].target - Target node identifier
   * @param {number} [network[].weight=1] - Edge weight (optional, defaults to 1)
   * @param {string[]|string} [features] - Features to compute (defaults to ALL features)
   * @param {Object} [options={}] - Analysis options
   * @param {Function} [options.onProgress] - Progress callback (0-1)
   * @param {boolean} [options.includeGraphStats=false] - Include graph-level statistics
   * @param {string[]} [options.graphStats] - Specific graph stats to calculate
   * @returns {Promise<Object|Array>} Node stats array or { nodes: [...], graph: {...} }
   * @example
   * // Basic usage
   * const results = await analyzer.analyze(network, ['degree', 'betweenness']);
   *
   * @example
   * // With progress tracking
   * const results = await analyzer.analyze(network, ['betweenness'], {
   *   onProgress: (progress) => console.log(`${Math.round(progress * 100)}%`)
   * });
   *
   * @example
   * // Include graph-level stats
   * const results = await analyzer.analyze(network, ['degree'], {
   *   includeGraphStats: true,
   *   graphStats: ['density', 'diameter']
   * });
   * // Returns: { nodes: [{id, degree}], graph: {density, diameter} }
   */
  async analyze(network, features, options = {}) {
    this.log.time("networkAnalysis");
    this.log.info(`Analyzing network with ${network.length} edges`);

    // Use default features if none provided
    features = features || NetworkStats.FEATURES.ALL;
    if (typeof features === 'string') {
      features = [features];
    }

    // Build graph
    const { graph, nodes } = this.#prepareNetwork(network);
    this.log.info(`Graph: ${nodes.length} nodes, ${graph.edges.length} edges`);

    // Calculate node-level statistics
    const nodeStats = await this.#calculateNodeStats(graph, nodes, features, options);

    // Calculate graph-level statistics if requested
    if (options.includeGraphStats) {
      const graphStats = await this.#calculateGraphStats(graph, options.graphStats, options);
      this.log.timeEnd("networkAnalysis");
      return { nodes: nodeStats, graph: graphStats };
    }

    this.log.timeEnd("networkAnalysis");
    return nodeStats;
  }

  /**
   * Calculate node-level statistics
   * @private
   */
  async #calculateNodeStats(graph, nodes, features, options) {
    const stats = {};

    // Calculate each feature
    for (const feature of features) {
      if (feature === NetworkStats.FEATURES.MODULARITY) {
        // Special case: community detection
        stats[feature] = await this.#calculateModularity(graph, options);
      } else if (this.statisticClasses[feature]) {
        // Use statistic class (delegates to worker)
        const StatClass = this.statisticClasses[feature];
        const statInstance = new StatClass();

        this.log.debug(`Calculating ${feature}...`);
        const result = await statInstance.calculate(graph, null, {
          onProgress: options.onProgress
        });

        stats[feature] = result;
      } else {
        this.log.warn(`Unknown feature: ${feature}`);
      }
    }

    // Normalize into array of node objects
    return this.#normalizeNodeStats(stats, nodes);
  }

  /**
   * Calculate graph-level statistics
   * @private
   */
  async #calculateGraphStats(graph, requestedStats, options = {}) {
    const statsToCalculate = requestedStats || NetworkStats.GRAPH_STATS.ALL;
    const results = {};

    for (const statName of statsToCalculate) {
      const StatClass = this.graphStatClasses[statName];
      if (StatClass) {
        this.log.debug(`Calculating graph stat: ${statName}...`);
        const statInstance = new StatClass();
        results[statName] = await statInstance.calculate(graph, null, {
          onProgress: options.onProgress
        });
      } else {
        this.log.warn(`Unknown graph stat: ${statName}`);
      }
    }

    return results;
  }

  /**
   * Calculate modularity (community detection)
   * @private
   */
  async #calculateModularity(graph, options = {}) {
    const detector = new CommunityDetection(graph);
    const algorithm = new LouvainAlgorithm();

    this.log.debug('Running Louvain community detection...');
    const result = await detector.detectCommunities(algorithm, {
      onProgress: options.onProgress
    });

    // Return communities as node -> community mapping
    return result.communities;
  }

  /**
   * Build graph from network edge list
   * @private
   */
  #prepareNetwork(network) {
    // Get unique nodes
    const nodesSet = new Set();
    for (const edge of network) {
      nodesSet.add(edge.source);
      nodesSet.add(edge.target);
    }
    const nodes = Array.from(nodesSet);

    // Build graph
    const graph = new Graph();
    for (const node of nodes) {
      graph.addNode(node);
    }
    for (const edge of network) {
      const weight = edge.weight !== undefined ? edge.weight : 1;
      graph.addEdge(edge.source, edge.target, weight);
    }

    return { graph, nodes };
  }

  /**
   * Normalize statistics into array of node objects
   * @private
   */
  #normalizeNodeStats(stats, nodes) {
    const results = [];

    for (const nodeId of nodes) {
      const nodeStats = { id: nodeId };

      // Add each statistic to this node
      for (const [feature, values] of Object.entries(stats)) {
        if (typeof values === 'object' && values !== null) {
          nodeStats[feature] = values[nodeId];
        }
      }

      results.push(nodeStats);
    }

    return results;
  }

  /**
   * Cleanup resources (terminates worker pool)
   *
   * @returns {Promise<void>}
   * @example
   * await analyzer.dispose();
   */
  async dispose() {
    await WorkerManager.terminate();
  }
}

// Export everything
export default NetworkStats;
export { Graph };
export { WorkerManager };
export * from "./statistics/index.js";
export * from "./community/index.js";
export * from "./layouts/index.js";
export * from "./adapters/index.js";
