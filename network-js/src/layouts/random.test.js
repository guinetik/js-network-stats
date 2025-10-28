import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { randomCompute } from './random.js';

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

describe('Random Layout', () => {
  it('should place nodes randomly', async () => {
    const graph = new Graph();
    for (let i = 0; i < 6; i++) {
      graph.addNode(i.toString());
    }

    const positions = await randomCompute(createGraphData(graph), {
      scale: 100,
      center: { x: 0, y: 0 }
    });

    expect(Object.keys(positions).length).toBe(6);

    const xCoords = Object.values(positions).map(p => p.x);
    const yCoords = Object.values(positions).map(p => p.y);

    xCoords.forEach(x => expect(isFinite(x)).toBe(true));
    yCoords.forEach(y => expect(isFinite(y)).toBe(true));
  });

  it('should produce different results on multiple runs', async () => {
    const graph = new Graph();
    for (let i = 0; i < 6; i++) {
      graph.addNode(i.toString());
    }
    const graphData = createGraphData(graph);

    const positions1 = await randomCompute(graphData, { scale: 100 });
    const positions2 = await randomCompute(graphData, { scale: 100 });

    const keys = Object.keys(positions1);
    const hasDifference = keys.some(key =>
      positions1[key].x !== positions2[key].x ||
      positions1[key].y !== positions2[key].y
    );

    expect(hasDifference).toBe(true);
  });
});
