import { describe, it, expect, beforeEach } from 'vitest';
import { Layout } from './layout.js';
import { forceDirectedCompute } from './force-directed.js';
import { circularCompute } from './circular.js';
import Graph from '../graph.js';

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

describe('Layout (Abstract Base Class)', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);
    graph.addEdge('A', 'B', 1);
    graph.addEdge('B', 'C', 1);
    graph.addEdge('C', 'D', 1);
    graph.addEdge('D', 'A', 1);
  });

  it('should throw error if graph is not provided', () => {
    expect(() => new Layout(null, {}, { module: 'test', functionName: 'test' })).toThrow('Graph is required');
  });

  it('should store graph and options', () => {
    const options = { scale: 200, center: { x: 0, y: 0 } };
    const layout = new Layout(graph, options, { module: 'test', functionName: 'test' });

    expect(layout.graph).toBe(graph);
    expect(layout.options.scale).toBe(200);
    expect(layout.options.center).toEqual({ x: 0, y: 0 });
  });

  it('should provide convenience methods for nodes', () => {
    const layout = new Layout(graph, {}, { module: 'test', functionName: 'test' });
    expect(layout.getNodes()).toEqual(['A', 'B', 'C', 'D']);
    expect(layout.getNodeCount()).toBe(4);
  });

  it('should reset cached positions', () => {
    const layout = new Layout(graph, {}, { module: 'test', functionName: 'test' });
    layout._positions = { A: { x: 1, y: 2 } };

    layout.reset();

    expect(layout._positions).toBeNull();
  });
});

describe('Force-Directed Compute Function', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C']);
    graph.addEdge('A', 'B', 1);
    graph.addEdge('B', 'C', 1);
  });

  it('should compute positions for all nodes', async () => {
    const positions = await forceDirectedCompute(createGraphData(graph), {
      scale: 100,
      iterations: 10
    });

    expect(positions).toHaveProperty('A');
    expect(positions).toHaveProperty('B');
    expect(positions).toHaveProperty('C');

    // Check position format
    expect(positions.A).toHaveProperty('x');
    expect(positions.A).toHaveProperty('y');
    expect(typeof positions.A.x).toBe('number');
    expect(typeof positions.A.y).toBe('number');
  });

  it('should produce finite positions', async () => {
    const positions = await forceDirectedCompute(createGraphData(graph), {
      scale: 100,
      iterations: 20
    });

    Object.values(positions).forEach(pos => {
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
    });
  });

  it('should spread nodes apart', async () => {
    const positions = await forceDirectedCompute(createGraphData(graph), {
      iterations: 50,
      scale: 100
    });

    // Calculate minimum distance between any two nodes
    const nodes = Object.keys(positions);
    let minDist = Infinity;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(
          positions[nodes[i]].x - positions[nodes[j]].x,
          positions[nodes[i]].y - positions[nodes[j]].y
        );
        minDist = Math.min(minDist, dist);
      }
    }

    // Nodes should not be collapsed to same point
    expect(minDist).toBeGreaterThan(1);
  });
});

describe('Circular Compute Function', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);
    graph.addEdge('A', 'B', 1);
    graph.addEdge('B', 'C', 1);
    graph.addEdge('C', 'D', 1);
  });

  it('should compute positions for all nodes', async () => {
    const positions = await circularCompute(createGraphData(graph), {
      scale: 100
    });

    expect(positions).toHaveProperty('A');
    expect(positions).toHaveProperty('B');
    expect(positions).toHaveProperty('C');
    expect(positions).toHaveProperty('D');

    // Check position format
    expect(positions.A).toHaveProperty('x');
    expect(positions.A).toHaveProperty('y');
  });

  it('should arrange nodes in circle', async () => {
    const positions = await circularCompute(createGraphData(graph), {
      scale: 100,
      center: { x: 0, y: 0 }
    });

    // All nodes should be roughly equidistant from center
    const distances = Object.values(positions).map(pos =>
      Math.hypot(pos.x, pos.y)
    );

    // Check that distances are similar (circular layout)
    const avgDist = distances.reduce((a, b) => a + b) / distances.length;
    distances.forEach(dist => {
      expect(Math.abs(dist - avgDist)).toBeLessThan(avgDist * 0.1); // Within 10%
    });
  });

  it('should handle single node', async () => {
    const singleGraph = new Graph();
    singleGraph.addNode('X');

    const positions = await circularCompute(createGraphData(singleGraph), { scale: 100 });

    expect(positions).toHaveProperty('X');
    expect(isFinite(positions.X.x)).toBe(true);
    expect(isFinite(positions.X.y)).toBe(true);
  });

  it('should produce different positions for different graphs', async () => {
    const graph2 = new Graph();
    graph2.addNodesFrom(['X', 'Y']);

    const pos1 = await circularCompute(createGraphData(graph), { scale: 100 });
    const pos2 = await circularCompute(createGraphData(graph2), { scale: 100 });

    // Different number of nodes = different layouts
    expect(Object.keys(pos1).length).not.toBe(Object.keys(pos2).length);
  });
});
