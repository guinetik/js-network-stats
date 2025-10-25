import Graph from "./graph.js";

/**
 * Static class containing network analysis algorithms.
 * Implements various centrality measures and graph metrics from network theory.
 *
 * @class
 * @example
 * import { Network } from '@guinetik.network-js';
 * import Graph from '@guinetik.network-js/graph';
 *
 * const graph = new Graph();
 * graph.addEdge('A', 'B');
 * graph.addEdge('B', 'C');
 *
 * const degree = Network.degree(graph);
 * const clustering = Network.clustering(graph);
 */
export class Network {
  /**
   * Calculate eigenvector centrality for nodes in a graph.
   * Uses the power iteration method to find the principal eigenvector of the adjacency matrix.
   * Measures node importance based on the importance of neighbors.
   *
   * **Algorithm**: Power iteration with normalization
   * **Complexity**: O(k * (V + E)) where k is number of iterations, V is vertices, E is edges
   * **Use case**: Identifies influential nodes in social networks
   *
   * @param {Graph} graph - The graph to analyze
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.maxIter=100] - Maximum iterations before stopping
   * @param {number} [options.tolerance=1e-6] - Convergence threshold (stops when change < tolerance)
   * @returns {{_stringValues: Object<string|number, number>}} Object with _stringValues mapping node IDs to centrality scores [0, 1]
   * @example
   * const centrality = Network.eigenvectorCentrality(graph, { maxIter: 200 });
   * console.log(centrality._stringValues); // { 'A': 0.577, 'B': 0.577, 'C': 0.577 }
   */
  static eigenvectorCentrality(graph, options = {}) {
    const { maxIter = 100, tolerance = 1e-6 } = options;
    const nodes = graph.getNodeList();
    const n = nodes.length;

    // Initialize centrality values
    let centrality = new Map(nodes.map((node) => [node, 1 / n]));
    let prevCentrality = new Map(centrality);

    for (let i = 0; i < maxIter; i++) {
      // Save previous iteration
      prevCentrality = new Map(centrality);

      // Reset centrality values
      centrality = new Map(nodes.map((node) => [node, 0]));

      // Update centrality based on neighbors
      for (const node of nodes) {
        const neighbors = graph.getNeighbors(node);
        for (const neighbor of neighbors) {
          const weight = graph.adjacencyMap.get(node).get(neighbor);
          centrality.set(
            neighbor,
            centrality.get(neighbor) + prevCentrality.get(node) * weight
          );
        }
      }

      // Normalize
      const norm = Math.sqrt(
        [...centrality.values()].reduce((sum, val) => sum + val * val, 0)
      );

      if (norm > 0) {
        for (const node of nodes) {
          centrality.set(node, centrality.get(node) / norm);
        }
      }

      // Check for convergence
      let diff = 0;
      for (const node of nodes) {
        diff += Math.abs(centrality.get(node) - prevCentrality.get(node));
      }

      if (diff < tolerance) {
        break;
      }
    }

    // Convert to expected output format
    return {
      _stringValues: Object.fromEntries(centrality.entries()),
    };
  }

  /**
   * Calculate betweenness centrality for nodes in a graph.
   * Measures how often a node appears on shortest paths between other nodes.
   * Uses breadth-first search to find all shortest paths.
   *
   * **Algorithm**: BFS-based shortest path enumeration
   * **Complexity**: O(V³) for unweighted graphs
   * **Use case**: Identifies bridge nodes and information bottlenecks
   *
   * @param {Graph} graph - The graph to analyze
   * @returns {{_stringValues: Object<string|number, number>}} Normalized betweenness centrality scores [0, 1]
   * @example
   * const centrality = Network.betweennessCentrality(graph);
   * // Node 'B' connecting 'A' and 'C' has high betweenness
   * console.log(centrality._stringValues); // { 'A': 0, 'B': 1, 'C': 0 }
   */
  static betweennessCentrality(graph) {
    const nodes = graph.getNodeList();
    const betweenness = new Map(nodes.map((node) => [node, 0]));

    // For each node as source
    for (const source of nodes) {
      // Breadth-first search to find shortest paths
      const distances = new Map();
      const paths = new Map();
      const queue = [source];
      const visited = new Set([source]);

      distances.set(source, 0);
      paths.set(source, [[source]]);

      while (queue.length > 0) {
        const current = queue.shift();
        const dist = distances.get(current);

        for (const neighbor of graph.getNeighbors(current)) {
          // If not visited yet
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
            distances.set(neighbor, dist + 1);
            paths.set(neighbor, []);
          }

          // If this is a shortest path
          if (distances.get(neighbor) === dist + 1) {
            // Add all paths from current to neighbor
            const currentPaths = paths.get(current);
            const newPaths = currentPaths.map((path) => [...path, neighbor]);
            paths.set(neighbor, [...paths.get(neighbor), ...newPaths]);
          }
        }
      }

      // Calculate dependency for each node
      const dependency = new Map(nodes.map((node) => [node, 0]));

      // Process nodes in descending order of distance from source
      const sortedNodes = [...nodes]
        .filter((n) => n !== source)
        .sort(
          (a, b) =>
            (distances.get(b) || Infinity) - (distances.get(a) || Infinity)
        );

      for (const target of sortedNodes) {
        if (!distances.has(target)) continue;

        const targetPaths = paths.get(target) || [];

        // Calculate betweenness for nodes on the paths
        for (const path of targetPaths) {
          for (let i = 1; i < path.length - 1; i++) {
            const node = path[i];
            betweenness.set(
              node,
              betweenness.get(node) + 1 / targetPaths.length
            );
          }
        }
      }
    }

    // Normalize
    const n = nodes.length;
    const normalizationFactor = 2 / ((n - 1) * (n - 2));

    for (const node of nodes) {
      betweenness.set(node, betweenness.get(node) * normalizationFactor);
    }

    return {
      _stringValues: Object.fromEntries(betweenness.entries()),
    };
  }

  /**
   * Calculate local clustering coefficient for each node in the graph.
   * Measures the degree to which a node's neighbors are also connected to each other.
   * Indicates how "cluster-like" a node's neighborhood is.
   *
   * **Formula**: C(v) = (# of triangles involving v) / (# of possible triangles)
   * **Complexity**: O(V * k²) where k is average degree
   * **Use case**: Detects tightly-knit groups and community structure
   *
   * @param {Graph} graph - The graph to analyze
   * @returns {{_stringValues: Object<string|number, number>}} Clustering coefficients [0, 1] where 1 means all neighbors are connected
   * @example
   * const clustering = Network.clustering(graph);
   * // Node with all neighbors interconnected has coefficient 1.0
   * console.log(clustering._stringValues); // { 'A': 1.0, 'B': 0.33, 'C': 0 }
   */
  static clustering(graph) {
    const nodes = graph.getNodeList();
    const clustering = new Map();

    for (const node of nodes) {
      const neighbors = graph.getNeighbors(node);
      const k = neighbors.length;

      if (k < 2) {
        clustering.set(node, 0);
        continue;
      }

      let triangles = 0;

      // Count triangles
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
          if (graph.adjacencyMap.get(neighbors[i]).has(neighbors[j])) {
            triangles++;
          }
        }
      }

      // Calculate clustering coefficient
      const possibleTriangles = (k * (k - 1)) / 2;
      clustering.set(node, triangles / possibleTriangles);
    }

    return {
      _stringValues: Object.fromEntries(clustering.entries()),
    };
  }

  /**
   * Calculate the number of maximal cliques each node belongs to.
   * A clique is a subset of nodes where every pair is connected.
   * Uses the Bron-Kerbosch algorithm to find all maximal cliques.
   *
   * **Algorithm**: Bron-Kerbosch with pivot
   * **Complexity**: O(3^(V/3)) worst case (exponential)
   * **Use case**: Finding complete subgraphs, cohesive groups
   *
   * @param {Graph} graph - The graph to analyze
   * @returns {{_stringValues: Object<string|number, number>}} Count of maximal cliques each node participates in
   * @example
   * const cliques = Network.numberOfCliques(graph);
   * console.log(cliques._stringValues); // { 'A': 2, 'B': 3, 'C': 1 }
   */
  static numberOfCliques(graph) {
    const nodes = graph.getNodeList();
    const nodesToCliques = new Map(nodes.map((node) => [node, 0]));

    // Find all maximal cliques using Bron-Kerbosch algorithm
    const cliques = Network.#findMaximalCliques(graph);

    // Count cliques for each node
    for (const clique of cliques) {
      for (const node of clique) {
        nodesToCliques.set(node, nodesToCliques.get(node) + 1);
      }
    }

    return {
      _stringValues: Object.fromEntries(nodesToCliques.entries()),
    };
  }

  /**
   * Find all maximal cliques in a graph using the Bron-Kerbosch algorithm with pivot.
   * A maximal clique is a clique that cannot be extended by adding another vertex.
   *
   * **Algorithm**: Bron-Kerbosch with pivot optimization
   * **Parameters**:
   * - R: Current clique being built
   * - P: Candidate nodes that can extend R
   * - X: Nodes already processed
   *
   * @private
   * @param {Graph} graph - The graph to analyze
   * @returns {Array<Array<string|number>>} Array of maximal cliques (each clique is an array of node IDs)
   */
  static #findMaximalCliques(graph) {
    const nodes = graph.getNodeList();
    const cliques = [];

    // Helper function for Bron-Kerbosch algorithm
    const bronKerbosch = (r, p, x) => {
      if (p.size === 0 && x.size === 0) {
        cliques.push([...r]);
        return;
      }

      // Choose a pivot vertex
      const union = new Set([...p, ...x]);
      const pivot = Array.from(union)[0];

      // Neighbors of pivot
      const pivotNeighbors = new Set(graph.getNeighbors(pivot));

      // For each vertex in P but not in neighborhood of pivot
      for (const v of p) {
        if (!pivotNeighbors.has(v)) {
          const vNeighbors = new Set(graph.getNeighbors(v));

          // Recursive call
          bronKerbosch(
            new Set([...r, v]),
            new Set([...p].filter((n) => vNeighbors.has(n))),
            new Set([...x].filter((n) => vNeighbors.has(n)))
          );

          // Move v from P to X
          p.delete(v);
          x.add(v);
        }
      }
    };

    // Initial call with all nodes in P
    bronKerbosch(new Set(), new Set(nodes), new Set());

    return cliques;
  }

  /**
   * Calculate degree centrality for each node in the graph.
   * Simply counts the number of edges connected to each node.
   * The most basic centrality measure.
   *
   * **Algorithm**: Count neighbors
   * **Complexity**: O(V)
   * **Use case**: Identifies highly connected nodes (hubs)
   *
   * @param {Graph} graph - The graph to analyze
   * @returns {{_stringValues: Object<string|number, number>}} Count of neighbors for each node
   * @example
   * const degree = Network.degree(graph);
   * console.log(degree._stringValues); // { 'A': 2, 'B': 3, 'C': 1 }
   */
  static degree(graph) {
    const nodes = graph.getNodeList();
    const degree = new Map();

    for (const node of nodes) {
      degree.set(node, graph.getNeighbors(node).length);
    }

    return {
      _stringValues: Object.fromEntries(degree.entries()),
    };
  }

  /**
   * Calculate community structure and modularity using the Louvain algorithm.
   * Partitions the graph into communities to maximize modularity.
   * Returns community assignments for each node.
   *
   * **Algorithm**: Louvain community detection
   * **Complexity**: O(V log V) on average
   * **Use case**: Detecting communities/groups in social networks
   *
   * @param {Graph} graph - The graph to analyze
   * @param {Object} [options={}] - Configuration options
   * @param {Object} [options.louvainModule] - Louvain module object (required)
   * @returns {Object<string|number, number>} Community assignment for each node
   * @throws {Error} If Louvain module is not provided
   * @example
   * import { Louvain } from './louvain.js';
   * const communities = Network.modularity(graph, { louvainModule: { Louvain } });
   * console.log(communities); // { 'A': 0, 'B': 0, 'C': 1 } - nodes grouped by community ID
   */
  static modularity(graph, options = {}) {
    // Import Louvain class
    const { Louvain } = options.louvainModule || { Louvain: null };

    if (!Louvain) {
      throw new Error("Louvain module is required for modularity calculation");
    }

    const louvain = new Louvain();
    const nodes = graph.getNodeList();

    // Convert edges to the format expected by Louvain
    const edges = graph.getAllEdges().map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
    }));

    // Run Louvain algorithm
    const communities = louvain.setNodes(nodes).setEdges(edges).execute();

    return communities;
  }
}
