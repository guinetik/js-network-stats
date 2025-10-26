import { createLogger } from "@guinetik/logger";
import Graph from "./graph.js";
import { Louvain } from "./louvain.js";
import { Network } from "./network.js";

/**
 * Main class for analyzing network graphs and calculating statistical metrics.
 * Provides a high-level API for computing various centrality measures and network properties.
 *
 * **Supported Features**:
 * - Degree centrality
 * - Eigenvector centrality
 * - Betweenness centrality
 * - Clustering coefficient
 * - Clique detection
 * - Community detection (modularity via Louvain)
 *
 * **Environment**: Works in both Node.js and browser environments
 *
 * @class
 * @example
 * import NetworkStats from '@guinetik.network-js';
 *
 * const analyzer = new NetworkStats({ verbose: true });
 * const network = [
 *   { source: 'A', target: 'B', weight: 1 },
 *   { source: 'B', target: 'C', weight: 2 },
 *   { source: 'C', target: 'A', weight: 1 }
 * ];
 *
 * const results = analyzer.analyze(network, ['degree', 'eigenvector']);
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
   * @property {string} EIGENVECTOR - Eigenvector centrality (importance based on neighbors)
   * @property {string} MODULARITY - Community detection using Louvain algorithm
   * @property {string} BETWEENNESS - Betweenness centrality (bridge importance)
   * @property {string} CLUSTERING - Local clustering coefficient (group cohesion)
   * @property {string} TRANSITIVITY - Network transitivity (deprecated, use CLUSTERING)
   * @property {string} CLIQUES - Number of maximal cliques per node
   * @property {string} DEGREE - Degree centrality (connection count)
   * @property {string[]} ALL - All available features
   */
  static FEATURES = {
    EIGENVECTOR: "eigenvector",
    MODULARITY: "modularity",
    BETWEENNESS: "betweenness",
    CLUSTERING: "clustering",
    TRANSITIVITY: "transitivity",
    CLIQUES: "cliques",
    DEGREE: "degree",
    ALL: [
      "degree",
      "modularity",
      "cliques",
      "eigenvector",
      "betweenness",
      "clustering",
    ],
  };

  /**
   * Create a new NetworkStats analyzer instance.
   *
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.maxIter=100000] - Maximum iterations for iterative algorithms
   * @param {boolean} [options.verbose=true] - Enable detailed logging
   * @param {Object} [options.louvainModule] - Custom Louvain module (for testing)
   * @example
   * const analyzer = new NetworkStats({
   *   verbose: false,
   *   maxIter: 50000
   * });
   */
  constructor(options = {}) {
    this.options = {
      maxIter: options.maxIter || 100000,
      verbose: options.verbose !== undefined ? options.verbose : true,
      louvainModule: options.louvainModule || { Louvain }
    };

    // Initialize logger with appropriate level
    this.log = createLogger({
      prefix: 'NetworkStats',
      level: this.options.verbose ? 'debug' : 'info'
    });

    // Define feature processors as a map of functions
    this.featureProcessors = {
      [NetworkStats.FEATURES.EIGENVECTOR]: this.#processEigenvector.bind(this),
      [NetworkStats.FEATURES.BETWEENNESS]: this.#processBetweenness.bind(this),
      [NetworkStats.FEATURES.CLUSTERING]: this.#processClustering.bind(this),
      [NetworkStats.FEATURES.CLIQUES]: this.#processCliques.bind(this),
      [NetworkStats.FEATURES.DEGREE]: this.#processDegree.bind(this),
      [NetworkStats.FEATURES.MODULARITY]: this.#processModularity.bind(this)
    };
  }

  /**
   * Analyze a network and compute the requested statistical features.
   * This is the main entry point for network analysis.
   *
   * **Performance**: Times the analysis and logs progress (if verbose mode enabled).
   *
   * @param {Array<Object>} network - Array of edge objects representing the network
   * @param {string|number} network[].source - Source node identifier
   * @param {string|number} network[].target - Target node identifier
   * @param {number} [network[].weight=1] - Edge weight (optional, defaults to 1)
   * @param {string[]|string} [features] - Features to compute (defaults to ALL features)
   * @returns {Array<Object>} Array of node statistics, one object per node
   * @example
   * // Analyze a simple triangle network
   * const network = [
   *   { source: 'A', target: 'B' },
   *   { source: 'B', target: 'C' },
   *   { source: 'C', target: 'A' }
   * ];
   *
   * // Compute specific features
   * const results = analyzer.analyze(network, ['degree', 'clustering']);
   *
   * // Results format:
   * // [
   * //   { id: 'A', degree: 2, clustering: 1.0 },
   * //   { id: 'B', degree: 2, clustering: 1.0 },
   * //   { id: 'C', degree: 2, clustering: 1.0 }
   * // ]
   * @example
   * // Compute all features (default)
   * const allResults = analyzer.analyze(network);
   */
  analyze(network, features) {
    this.log.time("networkAnalysis");

    this.log.info(`Processing ${network.length} records`);

    // Use default features if none provided
    features = features || NetworkStats.FEATURES.ALL;

    // Extract network data
    const { graph, nodes } = this.#prepareNetwork(network);

    // Process each requested feature
    const stats = this.#processFeatures(graph, features, nodes);

    // Normalize and return results
    const result = this.#normalizeFeatures(stats, nodes);

    this.log.timeEnd("networkAnalysis");
    return result;
  }

  #prepareNetwork(network) {
    // Get unique nodes from network
    const nodesFromSource = this.#getDistinctNodes(network, "source");
    const nodesFromTarget = this.#getDistinctNodes(network, "target");
    const nodes = [...new Set([...nodesFromSource, ...nodesFromTarget])];
    
    // Create and populate the graph
    const graph = new Graph();
    graph.addNodesFrom(nodes);
    
    // Add edges to graph
    network.forEach(({ source, target, weight = 1 }) => {
      graph.addEdge(source, target, weight);
    });
    
    return { graph, nodes };
  }

  #processFeatures(graph, features, nodes) {
    const stats = {};

    // Process each requested feature
    for (const feature of features) {
      if (this.featureProcessors[feature]) {
        try {
          this.log.debug(`Processing ${feature.toUpperCase()}`);

          stats[feature] = this.featureProcessors[feature](graph, nodes);
        } catch (err) {
          this.log.error(`Error processing ${feature}:`, err);
        }
      }
    }

    return stats;
  }

  #processEigenvector(graph) {
    return Network.eigenvectorCentrality(graph, {
      maxIter: this.options.maxIter,
    })._stringValues;
  }

  #processBetweenness(graph) {
    return Network.betweennessCentrality(graph)._stringValues;
  }

  #processClustering(graph) {
    return Network.clustering(graph)._stringValues;
  }

  #processCliques(graph) {
    return Network.numberOfCliques(graph)._stringValues;
  }

  #processDegree(graph) {
    return Network.degree(graph)._stringValues;
  }

  #processModularity(graph, nodes) {
    return Network.modularity(graph, {
      louvainModule: this.options.louvainModule
    });
  }

  #normalizeFeatures(stats, nodes) {
    return nodes.map(node => {
      const nodeStats = { id: node };
      
      for (const [feature, values] of Object.entries(stats)) {
        nodeStats[feature] = values[node];
      }
      
      return nodeStats;
    });
  }

  #getDistinctNodes(network, prop) {
    return [...new Set(network.map(item => item[prop]))];
  }
}

/**
 * Functional wrapper for backward compatibility with legacy API.
 * Creates a NetworkStats instance and analyzes the network in one call.
 *
 * **Note**: For new code, prefer using the class-based API:
 * ```javascript
 * const analyzer = new NetworkStats(options);
 * const results = analyzer.analyze(network, features);
 * ```
 *
 * @param {Array<Object>} network - Array of edge objects
 * @param {string[]|null} [features=null] - Features to compute (null = all features)
 * @param {Object} [options={}] - Configuration options
 * @returns {Array<Object>} Array of node statistics
 * @example
 * // Legacy functional API
 * import getNetworkStats from '@guinetik/network-js';
 *
 * const stats = getNetworkStats(
 *   [{ source: 'A', target: 'B' }],
 *   ['degree', 'clustering'],
 *   { verbose: false }
 * );
 */
function getNetworkStats(network, features = null, options = {}) {
  const analyzer = new NetworkStats(options);
  return analyzer.analyze(network, features);
}

// Export core classes
export { default as Graph } from './graph.js';
export { Network } from './network.js';
export { Louvain } from './louvain.js';

// Export layout classes
export { Layout, ForceDirectedLayout, CircularLayout } from './layouts/index.js';

// Export adapters
export {
  Adapter,
  CSVAdapter,
  JSONAdapter,
  NetworkXAdapter
} from './adapters/index.js';

// Export community detection
export {
  CommunityDetection,
  CommunityAlgorithm,
  LouvainAlgorithm
} from './community/index.js';

// Export functional wrapper (NetworkStats already exported above as class)
export { getNetworkStats };
export default getNetworkStats;