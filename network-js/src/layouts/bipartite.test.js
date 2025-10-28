import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { bipartiteCompute } from './bipartite.js';

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

describe('Bipartite Layout', () => {
  it('should arrange nodes in two parallel lines (vertical)', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D', 'E', 'F']);
    graph.addEdge('A', 'D');
    graph.addEdge('B', 'E');
    graph.addEdge('C', 'F');

    const positions = await bipartiteCompute(createGraphData(graph), {
      partition: ['A', 'B', 'C'],
      align: 'vertical',
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(6);

    // Check that all positions are finite
    Object.values(positions).forEach(pos => {
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
    });

    // Get x coordinates for each set
    const set1X = [positions['A'].x, positions['B'].x, positions['C'].x];
    const set2X = [positions['D'].x, positions['E'].x, positions['F'].x];

    // In vertical mode, set1 should be on one side, set2 on the other
    const set1XUnique = new Set(set1X.map(x => Math.round(x * 100)));
    const set2XUnique = new Set(set2X.map(x => Math.round(x * 100)));

    expect(set1XUnique.size).toBe(1); // All set1 nodes have same x
    expect(set2XUnique.size).toBe(1); // All set2 nodes have same x
  });

  it('should arrange nodes in two parallel lines (horizontal)', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);
    graph.addEdge('A', 'C');
    graph.addEdge('B', 'D');

    const positions = await bipartiteCompute(createGraphData(graph), {
      partition: ['A', 'B'],
      align: 'horizontal',
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(4);

    // Get y coordinates for each set
    const set1Y = [positions['A'].y, positions['B'].y];
    const set2Y = [positions['C'].y, positions['D'].y];

    // In horizontal mode, set1 should be on one side, set2 on the other
    const set1YUnique = new Set(set1Y.map(y => Math.round(y * 100)));
    const set2YUnique = new Set(set2Y.map(y => Math.round(y * 100)));

    expect(set1YUnique.size).toBe(1); // All set1 nodes have same y
    expect(set2YUnique.size).toBe(1); // All set2 nodes have same y
  });

  it('should auto-partition when no partition provided', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);
    graph.addEdge('A', 'B');

    const positions = await bipartiteCompute(createGraphData(graph), {
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(4);

    // Check that all positions are finite
    Object.values(positions).forEach(pos => {
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
    });
  });

  it('should handle single node', async () => {
    const graph = new Graph();
    graph.addNode('A');

    const positions = await bipartiteCompute(createGraphData(graph), {
      scale: 100,
      center: { x: 10, y: 20 }
    });

    expect(Object.keys(positions).length).toBe(1);
    expect(positions['A'].x).toBe(10);
    expect(positions['A'].y).toBe(20);
  });

  it('should handle empty graph', async () => {
    const graph = new Graph();

    const positions = await bipartiteCompute(createGraphData(graph), {
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(0);
  });

  it('should respect custom center', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B']);

    const positions = await bipartiteCompute(createGraphData(graph), {
      partition: ['A'],
      scale: 50,
      center: { x: 100, y: 200 }
    });

    // Center should be applied
    const avgX = (positions['A'].x + positions['B'].x) / 2;
    const avgY = (positions['A'].y + positions['B'].y) / 2;

    expect(Math.abs(avgX - 100)).toBeLessThan(1);
    expect(Math.abs(avgY - 200)).toBeLessThan(1);
  });

  it('should scale positions correctly', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);

    const positions1 = await bipartiteCompute(createGraphData(graph), {
      partition: ['A', 'B'],
      scale: 50
    });

    const positions2 = await bipartiteCompute(createGraphData(graph), {
      partition: ['A', 'B'],
      scale: 100
    });

    // Larger scale should result in larger distances
    const dist1 = Math.abs(positions1['A'].x - positions1['C'].x);
    const dist2 = Math.abs(positions2['A'].x - positions2['C'].x);

    expect(dist2).toBeGreaterThan(dist1);
  });
});
