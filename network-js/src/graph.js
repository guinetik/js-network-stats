import { Connection } from "./connection.js";

/**
 * Represents an undirected, weighted graph data structure.
 * Uses an adjacency map for O(1) neighbor lookups.
 *
 * @class
 * @example
 * const graph = new Graph();
 * graph.addNodesFrom(['A', 'B', 'C']);
 * graph.addEdge('A', 'B', 2);
 * graph.addEdge('B', 'C', 1.5);
 * console.log(graph.getNeighbors('B')); // ['A', 'C']
 */
export class Graph {
  /**
   * Creates a new empty graph.
   */
  constructor() {
    /**
     * Set of all node identifiers in the graph
     * @type {Set<string|number>}
     */
    this.nodes = new Set();

    /**
     * Array of all edges (Connection objects) in the graph
     * @type {Connection[]}
     */
    this.edges = [];

    /**
     * Adjacency map for fast neighbor lookups
     * Maps node -> Map(neighbor -> weight)
     * @type {Map<string|number, Map<string|number, number>>}
     */
    this.adjacencyMap = new Map();
  }

  /**
   * Add multiple nodes to the graph.
   *
   * @param {Array<string|number>} nodes - Array of node identifiers to add
   * @returns {Graph} The graph instance for chaining
   * @example
   * graph.addNodesFrom(['node1', 'node2', 'node3']);
   */
  addNodesFrom(nodes) {
    nodes.forEach((node) => this.nodes.add(node));
    return this;
  }

  /**
   * Add multiple edges to the graph from a list of edge tuples.
   *
   * @param {Array<Array<string|number|number>>} edgeList - Array of [source, target, weight?] tuples
   * @returns {Graph} The graph instance for chaining
   * @example
   * graph.addEdgesFrom([
   *   ['A', 'B', 2],
   *   ['B', 'C', 1.5],
   *   ['C', 'D'] // weight defaults to 1
   * ]);
   */
  addEdgesFrom(edgeList) {
    edgeList.forEach(([source, target, weight = 1]) => {
      this.addEdge(source, target, weight);
    });
    return this;
  }

  /**
   * Add a weighted edge between two nodes.
   * Creates an undirected connection (bidirectional).
   * Automatically adds nodes if they don't exist.
   *
   * @param {string|number} source - Source node identifier
   * @param {string|number} target - Target node identifier
   * @param {number} [weight=1] - Edge weight (default: 1)
   * @returns {Graph} The graph instance for chaining
   * @example
   * graph.addEdge('A', 'B', 2.5);
   */
  addEdge(source, target, weight = 1) {
    // Add nodes if they don't exist
    this.nodes.add(source);
    this.nodes.add(target);

    // Create a Connection object
    const connection = new Connection(source, target, weight);
    this.edges.push(connection);

    // Update adjacency map for quick lookups
    if (!this.adjacencyMap.has(source)) {
      this.adjacencyMap.set(source, new Map());
    }
    if (!this.adjacencyMap.has(target)) {
      this.adjacencyMap.set(target, new Map());
    }

    this.adjacencyMap.get(source).set(target, weight);
    this.adjacencyMap.get(target).set(source, weight); // For undirected graph

    return this;
  }

  /**
   * Get all neighbors (adjacent nodes) of a given node.
   * Time complexity: O(1) lookup + O(k) where k is number of neighbors.
   *
   * @param {string|number} node - The node identifier
   * @returns {Array<string|number>} Array of neighbor node identifiers (empty if node not found)
   * @example
   * graph.addEdge('A', 'B');
   * graph.addEdge('A', 'C');
   * console.log(graph.getNeighbors('A')); // ['B', 'C']
   */
  getNeighbors(node) {
    return this.adjacencyMap.has(node)
      ? Array.from(this.adjacencyMap.get(node).keys())
      : [];
  }

  /**
   * Get all edges in the graph.
   *
   * @returns {Connection[]} Array of Connection objects
   * @example
   * const edges = graph.getAllEdges();
   * edges.forEach(edge => console.log(edge.source, '->', edge.target));
   */
  getAllEdges() {
    return this.edges;
  }

  /**
   * Get all nodes in the graph as an array.
   *
   * @returns {Array<string|number>} Array of all node identifiers
   * @example
   * const nodes = graph.getNodeList();
   * console.log(`Graph has ${nodes.length} nodes`);
   */
  getNodeList() {
    return Array.from(this.nodes);
  }
}

export default Graph;