import { Graph } from "./graph.js";

describe("Graph", () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
  });

  test("should create an empty graph", () => {
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges.length).toBe(0);
    expect(graph.adjacencyMap.size).toBe(0);
  });

  test("should add nodes correctly", () => {
    graph.addNodesFrom(["A", "B", "C"]);
    expect(graph.nodes.size).toBe(3);
    expect(graph.nodes.has("A")).toBe(true);
    expect(graph.nodes.has("B")).toBe(true);
    expect(graph.nodes.has("C")).toBe(true);
  });

  test("should add edges correctly", () => {
    graph.addEdge("A", "B", 2);

    // Check nodes were added
    expect(graph.nodes.has("A")).toBe(true);
    expect(graph.nodes.has("B")).toBe(true);

    // Check edge exists in both directions (undirected graph)
    expect(graph.adjacencyMap.get("A").get("B")).toBe(2);
    expect(graph.adjacencyMap.get("B").get("A")).toBe(2);

    // Check edge list
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0].source).toBe("A");
    expect(graph.edges[0].target).toBe("B");
    expect(graph.edges[0].weight).toBe(2);
  });

  test("should add multiple edges correctly", () => {
    const edgeList = [
      ["A", "B", 2],
      ["B", "C", 3],
      ["A", "C", 1],
    ];

    graph.addEdgesFrom(edgeList);

    expect(graph.nodes.size).toBe(3);
    expect(graph.edges.length).toBe(3);

    // Check all adjacency mappings
    expect(graph.adjacencyMap.get("A").get("B")).toBe(2);
    expect(graph.adjacencyMap.get("B").get("C")).toBe(3);
    expect(graph.adjacencyMap.get("A").get("C")).toBe(1);
  });

  test("should get neighbors correctly", () => {
    graph.addEdgesFrom([
      ["A", "B"],
      ["A", "C"],
      ["B", "C"],
    ]);

    const aNeighbors = graph.getNeighbors("A");
    expect(aNeighbors).toHaveLength(2);
    expect(aNeighbors).toContain("B");
    expect(aNeighbors).toContain("C");

    // Non-existent node should return empty array
    expect(graph.getNeighbors("D")).toHaveLength(0);
  });

  test("should get all edges and nodes correctly", () => {
    graph.addEdgesFrom([
      ["A", "B", 2],
      ["B", "C", 1],
      ["A", "C", 3],
    ]);

    const edges = graph.getAllEdges();
    expect(edges).toHaveLength(3);
    expect(edges[0]).toEqual(
      expect.objectContaining({
        source: "A",
        target: "B",
        weight: 2,
      })
    );

    const nodes = graph.getNodeList();
    expect(nodes).toHaveLength(3);
    expect(nodes).toContain("A");
    expect(nodes).toContain("B");
    expect(nodes).toContain("C");
  });

  describe("CRUD Operations", () => {
    test("should add a single node", () => {
      graph.addNode("A");
      expect(graph.hasNode("A")).toBe(true);
      expect(graph.numberOfNodes()).toBe(1);
    });

    test("should check if node exists", () => {
      graph.addNode("A");
      expect(graph.hasNode("A")).toBe(true);
      expect(graph.hasNode("B")).toBe(false);
    });

    test("should remove a node and its edges", () => {
      graph.addEdge("A", "B", 1);
      graph.addEdge("A", "C", 2);
      graph.addEdge("B", "C", 3);

      expect(graph.numberOfNodes()).toBe(3);
      expect(graph.numberOfEdges()).toBe(3);

      graph.removeNode("A");

      expect(graph.hasNode("A")).toBe(false);
      expect(graph.numberOfNodes()).toBe(2);
      expect(graph.numberOfEdges()).toBe(1); // Only B-C edge remains

      // Check that B and C no longer have A as neighbor
      expect(graph.getNeighbors("B")).not.toContain("A");
      expect(graph.getNeighbors("C")).not.toContain("A");
    });

    test("should throw error when removing non-existent node", () => {
      expect(() => graph.removeNode("Z")).toThrow("does not exist");
    });

    test("should check if edge exists", () => {
      graph.addEdge("A", "B", 1);
      expect(graph.hasEdge("A", "B")).toBe(true);
      expect(graph.hasEdge("B", "A")).toBe(true); // Undirected
      expect(graph.hasEdge("A", "C")).toBe(false);
    });

    test("should remove an edge", () => {
      graph.addEdge("A", "B", 1);
      graph.addEdge("A", "C", 2);

      expect(graph.numberOfEdges()).toBe(2);

      graph.removeEdge("A", "B");

      expect(graph.numberOfEdges()).toBe(1);
      expect(graph.hasEdge("A", "B")).toBe(false);
      expect(graph.hasEdge("A", "C")).toBe(true);

      // Check adjacency map updated
      expect(graph.adjacencyMap.get("A").has("B")).toBe(false);
      expect(graph.adjacencyMap.get("B").has("A")).toBe(false);
    });

    test("should throw error when removing non-existent edge", () => {
      graph.addNode("A");
      graph.addNode("B");
      expect(() => graph.removeEdge("A", "B")).toThrow("does not exist");
    });

    test("should get edge weight", () => {
      graph.addEdge("A", "B", 2.5);
      expect(graph.getEdgeWeight("A", "B")).toBe(2.5);
      expect(graph.getEdgeWeight("B", "A")).toBe(2.5); // Undirected
      expect(graph.getEdgeWeight("A", "C")).toBeNull();
    });

    test("should update edge weight", () => {
      graph.addEdge("A", "B", 1);
      expect(graph.getEdgeWeight("A", "B")).toBe(1);

      graph.updateEdgeWeight("A", "B", 5);
      expect(graph.getEdgeWeight("A", "B")).toBe(5);
      expect(graph.getEdgeWeight("B", "A")).toBe(5); // Undirected

      // Check edge object also updated
      const edge = graph.edges.find(e => e.hasNode("A") && e.hasNode("B"));
      expect(edge.weight).toBe(5);
    });

    test("should throw error when updating non-existent edge", () => {
      expect(() => graph.updateEdgeWeight("A", "B", 5)).toThrow("does not exist");
    });

    test("should get degree of a node", () => {
      graph.addEdge("A", "B", 1);
      graph.addEdge("A", "C", 1);
      graph.addEdge("A", "D", 1);

      expect(graph.degree("A")).toBe(3);
      expect(graph.degree("B")).toBe(1);
      expect(graph.degree("Z")).toBe(0); // Non-existent node
    });

    test("should get number of nodes and edges", () => {
      expect(graph.numberOfNodes()).toBe(0);
      expect(graph.numberOfEdges()).toBe(0);

      graph.addEdge("A", "B", 1);
      graph.addEdge("B", "C", 1);

      expect(graph.numberOfNodes()).toBe(3);
      expect(graph.numberOfEdges()).toBe(2);
    });

    test("should clear all nodes and edges", () => {
      graph.addEdge("A", "B", 1);
      graph.addEdge("B", "C", 1);

      expect(graph.numberOfNodes()).toBe(3);
      expect(graph.numberOfEdges()).toBe(2);

      graph.clear();

      expect(graph.numberOfNodes()).toBe(0);
      expect(graph.numberOfEdges()).toBe(0);
      expect(graph.adjacencyMap.size).toBe(0);
    });
  });

  describe("Method Chaining", () => {
    test("should support method chaining", () => {
      const result = graph
        .addNode("A")
        .addNode("B")
        .addEdge("A", "B", 1)
        .addNodesFrom(["C", "D"])
        .addEdgesFrom([["C", "D", 2]]);

      expect(result).toBe(graph);
      expect(graph.numberOfNodes()).toBe(4);
      expect(graph.numberOfEdges()).toBe(2);
    });
  });
});
