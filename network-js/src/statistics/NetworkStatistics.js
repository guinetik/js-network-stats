import { Graph } from '../graph.js';
import {
  StatisticAlgorithm,
  // Node-level
  DegreeStatistic,
  ClosenessStatistic,
  EgoDensityStatistic,
  BetweennessStatistic,
  ClusteringStatistic,
  EigenvectorStatistic,
  CliquesStatistic,
  // Graph-level
  DensityStatistic,
  DiameterStatistic,
  AverageClusteringStatistic,
  AverageShortestPathStatistic,
  ConnectedComponentsStatistic,
  AverageDegreeStatistic
} from './algorithms/index.js';

/**
 * Network Statistics calculator for graphs
 *
 * Calculates various statistics for network graphs using a strategy pattern.
 * Supports both node-level statistics (per-node metrics) and graph-level
 * statistics (whole-graph metrics).
 *
 * **Design Pattern**: Strategy pattern - accepts any StatisticAlgorithm implementation
 * **NEW**: Worker-first architecture - all calculations are async and run in web workers
 *
 * @class
 *
 * @example
 * import { NetworkStatistics, DegreeStatistic, DensityStatistic } from '@guinetik/network-js';
 *
 * const stats = new NetworkStatistics(graph);
 *
 * // Calculate node-level statistic (NOW ASYNC!)
 * const degrees = await stats.calculate(new DegreeStatistic());
 * console.log(degrees); // { 'A': 3, 'B': 2, 'C': 1 }
 *
 * // Calculate graph-level statistic (NOW ASYNC!)
 * const density = await stats.calculate(new DensityStatistic());
 * console.log(density); // 0.42
 *
 * @example
 * // Calculate multiple statistics at once (NOW ASYNC!)
 * const results = await stats.calculateMultiple([
 *   new DegreeStatistic(),
 *   new ClosenessStat(),
 *   new DensityStatistic()
 * ]);
 * console.log(results);
 * // {
 * //   node: { degree: {...}, closeness: {...} },
 * //   graph: { density: 0.42 }
 * // }
 */
export class NetworkStatistics {
  /**
   * Create a new NetworkStatistics instance
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
   * @returns {NetworkStatistics} This instance (for chaining)
   */
  setGraph(graph) {
    this.graph = graph;
    return this;
  }

  /**
   * Calculate a statistic using the specified algorithm
   *
   * **Strategy Pattern**: Accepts a StatisticAlgorithm instance
   * **NEW**: Now async - all computation happens in web workers
   *
   * @param {StatisticAlgorithm|string} algorithm - Algorithm instance or name
   * @param {Object} [options={}] - Algorithm-specific options (only used with string names)
   * @param {Array<string>} [options.nodeIds=null] - Optional subset of nodes (for node-level stats)
   * @param {Function} [options.onProgress] - Progress callback (0-1)
   * @returns {Promise<Object|number>} For node-level: { nodeId: value }, For graph-level: single number
   *
   * @example
   * // Using algorithm instance (recommended)
   * const degree = await stats.calculate(new DegreeStatistic());
   *
   * @example
   * // Using string name (backward compatibility)
   * const degree = await stats.calculate('degree');
   *
   * @example
   * // Calculate for specific nodes only
   * const degree = await stats.calculate(new DegreeStatistic(), { nodeIds: ['A', 'B'] });
   */
  async calculate(algorithm, options = {}) {
    if (!this.graph) {
      throw new Error('No graph set. Use setGraph() or provide graph in constructor.');
    }

    let algorithmInstance;

    // Strategy Pattern: Accept algorithm instance or string name
    if (algorithm instanceof StatisticAlgorithm) {
      algorithmInstance = algorithm;
    } else if (typeof algorithm === 'string') {
      // Backward compatibility: Create algorithm from string name
      algorithmInstance = this._createAlgorithmFromName(algorithm, options);
    } else {
      throw new Error(
        'Algorithm must be a StatisticAlgorithm instance or a string name'
      );
    }

    // Execute the algorithm's calculate method (now async)
    return await algorithmInstance.calculate(this.graph, options.nodeIds, {
      onProgress: options.onProgress
    });
  }

  /**
   * Calculate multiple statistics at once
   *
   * Returns an object with 'node' and 'graph' properties containing the respective statistics
   * **NEW**: Now async - all computation happens in web workers
   *
   * @param {Array<StatisticAlgorithm|string>} algorithms - Array of algorithm instances or names
   * @param {Object} [options={}] - Options
   * @param {Array<string>} [options.nodeIds=null] - Optional subset of nodes
   * @param {Function} [options.onProgress] - Progress callback (0-1)
   * @returns {Promise<Object>} { node: { statName: {...} }, graph: { statName: value } }
   *
   * @example
   * const results = await stats.calculateMultiple([
   *   new DegreeStatistic(),
   *   new ClosenessStat(),
   *   new DensityStatistic()
   * ]);
   */
  async calculateMultiple(algorithms, options = {}) {
    const results = {
      node: {},
      graph: {}
    };

    for (const algorithm of algorithms) {
      const result = await this.calculate(algorithm, options);

      let algorithmInstance;
      if (algorithm instanceof StatisticAlgorithm) {
        algorithmInstance = algorithm;
      } else {
        algorithmInstance = this._createAlgorithmFromName(algorithm, options);
      }

      if (algorithmInstance.isNodeLevel()) {
        results.node[algorithmInstance.name] = result;
      } else {
        results.graph[algorithmInstance.name] = result;
      }
    }

    return results;
  }

  /**
   * Calculate all available node-level statistics
   *
   * @param {Object} [options={}] - Options
   * @param {Array<string>} [options.nodeIds=null] - Optional subset of nodes
   * @returns {Object} { statName: { nodeId: value } }
   */
  calculateAllNodeStats(options = {}) {
    const algorithms = [
      new DegreeStatistic(),
      new ClosenessStatistic(),
      new EgoDensityStatistic(),
      new BetweennessStatistic(),
      new ClusteringStatistic(),
      new EigenvectorStatistic(),
      new CliquesStatistic()
    ];

    const results = {};
    for (const algorithm of algorithms) {
      results[algorithm.name] = this.calculate(algorithm, options);
    }

    return results;
  }

  /**
   * Calculate all available graph-level statistics
   *
   * @returns {Object} { statName: value }
   */
  calculateAllGraphStats() {
    const algorithms = [
      new DensityStatistic(),
      new DiameterStatistic(),
      new AverageClusteringStatistic(),
      new AverageShortestPathStatistic(),
      new ConnectedComponentsStatistic(),
      new AverageDegreeStatistic()
    ];

    const results = {};
    for (const algorithm of algorithms) {
      results[algorithm.name] = this.calculate(algorithm);
    }

    return results;
  }

  /**
   * Get information about a statistic algorithm
   *
   * @param {string} name - Algorithm name
   * @returns {Object} Algorithm information
   */
  static getAlgorithmInfo(name) {
    const algorithm = NetworkStatistics._createAlgorithmFromName(name);
    return algorithm.getInfo();
  }

  /**
   * List all available node-level statistics
   *
   * @returns {Array<Object>} Array of { name, description, scope }
   */
  static listNodeStatistics() {
    return [
      new DegreeStatistic(),
      new ClosenessStatistic(),
      new EgoDensityStatistic(),
      new BetweennessStatistic(),
      new ClusteringStatistic(),
      new EigenvectorStatistic(),
      new CliquesStatistic()
    ].map(alg => alg.getInfo());
  }

  /**
   * List all available graph-level statistics
   *
   * @returns {Array<Object>} Array of { name, description, scope }
   */
  static listGraphStatistics() {
    return [
      new DensityStatistic(),
      new DiameterStatistic(),
      new AverageClusteringStatistic(),
      new AverageShortestPathStatistic(),
      new ConnectedComponentsStatistic(),
      new AverageDegreeStatistic()
    ].map(alg => alg.getInfo());
  }

  /**
   * Create algorithm instance from string name (for backward compatibility)
   *
   * @private
   * @param {string} name - Algorithm name
   * @param {Object} [options={}] - Algorithm options
   * @returns {StatisticAlgorithm} Algorithm instance
   */
  _createAlgorithmFromName(name, options = {}) {
    return NetworkStatistics._createAlgorithmFromName(name, options);
  }

  /**
   * Static helper to create algorithm from name
   * @private
   */
  static _createAlgorithmFromName(name, options = {}) {
    switch (name.toLowerCase()) {
      // Node-level
      case 'degree':
        return new DegreeStatistic();
      case 'closeness':
        return new ClosenessStatistic(options);
      case 'ego-density':
      case 'egodensity':
        return new EgoDensityStatistic(options);
      case 'betweenness':
        return new BetweennessStatistic();
      case 'clustering':
        return new ClusteringStatistic();
      case 'eigenvector':
        return new EigenvectorStatistic(options);
      case 'cliques':
        return new CliquesStatistic();

      // Graph-level
      case 'density':
        return new DensityStatistic();
      case 'diameter':
        return new DiameterStatistic();
      case 'average-clustering':
      case 'averageclustering':
        return new AverageClusteringStatistic();
      case 'average-shortest-path':
      case 'averageshortestpath':
        return new AverageShortestPathStatistic();
      case 'connected-components':
      case 'connectedcomponents':
        return new ConnectedComponentsStatistic();
      case 'average-degree':
      case 'averagedegree':
        return new AverageDegreeStatistic();

      default:
        throw new Error(`Unknown statistic algorithm: ${name}`);
    }
  }

  /**
   * Create a Graph instance from GraphData format
   *
   * Helper method to convert GraphData to Graph for statistics calculation
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @returns {Graph} Graph instance
   *
   * @example
   * const graph = NetworkStatistics.graphFromData(graphData);
   * const stats = new NetworkStatistics(graph);
   */
  static graphFromData(graphData) {
    const graph = new Graph();

    // Add all nodes
    for (const node of graphData.nodes) {
      graph.addNode(node.id || node);
    }

    // Add all edges
    for (const edge of graphData.edges) {
      graph.addEdge(edge.source, edge.target, edge.weight || 1);
    }

    return graph;
  }

  /**
   * Calculate statistics directly from GraphData
   *
   * Convenience method that handles Graph creation internally
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {StatisticAlgorithm|string|Array} algorithm - Algorithm(s) to run
   * @param {Object} [options={}] - Options
   * @returns {Object|number|Array} Calculation results
   *
   * @example
   * // Single statistic
   * const degree = NetworkStatistics.calculate(graphData, new DegreeStatistic());
   *
   * @example
   * // Multiple statistics
   * const results = NetworkStatistics.calculate(graphData, [
   *   new DegreeStatistic(),
   *   new DensityStatistic()
   * ]);
   */
  static calculateFromData(graphData, algorithm, options = {}) {
    const graph = this.graphFromData(graphData);
    const stats = new NetworkStatistics(graph);

    if (Array.isArray(algorithm)) {
      return stats.calculateMultiple(algorithm, options);
    } else {
      return stats.calculate(algorithm, options);
    }
  }
}

// Export algorithm classes alongside NetworkStatistics
export * from './algorithms/index.js';

export default NetworkStatistics;
