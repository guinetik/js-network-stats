import { Connection } from "./connection.js";

export class Graph {
  constructor() {
    this.nodes = new Set();
    this.edges = [];
    this.adjacencyMap = new Map();
  }

  addNodesFrom(nodes) {
    nodes.forEach((node) => this.nodes.add(node));
    return this;
  }

  addEdgesFrom(edgeList) {
    edgeList.forEach(([source, target, weight = 1]) => {
      this.addEdge(source, target, weight);
    });
    return this;
  }

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

  getNeighbors(node) {
    return this.adjacencyMap.has(node)
      ? Array.from(this.adjacencyMap.get(node).keys())
      : [];
  }

  getAllEdges() {
    return this.edges;
  }

  getNodeList() {
    return Array.from(this.nodes);
  }
}

export default Graph;