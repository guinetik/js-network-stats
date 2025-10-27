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
     * Array of all edges in the graph
     * Each edge is an object with properties: {u: source, v: target, weight: number}
     * @type {Array<{u: string|number, v: string|number, weight: number}>}
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
   * Add a single node to the graph.
   *
   * @param {string|number} node - Node identifier to add
   * @returns {Graph} The graph instance for chaining
   * @example
   * graph.addNode('A');
   * graph.addNode(42);
   */
  addNode(node) {
    this.nodes.add(node);
    return this;
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
   * Remove a node and all its associated edges from the graph.
   * Time complexity: O(V + E) in worst case where V is vertices and E is edges.
   *
   * @param {string|number} node - Node identifier to remove
   * @returns {Graph} The graph instance for chaining
   * @throws {Error} If node does not exist
   * @example
   * graph.addNode('A');
   * graph.addEdge('A', 'B', 1);
   * graph.removeNode('A'); // Removes 'A' and edge A-B
   */
  removeNode(node) {
    if (!this.nodes.has(node)) {
      throw new Error(`Node '${node}' does not exist in the graph`);
    }

    // Remove the node from the set
    this.nodes.delete(node);

    // Remove all edges connected to this node
    this.edges = this.edges.filter(edge => edge.u !== node && edge.v !== node);

    // Remove from adjacency map
    if (this.adjacencyMap.has(node)) {
      // Get neighbors to clean up their adjacency lists
      const neighbors = Array.from(this.adjacencyMap.get(node).keys());
      neighbors.forEach(neighbor => {
        if (this.adjacencyMap.has(neighbor)) {
          this.adjacencyMap.get(neighbor).delete(node);
        }
      });
      this.adjacencyMap.delete(node);
    }

    return this;
  }

  /**
   * Check if a node exists in the graph.
   *
   * @param {string|number} node - Node identifier to check
   * @returns {boolean} True if node exists, false otherwise
   * @example
   * graph.addNode('A');
   * console.log(graph.hasNode('A')); // true
   * console.log(graph.hasNode('Z')); // false
   */
  hasNode(node) {
    return this.nodes.has(node);
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

    // Create edge object (simple plain object, no need for Connection class)
    const edge = { u: source, v: target, weight };
    this.edges.push(edge);

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
   * @returns {Array<{u: string|number, v: string|number, weight: number}>} Array of edge objects
   * @example
   * const edges = graph.getAllEdges();
   * edges.forEach(edge => console.log(edge.u, '->', edge.v, 'weight:', edge.weight));
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

  /**
   * Get the number of nodes in the graph.
   * Time complexity: O(1)
   *
   * @returns {number} Number of nodes
   * @example
   * graph.addNodesFrom(['A', 'B', 'C']);
   * console.log(graph.numberOfNodes()); // 3
   */
  numberOfNodes() {
    return this.nodes.size;
  }

  /**
   * Get the number of edges in the graph.
   * Time complexity: O(1)
   *
   * @returns {number} Number of edges
   * @example
   * graph.addEdge('A', 'B');
   * graph.addEdge('B', 'C');
   * console.log(graph.numberOfEdges()); // 2
   */
  numberOfEdges() {
    return this.edges.length;
  }

  /**
   * Remove an edge between two nodes.
   * Works for both (source, target) and (target, source) order.
   *
   * @param {string|number} source - Source node identifier
   * @param {string|number} target - Target node identifier
   * @returns {Graph} The graph instance for chaining
   * @throws {Error} If edge does not exist
   * @example
   * graph.addEdge('A', 'B', 1);
   * graph.removeEdge('A', 'B');
   */
  removeEdge(source, target) {
    // Find the edge index (check both directions since graph is undirected)
    const edgeIndex = this.edges.findIndex(edge =>
      (edge.u === source && edge.v === target) || (edge.u === target && edge.v === source)
    );

    if (edgeIndex === -1) {
      throw new Error(`Edge between '${source}' and '${target}' does not exist`);
    }

    // Remove from edges array
    this.edges.splice(edgeIndex, 1);

    // Update adjacency map
    if (this.adjacencyMap.has(source)) {
      this.adjacencyMap.get(source).delete(target);
    }
    if (this.adjacencyMap.has(target)) {
      this.adjacencyMap.get(target).delete(source);
    }

    return this;
  }

  /**
   * Check if an edge exists between two nodes.
   *
   * @param {string|number} source - Source node identifier
   * @param {string|number} target - Target node identifier
   * @returns {boolean} True if edge exists, false otherwise
   * @example
   * graph.addEdge('A', 'B');
   * console.log(graph.hasEdge('A', 'B')); // true
   * console.log(graph.hasEdge('B', 'A')); // true (undirected)
   * console.log(graph.hasEdge('A', 'C')); // false
   */
  hasEdge(source, target) {
    return this.adjacencyMap.has(source) &&
           this.adjacencyMap.get(source).has(target);
  }

  /**
   * Get the weight of an edge between two nodes.
   *
   * @param {string|number} source - Source node identifier
   * @param {string|number} target - Target node identifier
   * @returns {number|null} Edge weight, or null if edge doesn't exist
   * @example
   * graph.addEdge('A', 'B', 2.5);
   * console.log(graph.getEdgeWeight('A', 'B')); // 2.5
   */
  getEdgeWeight(source, target) {
    if (!this.hasEdge(source, target)) {
      return null;
    }
    return this.adjacencyMap.get(source).get(target);
  }

  /**
   * Update the weight of an existing edge.
   *
   * @param {string|number} source - Source node identifier
   * @param {string|number} target - Target node identifier
   * @param {number} weight - New weight value
   * @returns {Graph} The graph instance for chaining
   * @throws {Error} If edge does not exist
   * @example
   * graph.addEdge('A', 'B', 1);
   * graph.updateEdgeWeight('A', 'B', 2.5);
   */
  updateEdgeWeight(source, target, weight) {
    if (!this.hasEdge(source, target)) {
      throw new Error(`Edge between '${source}' and '${target}' does not exist`);
    }

    // Update adjacency map
    this.adjacencyMap.get(source).set(target, weight);
    this.adjacencyMap.get(target).set(source, weight);

    // Update edges array (check both directions since graph is undirected)
    const edge = this.edges.find(e =>
      (e.u === source && e.v === target) || (e.u === target && e.v === source)
    );
    if (edge) {
      edge.weight = weight;
    }

    return this;
  }

  /**
   * Get degree (number of neighbors) of a node.
   *
   * @param {string|number} node - Node identifier
   * @returns {number} Degree of the node (0 if node doesn't exist)
   * @example
   * graph.addEdge('A', 'B');
   * graph.addEdge('A', 'C');
   * console.log(graph.degree('A')); // 2
   */
  degree(node) {
    if (!this.adjacencyMap.has(node)) {
      return 0;
    }
    return this.adjacencyMap.get(node).size;
  }

  /**
   * Clear all nodes and edges from the graph.
   *
   * @returns {Graph} The graph instance for chaining
   * @example
   * graph.addNode('A');
   * graph.clear();
   * console.log(graph.numberOfNodes()); // 0
   */
  clear() {
    this.nodes.clear();
    this.edges = [];
    this.adjacencyMap.clear();
    return this;
  }
}

export default Graph;