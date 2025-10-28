import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { forceDirectedCompute } from './force-directed.js';

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

describe('Force-Directed Layout', () => {
  it('should simulate physical forces', async () => {
    const graph = new Graph();
    for (let i = 0; i < 5; i++) {
      graph.addNode(i.toString());
    }
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 5; j++) {
        graph.addEdge(i.toString(), j.toString());
      }
    }

    const positions = await forceDirectedCompute(createGraphData(graph), {
      iterations: 100,
      scale: 100,
      center: { x: 0, y: 0 }
    });

    expect(Object.keys(positions).length).toBe(5);

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

    const positions = await forceDirectedCompute(createGraphData(graph), {
      iterations: 50,
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(1);
    expect(isFinite(positions['0'].x)).toBe(true);
    expect(isFinite(positions['0'].y)).toBe(true);
  });
});
