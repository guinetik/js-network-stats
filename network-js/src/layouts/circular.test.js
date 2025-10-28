import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { circularCompute } from './circular.js';

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

describe('Circular Layout', () => {
  it('should place nodes in a circle', async () => {
    const graph = new Graph();
    for (let i = 0; i < 6; i++) {
      graph.addNode(i.toString());
    }
    for (let i = 0; i < 5; i++) {
      graph.addEdge(i.toString(), (i + 1).toString());
    }

    const positions = await circularCompute(createGraphData(graph), {
      scale: 100,
      center: { x: 0, y: 0 }
    });

    expect(Object.keys(positions).length).toBe(6);

    const xCoords = Object.values(positions).map(p => p.x);
    const yCoords = Object.values(positions).map(p => p.y);

    const xRange = Math.max(...xCoords) - Math.min(...xCoords);
    const yRange = Math.max(...yCoords) - Math.min(...yCoords);

    expect(xRange).toBeGreaterThan(50);
    expect(yRange).toBeGreaterThan(50);
  });

  it('should handle single node', async () => {
    const graph = new Graph();
    graph.addNode('0');

    const positions = await circularCompute(createGraphData(graph), { scale: 100 });

    expect(Object.keys(positions).length).toBe(1);
    expect(isFinite(positions['0'].x)).toBe(true);
    expect(isFinite(positions['0'].y)).toBe(true);
  });
});
