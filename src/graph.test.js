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
});
