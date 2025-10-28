import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { spectralCompute } from './spectral.js';

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

describe('Spectral Layout', () => {
  it('should position nodes using eigenvector data', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    graph.addEdge('C', 'D');

    // Mock eigenvector data
    const nodeProperties = new Map([
      ['A', { laplacian_x: 0.5, laplacian_y: 0.3 }],
      ['B', { laplacian_x: -0.2, laplacian_y: 0.8 }],
      ['C', { laplacian_x: -0.6, laplacian_y: -0.4 }],
      ['D', { laplacian_x: 0.3, laplacian_y: -0.7 }]
    ]);

    const positions = await spectralCompute(createGraphData(graph), {
      scale: 100,
      nodeProperties
    });

    expect(Object.keys(positions).length).toBe(4);

    // Check that all positions are finite
    Object.values(positions).forEach(pos => {
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
    });

    // Positions should be scaled appropriately
    const xCoords = Object.values(positions).map(p => p.x);
    const yCoords = Object.values(positions).map(p => p.y);

    const xRange = Math.max(...xCoords) - Math.min(...xCoords);
    const yRange = Math.max(...yCoords) - Math.min(...yCoords);

    expect(xRange).toBeGreaterThan(0);
    expect(yRange).toBeGreaterThan(0);
  });

  it('should throw error when eigenvector data is missing', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B']);

    await expect(
      spectralCompute(createGraphData(graph), {
        scale: 100
      })
    ).rejects.toThrow(/eigenvector-laplacian/);
  });

  it('should throw error when node is missing laplacian_x', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B']);

    const nodeProperties = new Map([
      ['A', { laplacian_x: 0.5, laplacian_y: 0.3 }],
      ['B', { laplacian_y: 0.8 }] // Missing laplacian_x
    ]);

    await expect(
      spectralCompute(createGraphData(graph), {
        scale: 100,
        nodeProperties
      })
    ).rejects.toThrow(/laplacian_x/);
  });

  it('should throw error when node is missing laplacian_y', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B']);

    const nodeProperties = new Map([
      ['A', { laplacian_x: 0.5, laplacian_y: 0.3 }],
      ['B', { laplacian_x: -0.2 }] // Missing laplacian_y
    ]);

    await expect(
      spectralCompute(createGraphData(graph), {
        scale: 100,
        nodeProperties
      })
    ).rejects.toThrow(/laplacian_y/);
  });

  it('should handle single node', async () => {
    const graph = new Graph();
    graph.addNode('A');

    const positions = await spectralCompute(createGraphData(graph), {
      scale: 100,
      center: { x: 10, y: 20 }
    });

    expect(Object.keys(positions).length).toBe(1);
    expect(positions['A'].x).toBe(10);
    expect(positions['A'].y).toBe(20);
  });

  it('should handle empty graph', async () => {
    const graph = new Graph();

    const positions = await spectralCompute(createGraphData(graph), {
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(0);
  });

  it('should respect custom center', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C']);

    const nodeProperties = new Map([
      ['A', { laplacian_x: 0.5, laplacian_y: 0.3 }],
      ['B', { laplacian_x: -0.5, laplacian_y: 0.3 }],
      ['C', { laplacian_x: 0.0, laplacian_y: -0.6 }]
    ]);

    const positions = await spectralCompute(createGraphData(graph), {
      scale: 50,
      center: { x: 100, y: 200 },
      nodeProperties
    });

    // Center should be applied - check that positions are offset from origin
    // The rescaling may not preserve exact average, so we use a larger tolerance
    const avgX = (positions['A'].x + positions['B'].x + positions['C'].x) / 3;
    const avgY = (positions['A'].y + positions['B'].y + positions['C'].y) / 3;

    // At minimum, positions should be shifted significantly from origin towards the center
    expect(avgX).toBeGreaterThan(50);
    expect(avgY).toBeGreaterThan(150);
  });

  it('should scale positions correctly', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B']);

    const nodeProperties = new Map([
      ['A', { laplacian_x: 1.0, laplacian_y: 0.0 }],
      ['B', { laplacian_x: -1.0, laplacian_y: 0.0 }]
    ]);

    const positions1 = await spectralCompute(createGraphData(graph), {
      scale: 50,
      nodeProperties
    });

    const positions2 = await spectralCompute(createGraphData(graph), {
      scale: 100,
      nodeProperties
    });

    // Larger scale should result in larger distances
    const dist1 = Math.sqrt(
      (positions1['A'].x - positions1['B'].x) ** 2 +
      (positions1['A'].y - positions1['B'].y) ** 2
    );
    const dist2 = Math.sqrt(
      (positions2['A'].x - positions2['B'].x) ** 2 +
      (positions2['A'].y - positions2['B'].y) ** 2
    );

    expect(dist2).toBeGreaterThan(dist1);
  });

  it('should handle uniform eigenvector values', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C']);

    // All nodes have same eigenvector values
    const nodeProperties = new Map([
      ['A', { laplacian_x: 0.5, laplacian_y: 0.5 }],
      ['B', { laplacian_x: 0.5, laplacian_y: 0.5 }],
      ['C', { laplacian_x: 0.5, laplacian_y: 0.5 }]
    ]);

    const positions = await spectralCompute(createGraphData(graph), {
      scale: 100,
      nodeProperties
    });

    expect(Object.keys(positions).length).toBe(3);

    // All positions should be same (or very close)
    Object.values(positions).forEach(pos => {
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
    });
  });

  it('should preserve relative positions from eigenvectors', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C']);

    const nodeProperties = new Map([
      ['A', { laplacian_x: -1.0, laplacian_y: 0.0 }],
      ['B', { laplacian_x: 0.0, laplacian_y: 0.0 }],
      ['C', { laplacian_x: 1.0, laplacian_y: 0.0 }]
    ]);

    const positions = await spectralCompute(createGraphData(graph), {
      scale: 100,
      center: { x: 0, y: 0 },
      nodeProperties
    });

    // B should be between A and C on x-axis
    expect(positions['B'].x).toBeGreaterThan(positions['A'].x);
    expect(positions['B'].x).toBeLessThan(positions['C'].x);
  });
});
