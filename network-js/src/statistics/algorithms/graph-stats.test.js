import { describe, it, expect } from 'vitest';
import { Graph } from '../../graph.js';
import {
  densityCompute,
  diameterCompute,
  averageClusteringCompute,
  averageShortestPathCompute,
  connectedComponentsCompute,
  averageDegreeCompute
} from './graph-stats.js';

function createGraphData(graph) {
  return {
    nodes: Array.from(graph.nodes),
    edges: graph.edges.map(edge => ({
      source: edge.u,
      target: edge.v,
      weight: edge.weight
    })),
    adjacency: Object.fromEntries(graph.adjacencyMap)
  };
}

describe('graph-stats', () => {
  describe('densityCompute', () => {
    it('should calculate density for complete graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const result = await densityCompute(createGraphData(graph), null, {});

      expect(result).toBe(1); // Complete triangle
    });

    it('should calculate density for sparse graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');

      const result = await densityCompute(createGraphData(graph), null, {});

      // 1 edge out of 6 possible = 1/6
      expect(result).toBeCloseTo(1/6, 5);
    });

    it('should return 0 for empty graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);

      const result = await densityCompute(createGraphData(graph), null, {});

      expect(result).toBe(0);
    });

    it('should return 0 for single node', async () => {
      const graph = new Graph();
      graph.addNode('A');

      const result = await densityCompute(createGraphData(graph), null, {});

      expect(result).toBe(0);
    });

    it('should calculate density for path graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await densityCompute(createGraphData(graph), null, {});

      // 3 edges out of 6 possible = 0.5
      expect(result).toBe(0.5);
    });
  });

  describe('diameterCompute', () => {
    it('should calculate diameter for path graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await diameterCompute(createGraphData(graph), null, {});

      expect(result).toBe(3); // A to D
    });

    it('should calculate diameter for triangle', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const result = await diameterCompute(createGraphData(graph), null, {});

      expect(result).toBe(1); // All nodes are neighbors
    });

    it('should calculate diameter for star graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');

      const result = await diameterCompute(createGraphData(graph), null, {});

      expect(result).toBe(2); // Leaf to leaf through hub
    });

    it('should handle single node', async () => {
      const graph = new Graph();
      graph.addNode('A');

      const result = await diameterCompute(createGraphData(graph), null, {});

      expect(result).toBe(0);
    });

    it('should handle disconnected graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('C', 'D');

      const result = await diameterCompute(createGraphData(graph), null, {});

      // Diameter within connected components only
      expect(result).toBe(1);
    });
  });

  describe('averageClusteringCompute', () => {
    it('should calculate average clustering for triangle', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const result = await averageClusteringCompute(createGraphData(graph), null, {});

      expect(result).toBe(1); // All nodes have coefficient 1
    });

    it('should calculate average clustering for mixed graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');
      graph.addEdge('C', 'D');

      const result = await averageClusteringCompute(createGraphData(graph), null, {});

      // A, B have coeff 1, C has coeff 1/3, D has coeff 0
      // Average: (1 + 1 + 0.333 + 0) / 4 = 0.583
      expect(result).toBeCloseTo(0.583, 2);
    });

    it('should return 0 for no triangles', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');

      const result = await averageClusteringCompute(createGraphData(graph), null, {});

      expect(result).toBe(0);
    });

    it('should return 0 for empty graph', async () => {
      const graph = new Graph();

      const result = await averageClusteringCompute(createGraphData(graph), null, {});

      expect(result).toBe(0);
    });
  });

  describe('averageShortestPathCompute', () => {
    it('should calculate average path length for triangle', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const result = await averageShortestPathCompute(createGraphData(graph), null, {});

      expect(result).toBe(1); // All shortest paths are length 1
    });

    it('should calculate average path length for path graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await averageShortestPathCompute(createGraphData(graph), null, {});

      // Paths: A-B(1), A-C(2), A-D(3), B-C(1), B-D(2), C-D(1)
      // Plus reverse: B-A(1), C-A(2), D-A(3), C-B(1), D-B(2), D-C(1)
      // Total: (1+2+3+1+2+1+1+2+3+1+2+1) / 12 = 20/12 = 1.666...
      expect(result).toBeCloseTo(1.666, 2);
    });

    it('should handle star graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');

      const result = await averageShortestPathCompute(createGraphData(graph), null, {});

      // From A (hub): 3 paths of length 1 to B, C, D
      // From B: path to A (1), path to C (2), path to D (2) = 5
      // From C: path to A (1), path to B (2), path to D (2) = 5
      // From D: path to A (1), path to B (2), path to C (2) = 5
      // Total: 3 + 5 + 5 + 5 = 18 paths, average = 18/12 = 1.5
      expect(result).toBe(1.5);
    });

    it('should handle single node', async () => {
      const graph = new Graph();
      graph.addNode('A');

      const result = await averageShortestPathCompute(createGraphData(graph), null, {});

      expect(result).toBe(0);
    });

    it('should only count connected pairs', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('C', 'D');

      const result = await averageShortestPathCompute(createGraphData(graph), null, {});

      // Only counts paths within components
      // A-B(1), B-A(1), C-D(1), D-C(1) = 4/4 = 1
      expect(result).toBe(1);
    });
  });

  describe('connectedComponentsCompute', () => {
    it('should identify single component', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');

      const result = await connectedComponentsCompute(createGraphData(graph), null, {});

      expect(result.count).toBe(1);
      expect(result.components['A']).toBe(result.components['B']);
      expect(result.components['B']).toBe(result.components['C']);
    });

    it('should identify multiple components', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('C', 'D');

      const result = await connectedComponentsCompute(createGraphData(graph), null, {});

      expect(result.count).toBe(2);
      expect(result.components['A']).toBe(result.components['B']);
      expect(result.components['C']).toBe(result.components['D']);
      expect(result.components['A']).not.toBe(result.components['C']);
    });

    it('should handle isolated nodes', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);

      const result = await connectedComponentsCompute(createGraphData(graph), null, {});

      expect(result.count).toBe(3);
      expect(result.components['A']).not.toBe(result.components['B']);
      expect(result.components['B']).not.toBe(result.components['C']);
    });

    it('should handle single node', async () => {
      const graph = new Graph();
      graph.addNode('A');

      const result = await connectedComponentsCompute(createGraphData(graph), null, {});

      expect(result.count).toBe(1);
      expect(result.components['A']).toBe(0);
    });

    it('should handle empty graph', async () => {
      const graph = new Graph();

      const result = await connectedComponentsCompute(createGraphData(graph), null, {});

      expect(result.count).toBe(0);
      expect(Object.keys(result.components).length).toBe(0);
    });

    it('should identify complex component structure', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D', 'E', 'F']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('D', 'E');
      // F is isolated

      const result = await connectedComponentsCompute(createGraphData(graph), null, {});

      expect(result.count).toBe(3);

      // Component 1: A-B-C
      expect(result.components['A']).toBe(result.components['B']);
      expect(result.components['B']).toBe(result.components['C']);

      // Component 2: D-E
      expect(result.components['D']).toBe(result.components['E']);

      // Component 3: F
      expect(result.components['F']).not.toBe(result.components['A']);
      expect(result.components['F']).not.toBe(result.components['D']);
    });
  });

  describe('averageDegreeCompute', () => {
    it('should calculate average degree', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await averageDegreeCompute(createGraphData(graph), null, {});

      // Degrees: A=1, B=2, C=2, D=1
      // Average: (1+2+2+1)/4 = 1.5
      expect(result).toBe(1.5);
    });

    it('should handle star graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');

      const result = await averageDegreeCompute(createGraphData(graph), null, {});

      // Degrees: A=3, B=1, C=1, D=1
      // Average: (3+1+1+1)/4 = 1.5
      expect(result).toBe(1.5);
    });

    it('should handle complete graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const result = await averageDegreeCompute(createGraphData(graph), null, {});

      // All nodes have degree 2
      expect(result).toBe(2);
    });

    it('should return 0 for isolated nodes', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);

      const result = await averageDegreeCompute(createGraphData(graph), null, {});

      expect(result).toBe(0);
    });

    it('should return 0 for empty graph', async () => {
      const graph = new Graph();

      const result = await averageDegreeCompute(createGraphData(graph), null, {});

      expect(result).toBe(0);
    });
  });
});
