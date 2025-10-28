import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { bfsCompute } from './bfs.js';

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

describe('BFS Layout', () => {
  it('should arrange tree in layers', async () => {
    const graph = new Graph();
    // Binary tree: root 0, children 1,2, grandchildren 3,4,5,6
    graph.addNodesFrom(['0', '1', '2', '3', '4', '5', '6']);
    graph.addEdge('0', '1');
    graph.addEdge('0', '2');
    graph.addEdge('1', '3');
    graph.addEdge('1', '4');
    graph.addEdge('2', '5');
    graph.addEdge('2', '6');

    const positions = await bfsCompute(createGraphData(graph), {
      startNode: '0',
      scale: 100
    });

    expect(Object.keys(positions).length).toBe(7);

    const xCoords = Object.values(positions).map(p => p.x);
    const yCoords = Object.values(positions).map(p => p.y);

    xCoords.forEach(x => expect(isFinite(x)).toBe(true));
    yCoords.forEach(y => expect(isFinite(y)).toBe(true));

    // Layers should be spread along one axis
    const xRange = Math.max(...xCoords) - Math.min(...xCoords);
    const yRange = Math.max(...yCoords) - Math.min(...yCoords);

    expect(Math.max(xRange, yRange)).toBeGreaterThan(50);
  });

  it('should handle disconnected graphs', async () => {
    const graph = new Graph();
    graph.addNodesFrom(['0', '1', '2', '3']);
    graph.addEdge('0', '1');
    // Node 2 and 3 are disconnected

    const positions = await bfsCompute(createGraphData(graph), {
      startNode: '0',
      scale: 100
    });

    // Should still position all nodes
    expect(Object.keys(positions).length).toBe(4);
  });
});
