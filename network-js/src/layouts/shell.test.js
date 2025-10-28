import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { shellCompute } from './shell.js';

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

describe('Shell Layout', () => {
  it('should arrange nodes in concentric circles with custom shells', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D', 'E']);

    const positions = await shellCompute(createGraphData(graph), {
      nlist: [['A'], ['B', 'C', 'D', 'E']],
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(5);

    // Check that all positions are finite
    Object.values(positions).forEach(pos => {
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
    });

    // Center node should be close to origin
    const centerDist = Math.sqrt(positions['A'].x ** 2 + positions['A'].y ** 2);
    expect(centerDist).toBeLessThan(5);

    // Outer nodes should be farther from center
    const outerDist = Math.sqrt(positions['B'].x ** 2 + positions['B'].y ** 2);
    expect(outerDist).toBeGreaterThan(centerDist);
  });

  it('should auto-group nodes by degree', async () => {
    const graph = new Graph();
    // Create a star graph: A is hub (degree 4), others are leaves (degree 1)
    graph.addNodesFrom(['A', 'B', 'C', 'D', 'E']);
    graph.addEdge('A', 'B');
    graph.addEdge('A', 'C');
    graph.addEdge('A', 'D');
    graph.addEdge('A', 'E');

    const positions = await shellCompute(createGraphData(graph), {
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(5);

    // Hub node (A) should be in center
    const hubDist = Math.sqrt(positions['A'].x ** 2 + positions['A'].y ** 2);

    // Leaf nodes should be farther out
    const leafDistB = Math.sqrt(positions['B'].x ** 2 + positions['B'].y ** 2);
    const leafDistC = Math.sqrt(positions['C'].x ** 2 + positions['C'].y ** 2);

    expect(leafDistB).toBeGreaterThan(hubDist);
    expect(leafDistC).toBeGreaterThan(hubDist);
  });

  it('should handle single node', async () => {
    const graph = new Graph();
    graph.addNode('A');

    const positions = await shellCompute(createGraphData(graph), {
      scale: 100,
      center: { x: 10, y: 20 }
    });

    expect(Object.keys(positions).length).toBe(1);
    expect(positions['A'].x).toBe(10);
    expect(positions['A'].y).toBe(20);
  });

  it('should handle empty graph', async () => {
    const graph = new Graph();

    const positions = await shellCompute(createGraphData(graph), {
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(0);
  });

  it('should respect custom center', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C']);

    const positions = await shellCompute(createGraphData(graph), {
      nlist: [['A'], ['B', 'C']],
      scale: 50,
      center: { x: 100, y: 200 }
    });

    // Center node should be at custom center
    expect(Math.abs(positions['A'].x - 100)).toBeLessThan(1);
    expect(Math.abs(positions['A'].y - 200)).toBeLessThan(1);
  });

  it('should scale positions correctly', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);

    const positions1 = await shellCompute(createGraphData(graph), {
      nlist: [['A'], ['B', 'C', 'D']],
      scale: 50
    });

    const positions2 = await shellCompute(createGraphData(graph), {
      nlist: [['A'], ['B', 'C', 'D']],
      scale: 100
    });

    // Larger scale should result in larger radius
    const dist1 = Math.sqrt(positions1['B'].x ** 2 + positions1['B'].y ** 2);
    const dist2 = Math.sqrt(positions2['B'].x ** 2 + positions2['B'].y ** 2);

    expect(dist2).toBeGreaterThan(dist1);
  });

  it('should apply custom rotation', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C']);

    const positions1 = await shellCompute(createGraphData(graph), {
      nlist: [['A'], ['B', 'C']],
      scale: 100,
      rotate: 0
    });

    const positions2 = await shellCompute(createGraphData(graph), {
      nlist: [['A'], ['B', 'C']],
      scale: 100,
      rotate: Math.PI / 4
    });

    // Angles should be different
    const angle1 = Math.atan2(positions1['B'].y, positions1['B'].x);
    const angle2 = Math.atan2(positions2['B'].y, positions2['B'].x);

    expect(Math.abs(angle1 - angle2)).toBeGreaterThan(0.1);
  });

  it('should handle multiple shells with varying sizes', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D', 'E', 'F', 'G']);

    const positions = await shellCompute(createGraphData(graph), {
      nlist: [['A'], ['B', 'C'], ['D', 'E', 'F', 'G']],
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(7);

    // Calculate distances from center for each shell
    const shellDistances = [
      Math.sqrt(positions['A'].x ** 2 + positions['A'].y ** 2),
      Math.sqrt(positions['B'].x ** 2 + positions['B'].y ** 2),
      Math.sqrt(positions['D'].x ** 2 + positions['D'].y ** 2)
    ];

    // Distances should increase for outer shells
    expect(shellDistances[1]).toBeGreaterThan(shellDistances[0]);
    expect(shellDistances[2]).toBeGreaterThan(shellDistances[1]);
  });
});
