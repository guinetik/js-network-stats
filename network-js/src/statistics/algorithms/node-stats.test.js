import { describe, it, expect } from 'vitest';
import { Graph } from '../../graph.js';
import {
  degreeCompute,
  betweennessCompute,
  clusteringCompute,
  eigenvectorCompute,
  cliquesCompute,
  closenessCompute
} from './node-stats.js';

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

describe('node-stats', () => {
  describe('degreeCompute', () => {
    it('should calculate degree for all nodes', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await degreeCompute(createGraphData(graph), null, {});

      expect(result['A']).toBe(1);
      expect(result['B']).toBe(2);
      expect(result['C']).toBe(2);
      expect(result['D']).toBe(1);
    });

    it('should calculate degree for specific nodes', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');

      const result = await degreeCompute(createGraphData(graph), ['A', 'C'], {});

      expect(result['A']).toBe(1);
      expect(result['C']).toBe(1);
      expect(result['B']).toBeUndefined();
    });

    it('should handle isolated nodes', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');

      const result = await degreeCompute(createGraphData(graph), null, {});

      expect(result['C']).toBe(0);
    });

    it('should handle star graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');

      const result = await degreeCompute(createGraphData(graph), null, {});

      expect(result['A']).toBe(3); // Hub
      expect(result['B']).toBe(1);
      expect(result['C']).toBe(1);
      expect(result['D']).toBe(1);
    });
  });

  describe('clusteringCompute', () => {
    it('should calculate clustering coefficient', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const result = await clusteringCompute(createGraphData(graph), null, {});

      // Perfect triangle - all nodes should have coefficient 1
      expect(result['A']).toBe(1);
      expect(result['B']).toBe(1);
      expect(result['C']).toBe(1);
    });

    it('should return 0 for no triangles', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');

      const result = await clusteringCompute(createGraphData(graph), null, {});

      expect(result['A']).toBe(0); // B and C not connected
    });

    it('should return 0 for nodes with degree < 2', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B']);
      graph.addEdge('A', 'B');

      const result = await clusteringCompute(createGraphData(graph), null, {});

      expect(result['A']).toBe(0);
      expect(result['B']).toBe(0);
    });
  });

  describe('cliquesCompute', () => {
    it('should count triangles per node', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const result = await cliquesCompute(createGraphData(graph), null, {});

      // Each node participates in 1 triangle
      expect(result['A']).toBe(1);
      expect(result['B']).toBe(1);
      expect(result['C']).toBe(1);
    });

    it('should count multiple triangles', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await cliquesCompute(createGraphData(graph), null, {});

      // A participates in two triangles: A-B-C and A-C-D
      expect(result['A']).toBe(2);
    });

    it('should return 0 for no triangles', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');

      const result = await cliquesCompute(createGraphData(graph), null, {});

      expect(result['A']).toBe(0);
      expect(result['B']).toBe(0);
      expect(result['C']).toBe(0);
    });
  });

  describe('eigenvectorCompute', () => {
    it('should calculate eigenvector centrality', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await eigenvectorCompute(createGraphData(graph), null, {
        maxIter: 100,
        tolerance: 1e-6
      });

      // Middle nodes should have higher centrality
      expect(result['B']).toBeGreaterThan(result['A']);
      expect(result['C']).toBeGreaterThan(result['A']);
      expect(result['B']).toBeCloseTo(result['C'], 1);

      // All values should be between 0 and 1
      Object.values(result).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should handle star graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');

      const result = await eigenvectorCompute(createGraphData(graph), null, {});

      // Hub should have highest centrality
      expect(result['A']).toBeGreaterThan(result['B']);
      expect(result['A']).toBeGreaterThan(result['C']);
      expect(result['A']).toBeGreaterThan(result['D']);
    });

    it('should handle triangle graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const result = await eigenvectorCompute(createGraphData(graph), null, {});

      // All nodes should have similar centrality in symmetric triangle
      expect(result['A']).toBeCloseTo(result['B'], 1);
      expect(result['B']).toBeCloseTo(result['C'], 1);
    });
  });

  describe('betweennessCompute', () => {
    it('should calculate betweenness centrality', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await betweennessCompute(createGraphData(graph), null, {});

      // B and C are on more paths than endpoints
      expect(result['B']).toBeGreaterThan(result['A']);
      expect(result['C']).toBeGreaterThan(result['D']);

      // All values should be non-negative
      Object.values(result).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle star graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');

      const result = await betweennessCompute(createGraphData(graph), null, {});

      // Hub A should have highest betweenness (all paths go through it)
      expect(result['A']).toBeGreaterThan(result['B']);
      expect(result['A']).toBeGreaterThan(result['C']);
      expect(result['A']).toBeGreaterThan(result['D']);
    });

    it('should handle triangle graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      const result = await betweennessCompute(createGraphData(graph), null, {});

      // Values should be computed for all nodes
      expect(result['A']).toBeGreaterThanOrEqual(0);
      expect(result['B']).toBeGreaterThanOrEqual(0);
      expect(result['C']).toBeGreaterThanOrEqual(0);
    });

    it('should return non-negative values', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await betweennessCompute(createGraphData(graph), null, {});

      // All values should be non-negative
      Object.values(result).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('closenessCompute', () => {
    it('should calculate closeness centrality', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'D');

      const result = await closenessCompute(createGraphData(graph), null, {
        normalized: true
      });

      // Middle nodes should have higher closeness
      expect(result['B']).toBeGreaterThan(result['A']);
      expect(result['C']).toBeGreaterThan(result['A']);
      expect(result['B']).toBeCloseTo(result['C'], 5);
    });

    it('should handle star graph', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C', 'D']);
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('A', 'D');

      const result = await closenessCompute(createGraphData(graph), null, {
        normalized: true
      });

      // Hub should have highest closeness (distance 1 to all nodes)
      expect(result['A']).toBeGreaterThan(result['B']);
      expect(result['A']).toBeGreaterThan(result['C']);
      expect(result['A']).toBeGreaterThan(result['D']);

      // All leaves should have same closeness
      expect(result['B']).toBeCloseTo(result['C'], 5);
      expect(result['C']).toBeCloseTo(result['D'], 5);
    });

    it('should handle disconnected nodes', async () => {
      const graph = new Graph();
      graph.addNodesFrom(['A', 'B', 'C']);
      graph.addEdge('A', 'B');
      // C is disconnected

      const result = await closenessCompute(createGraphData(graph), null, {
        normalized: true
      });

      // C should have 0 closeness (can't reach other nodes)
      expect(result['C']).toBe(0);
    });

    it('should handle single node component', async () => {
      const graph = new Graph();
      graph.addNode('A');

      const result = await closenessCompute(createGraphData(graph), null, {
        normalized: true
      });

      expect(result['A']).toBe(0);
    });
  });
});
