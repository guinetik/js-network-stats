import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import {
  reconstructGraph,
  reportProgress,
  bfs,
  bfsDistances,
  clusteringCoefficient,
  countTriangles,
  normalize,
  l1Distance
} from './compute-utils.js';

describe('compute-utils', () => {
  describe('reconstructGraph', () => {
    it('should reconstruct a graph from serialized data', () => {
      const graphData = {
        nodes: ['A', 'B', 'C'],
        edges: [
          { source: 'A', target: 'B', weight: 1 },
          { source: 'B', target: 'C', weight: 2 }
        ]
      };

      const graph = reconstructGraph(graphData);

      expect(graph.nodes.size).toBe(3);
      expect(graph.edges.length).toBe(2);
      expect(graph.hasNode('A')).toBe(true);
      expect(graph.hasNode('B')).toBe(true);
      expect(graph.hasNode('C')).toBe(true);
      expect(graph.hasEdge('A', 'B')).toBe(true);
      expect(graph.hasEdge('B', 'C')).toBe(true);
    });

    it('should handle {u, v} edge format', () => {
      const graphData = {
        nodes: ['A', 'B'],
        edges: [
          { u: 'A', v: 'B', weight: 1 }
        ]
      };

      const graph = reconstructGraph(graphData);

      expect(graph.nodes.size).toBe(2);
      expect(graph.edges.length).toBe(1);
      expect(graph.hasEdge('A', 'B')).toBe(true);
    });

    it('should handle edges without weight', () => {
      const graphData = {
        nodes: ['A', 'B'],
        edges: [
          { source: 'A', target: 'B' }
        ]
      };

      const graph = reconstructGraph(graphData);

      expect(graph.edges.length).toBe(1);
      const edge = graph.edges[0];
      expect(edge.weight).toBe(1); // default weight
    });

    it('should handle empty nodes and edges', () => {
      const graphData = {
        nodes: [],
        edges: []
      };

      const graph = reconstructGraph(graphData);

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.length).toBe(0);
    });

    it('should handle null graphData', () => {
      const graph = reconstructGraph(null);

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.length).toBe(0);
    });

    it('should handle undefined graphData', () => {
      const graph = reconstructGraph(undefined);

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.length).toBe(0);
    });

    it('should handle Set as nodes', () => {
      const graphData = {
        nodes: new Set(['A', 'B', 'C']),
        edges: []
      };

      const graph = reconstructGraph(graphData);

      expect(graph.nodes.size).toBe(3);
    });
  });

  describe('reportProgress', () => {
    it('should call callback with progress value', () => {
      let progressValue = null;
      const callback = (value) => { progressValue = value; };

      reportProgress(callback, 0.5);

      expect(progressValue).toBe(0.5);
    });

    it('should clamp progress to [0, 1]', () => {
      let progressValue = null;
      const callback = (value) => { progressValue = value; };

      reportProgress(callback, 1.5);
      expect(progressValue).toBe(1);

      reportProgress(callback, -0.5);
      expect(progressValue).toBe(0);
    });

    it('should handle null callback', () => {
      expect(() => {
        reportProgress(null, 0.5);
      }).not.toThrow();
    });

    it('should handle undefined callback', () => {
      expect(() => {
        reportProgress(undefined, 0.5);
      }).not.toThrow();
    });

    it('should handle non-function callback', () => {
      expect(() => {
        reportProgress('not a function', 0.5);
      }).not.toThrow();
    });
  });

  describe('bfs', () => {
    it('should perform BFS and return correct data structures', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = bfs(graph, 'A');

      expect(result.distance.get('A')).toBe(0);
      expect(result.distance.get('B')).toBe(1);
      expect(result.distance.get('C')).toBe(2);
      expect(result.distance.get('D')).toBe(3);

      expect(result.pathCount.get('A')).toBe(1);
      expect(result.pathCount.get('B')).toBe(1);
      expect(result.pathCount.get('C')).toBe(1);
      expect(result.pathCount.get('D')).toBe(1);

      expect(result.stack.length).toBe(4);
    });

    it('should handle graph with multiple paths', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('B', 'D');
      graph.addEdge('C', 'D');

      const result = bfs(graph, 'A');

      expect(result.distance.get('D')).toBe(2);
      expect(result.pathCount.get('D')).toBe(2); // Two paths: A->B->D and A->C->D
      expect(result.predecessors.get('D')).toEqual(expect.arrayContaining(['B', 'C']));
    });

    it('should handle disconnected nodes', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      // C is disconnected

      const result = bfs(graph, 'A');

      expect(result.distance.get('A')).toBe(0);
      expect(result.distance.get('B')).toBe(1);
      expect(result.distance.has('C')).toBe(false); // C is unreachable
    });

    it('should handle single node', () => {
      const graph = new Graph();
      graph.addNode('A');

      const result = bfs(graph, 'A');

      expect(result.distance.get('A')).toBe(0);
      expect(result.pathCount.get('A')).toBe(1);
      expect(result.stack).toEqual(['A']);
    });
  });

  describe('bfsDistances', () => {
    it('should compute distances from source', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const distances = bfsDistances(graph, 'A');

      expect(distances.get('A')).toBe(0);
      expect(distances.get('B')).toBe(1);
      expect(distances.get('C')).toBe(2);
      expect(distances.get('D')).toBe(3);
    });

    it('should not include unreachable nodes', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      // C is disconnected

      const distances = bfsDistances(graph, 'A');

      expect(distances.has('C')).toBe(false);
    });

    it('should handle single node', () => {
      const graph = new Graph();
      graph.addNode('A');

      const distances = bfsDistances(graph, 'A');

      expect(distances.get('A')).toBe(0);
      expect(distances.size).toBe(1);
    });
  });

  describe('clusteringCoefficient', () => {
    it('should calculate clustering coefficient for triangle', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const coeff = clusteringCoefficient(graph, 'A');

      expect(coeff).toBe(1); // Perfect triangle
    });

    it('should return 0 for node with no triangles', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      // B and C are not connected

      const coeff = clusteringCoefficient(graph, 'A');

      expect(coeff).toBe(0);
    });

    it('should return 0 for node with less than 2 neighbors', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B']);
      graph.addEdge('A', 'B');

      const coeff = clusteringCoefficient(graph, 'A');

      expect(coeff).toBe(0);
    });

    it('should return 0 for isolated node', () => {
      const graph = new Graph();
      graph.addNode('A');

      const coeff = clusteringCoefficient(graph, 'A');

      expect(coeff).toBe(0);
    });

    it('should calculate partial clustering', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');
      graph.addEdge('B', 'C'); // One triangle: A-B-C

      const coeff = clusteringCoefficient(graph, 'A');

      // A has 3 neighbors (B, C, D)
      // Possible pairs: 3
      // Connected pairs: 1 (B-C)
      // Coefficient: 1/3 ≈ 0.333
      expect(coeff).toBeCloseTo(0.333, 2);
    });
  });

  describe('countTriangles', () => {
    it('should count triangles for node in triangle', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const count = countTriangles(graph, 'A');

      expect(count).toBe(1);
    });

    it('should return 0 for node with no triangles', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');

      const count = countTriangles(graph, 'A');

      expect(count).toBe(0);
    });

    it('should count multiple triangles', () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const count = countTriangles(graph, 'A');

      // Two triangles: A-B-C and A-C-D
      expect(count).toBe(2);
    });

    it('should return 0 for isolated node', () => {
      const graph = new Graph();
      graph.addNode('A');

      const count = countTriangles(graph, 'A');

      expect(count).toBe(0);
    });
  });

  describe('normalize', () => {
    it('should normalize a vector', () => {
      const vector = { x: 3, y: 4 };

      const normalized = normalize(vector);

      // 3^2 + 4^2 = 25, sqrt(25) = 5
      // Normalized: {x: 3/5, y: 4/5}
      expect(normalized.x).toBeCloseTo(0.6, 5);
      expect(normalized.y).toBeCloseTo(0.8, 5);
    });

    it('should normalize vector in-place', () => {
      const vector = { x: 3, y: 4 };

      const result = normalize(vector);

      expect(result).toBe(vector); // Same reference
    });

    it('should handle zero vector', () => {
      const vector = { x: 0, y: 0 };

      const normalized = normalize(vector);

      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });

    it('should handle unit vector', () => {
      const vector = { x: 1, y: 0 };

      const normalized = normalize(vector);

      expect(normalized.x).toBeCloseTo(1, 5);
      expect(normalized.y).toBeCloseTo(0, 5);
    });

    it('should normalize multi-dimensional vector', () => {
      const vector = { a: 1, b: 2, c: 2 };

      const normalized = normalize(vector);

      // 1^2 + 2^2 + 2^2 = 1 + 4 + 4 = 9, sqrt(9) = 3
      expect(normalized.a).toBeCloseTo(1/3, 5);
      expect(normalized.b).toBeCloseTo(2/3, 5);
      expect(normalized.c).toBeCloseTo(2/3, 5);
    });
  });

  describe('l1Distance', () => {
    it('should calculate L1 distance', () => {
      const v1 = { x: 1, y: 2 };
      const v2 = { x: 4, y: 6 };

      const distance = l1Distance(v1, v2);

      // |1-4| + |2-6| = 3 + 4 = 7
      expect(distance).toBe(7);
    });

    it('should handle zero distance', () => {
      const v1 = { x: 1, y: 2 };
      const v2 = { x: 1, y: 2 };

      const distance = l1Distance(v1, v2);

      expect(distance).toBe(0);
    });

    it('should handle negative values', () => {
      const v1 = { x: -1, y: -2 };
      const v2 = { x: 1, y: 2 };

      const distance = l1Distance(v1, v2);

      // |-1-1| + |-2-2| = 2 + 4 = 6
      expect(distance).toBe(6);
    });

    it('should handle missing keys in second vector', () => {
      const v1 = { x: 1, y: 2, z: 3 };
      const v2 = { x: 4, y: 6 };

      const distance = l1Distance(v1, v2);

      // |1-4| + |2-6| + |3-0| = 3 + 4 + 3 = 10
      expect(distance).toBe(10);
    });

    it('should handle single dimension', () => {
      const v1 = { x: 5 };
      const v2 = { x: 2 };

      const distance = l1Distance(v1, v2);

      expect(distance).toBe(3);
    });

    it('should handle empty vectors', () => {
      const v1 = {};
      const v2 = {};

      const distance = l1Distance(v1, v2);

      expect(distance).toBe(0);
    });
  });
});
