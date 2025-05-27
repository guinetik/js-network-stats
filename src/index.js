import Graph from "./graph.js";
import { Louvain } from "./louvain.js";
import { Network } from "./network.js";
export class NetworkStats {
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

  constructor(options = {}) {
    this.options = {
      maxIter: options.maxIter || 100000,
      verbose: options.verbose !== undefined ? options.verbose : true,
      louvainModule: options.louvainModule || { Louvain }
    };
    
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

  analyze(network, features) {
    console.time("networkAnalysis");
    
    if (this.options.verbose) {
      console.log("processing", network.length, "records");
    }
    
    // Use default features if none provided
    features = features || NetworkStats.FEATURES.ALL;
    
    // Extract network data
    const { graph, nodes } = this.#prepareNetwork(network);
    
    // Process each requested feature
    const stats = this.#processFeatures(graph, features, nodes);
    
    // Normalize and return results
    const result = this.#normalizeFeatures(stats, nodes);
    
    console.timeEnd("networkAnalysis");
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
          if (this.options.verbose) {
            console.log(`processing ${feature.toUpperCase()}`);
          }
          
          stats[feature] = this.featureProcessors[feature](graph, nodes);
        } catch (err) {
          if (this.options.verbose) {
            console.log(`error processing ${feature}:`, err);
          }
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

export default NetworkStats;