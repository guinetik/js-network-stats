import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { spiralCompute } from './spiral.js';

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

describe('Spiral Layout', () => {
  it('should place nodes in spiral pattern', async () => {
    const graph = new Graph();
    for (let i = 0; i < 10; i++) {
      graph.addNode(i.toString());
    }

    const positions = await spiralCompute(createGraphData(graph), {
      scale: 100,
      center: { x: 0, y: 0 }
    });

    expect(Object.keys(positions).length).toBe(10);

    const xCoords = Object.values(positions).map(p => p.x);
    const yCoords = Object.values(positions).map(p => p.y);

    xCoords.forEach(x => expect(isFinite(x)).toBe(true));
    yCoords.forEach(y => expect(isFinite(y)).toBe(true));

    const xRange = Math.max(...xCoords) - Math.min(...xCoords);
    const yRange = Math.max(...yCoords) - Math.min(...yCoords);

    expect(xRange).toBeGreaterThan(10);
    expect(yRange).toBeGreaterThan(10);
  });

  it('should handle single node', async () => {
    const graph = new Graph();
    graph.addNode('0');

    const positions = await spiralCompute(createGraphData(graph), { scale: 100 });

    expect(Object.keys(positions).length).toBe(1);
    expect(isFinite(positions['0'].x)).toBe(true);
    expect(isFinite(positions['0'].y)).toBe(true);
  });
});
