import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { multipartiteCompute } from './multipartite.js';

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

describe('Multipartite Layout', () => {
  it('should arrange nodes in multiple layers (vertical)', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D', 'E', 'F']);
    graph.addEdge('A', 'D');

    const positions = await multipartiteCompute(createGraphData(graph), {
      subsets: {
        0: ['A', 'B'],
        1: ['C'],
        2: ['D', 'E', 'F']
      },
      align: 'vertical',
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(6);

    // Check that all positions are finite
    Object.values(positions).forEach(pos => {
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
    });

    // Get x coordinates for each layer
    const layer0X = [positions['A'].x, positions['B'].x];
    const layer1X = [positions['C'].x];
    const layer2X = [positions['D'].x, positions['E'].x, positions['F'].x];

    // In vertical mode, nodes in same layer should have similar x coordinates
    const layer0XUnique = new Set(layer0X.map(x => Math.round(x * 10)));
    const layer1XUnique = new Set(layer1X.map(x => Math.round(x * 10)));
    const layer2XUnique = new Set(layer2X.map(x => Math.round(x * 10)));

    expect(layer0XUnique.size).toBe(1); // All layer0 nodes have same x
    expect(layer1XUnique.size).toBe(1); // All layer1 nodes have same x
    expect(layer2XUnique.size).toBe(1); // All layer2 nodes have same x

    // Different layers should have different x coordinates
    const avgX0 = layer0X[0];
    const avgX1 = layer1X[0];
    const avgX2 = layer2X[0];

    expect(avgX0).not.toBeCloseTo(avgX1, 0);
    expect(avgX1).not.toBeCloseTo(avgX2, 0);
  });

  it('should arrange nodes in multiple layers (horizontal)', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);

    const positions = await multipartiteCompute(createGraphData(graph), {
      subsets: {
        0: ['A', 'B'],
        1: ['C', 'D']
      },
      align: 'horizontal',
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(4);

    // Get y coordinates for each layer
    const layer0Y = [positions['A'].y, positions['B'].y];
    const layer1Y = [positions['C'].y, positions['D'].y];

    // In horizontal mode, nodes in same layer should have similar y coordinates
    const layer0YUnique = new Set(layer0Y.map(y => Math.round(y * 10)));
    const layer1YUnique = new Set(layer1Y.map(y => Math.round(y * 10)));

    expect(layer0YUnique.size).toBe(1); // All layer0 nodes have same y
    expect(layer1YUnique.size).toBe(1); // All layer1 nodes have same y
  });

  it('should auto-partition when no subsets provided', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D', 'E', 'F']);

    const positions = await multipartiteCompute(createGraphData(graph), {
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(6);

    // Check that all positions are finite
    Object.values(positions).forEach(pos => {
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
    });
  });

  it('should handle single node', async () => {
    const graph = new Graph();
    graph.addNode('A');

    const positions = await multipartiteCompute(createGraphData(graph), {
      scale: 100,
      center: { x: 10, y: 20 }
    });

    expect(Object.keys(positions).length).toBe(1);
    expect(positions['A'].x).toBe(10);
    expect(positions['A'].y).toBe(20);
  });

  it('should handle empty graph', async () => {
    const graph = new Graph();

    const positions = await multipartiteCompute(createGraphData(graph), {
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(0);
  });

  it('should respect custom center', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);

    const positions = await multipartiteCompute(createGraphData(graph), {
      subsets: {
        0: ['A', 'B'],
        1: ['C', 'D']
      },
      scale: 50,
      center: { x: 100, y: 200 }
    });

    // Center should be applied
    const avgX = Object.values(positions).reduce((sum, p) => sum + p.x, 0) / 4;
    const avgY = Object.values(positions).reduce((sum, p) => sum + p.y, 0) / 4;

    expect(Math.abs(avgX - 100)).toBeLessThan(5);
    expect(Math.abs(avgY - 200)).toBeLessThan(5);
  });

  it('should scale positions correctly', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);

    const positions1 = await multipartiteCompute(createGraphData(graph), {
      subsets: {
        0: ['A', 'B'],
        1: ['C', 'D']
      },
      scale: 50
    });

    const positions2 = await multipartiteCompute(createGraphData(graph), {
      subsets: {
        0: ['A', 'B'],
        1: ['C', 'D']
      },
      scale: 100
    });

    // Larger scale should result in larger distances
    const dist1 = Math.abs(positions1['A'].x - positions1['C'].x);
    const dist2 = Math.abs(positions2['A'].x - positions2['C'].x);

    expect(dist2).toBeGreaterThan(dist1);
  });

  it('should handle non-sequential subset keys', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);

    const positions = await multipartiteCompute(createGraphData(graph), {
      subsets: {
        5: ['A'],
        2: ['B', 'C'],
        10: ['D']
      },
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(4);

    // Should sort by numeric key: 2, 5, 10
    const xCoords = [
      positions['B'].x, // subset 2
      positions['A'].x, // subset 5
      positions['D'].x  // subset 10
    ];

    // X coordinates should be in ascending order
    expect(xCoords[1]).toBeGreaterThan(xCoords[0]);
    expect(xCoords[2]).toBeGreaterThan(xCoords[1]);
  });

  it('should handle varying layer sizes', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

    const positions = await multipartiteCompute(createGraphData(graph), {
      subsets: {
        0: ['A'],
        1: ['B', 'C'],
        2: ['D', 'E', 'F', 'G', 'H']
      },
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(8);

    // Nodes in larger layers should be spread out more on y-axis
    const layer0YSpread = 0; // Single node
    const layer1YSpread = Math.abs(positions['B'].y - positions['C'].y);
    const layer2YCoords = ['D', 'E', 'F', 'G', 'H'].map(id => positions[id].y);
    const layer2YSpread = Math.max(...layer2YCoords) - Math.min(...layer2YCoords);

    expect(layer1YSpread).toBeGreaterThan(layer0YSpread);
    // Layer 2 should have spread at least as large as layer 1
    expect(layer2YSpread).toBeGreaterThanOrEqual(layer1YSpread);
  });

  it('should handle three layers', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D', 'E', 'F']);

    const positions = await multipartiteCompute(createGraphData(graph), {
      subsets: {
        0: ['A', 'B'],
        1: ['C', 'D'],
        2: ['E', 'F']
      },
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(6);

    // Three distinct x positions (one per layer)
    const xCoords = Object.values(positions).map(p => p.x);
    const uniqueX = new Set(xCoords.map(x => Math.round(x * 10)));

    expect(uniqueX.size).toBe(3);
  });
});
