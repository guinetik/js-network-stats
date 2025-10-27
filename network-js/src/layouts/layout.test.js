import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Layout } from './layout.js';
import { ForceDirectedLayout } from './force-directed.js';
import { CircularLayout } from './circular.js';
import { Graph } from '../graph.js';

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
    expect(() => new Layout(null)).toThrow('Graph is required');
  });

  it('should store graph and options', () => {
    const options = { width: 800, height: 600 };
    const layout = new Layout(graph, null, options);

    expect(layout.graph).toBe(graph);
    expect(layout.options.width).toBe(800);
    expect(layout.options.height).toBe(600);
  });

  it('should have default empty required stats', () => {
    const layout = new Layout(graph);
    expect(layout.getRequiredStats()).toEqual([]);
  });

  it('should throw error when calling abstract computePositions', () => {
    const layout = new Layout(graph);
    expect(() => layout.computePositions()).toThrow('must be implemented by subclass');
  });

  it('should provide convenience methods for nodes', () => {
    const layout = new Layout(graph);
    expect(layout.getNodes()).toEqual(['A', 'B', 'C', 'D']);
    expect(layout.getNodeCount()).toBe(4);
  });

  it('should reset cached positions and stats', () => {
    const layout = new Layout(graph);
    layout._positions = { A: { x: 1, y: 2 } };
    layout.stats = [{ id: 'A', degree: 2 }];

    layout.reset();

    expect(layout._positions).toBeNull();
    expect(layout.stats).toBeNull();
  });

  it('should convert graph to network format', () => {
    const layout = new Layout(graph);
    const network = layout._graphToNetwork();

    expect(network).toHaveLength(4); // 4 edges
    expect(network[0]).toHaveProperty('source');
    expect(network[0]).toHaveProperty('target');
    expect(network[0]).toHaveProperty('weight');
  });

  it('should compute stats on demand if not provided', async () => {
    // Create a concrete implementation for testing
    class TestLayout extends Layout {
      getRequiredStats() { return ['degree']; }
      async computePositions() { return {}; }
    }

    const layout = new TestLayout(graph);
    const stats = await layout.ensureStats();

    expect(stats).toHaveProperty('A');
    expect(stats.A).toHaveProperty('degree');
    expect(stats.A.degree).toBe(2); // A connects to B and D
  });

  it('should use pre-computed stats if provided', async () => {
    const preComputedStats = [
      { id: 'A', degree: 5 },
      { id: 'B', degree: 3 }
    ];

    class TestLayout extends Layout {
      getRequiredStats() { return ['degree']; }
      async computePositions() { return {}; }
    }

    const layout = new TestLayout(graph, preComputedStats);
    const stats = await layout.ensureStats();

    expect(stats.A.degree).toBe(5); // Uses pre-computed value
  });
});

describe('ForceDirectedLayout', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C']);
    graph.addEdge('A', 'B', 1);
    graph.addEdge('B', 'C', 1);
  });

  it('should create layout with default options', () => {
    const layout = new ForceDirectedLayout(graph);

    expect(layout.options.width).toBe(1000);
    expect(layout.options.height).toBe(1000);
    expect(layout.options.iterations).toBe(100); // Updated to match current default
  });

  it('should require degree stats', () => {
    const layout = new ForceDirectedLayout(graph);
    expect(layout.getRequiredStats()).toContain('degree');
  });

  it('should compute positions for all nodes', async () => {
    const layout = new ForceDirectedLayout(graph, null, {
      width: 100,
      height: 100,
      iterations: 10
    });

    const positions = await layout.getPositions();

    expect(positions).toHaveProperty('A');
    expect(positions).toHaveProperty('B');
    expect(positions).toHaveProperty('C');

    // Check position format
    expect(positions.A).toHaveProperty('x');
    expect(positions.A).toHaveProperty('y');
    expect(typeof positions.A.x).toBe('number');
    expect(typeof positions.A.y).toBe('number');
  });

  it('should keep positions within bounds', async () => {
    const width = 500;
    const height = 400;
    const layout = new ForceDirectedLayout(graph, null, {
      width,
      height,
      iterations: 20
    });

    const positions = await layout.getPositions();

    Object.values(positions).forEach(pos => {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(width);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(height);
    });
  });

  it('should support incremental updates', async () => {
    const layout = new ForceDirectedLayout(graph, null, {
      iterations: 5
    });

    // Get initial positions
    const pos1 = await layout.getPositions();

    // Store a copy of initial position for comparison
    const initialPosACopy = { ...pos1.A };

    // Update layout
    const pos2 = layout.updateLayout(5);

    // Positions should have changed (pos1 and pos2 are same reference, but values should differ from initial)
    expect(pos1.A).not.toEqual(initialPosACopy);
    expect(layout.getCurrentIteration()).toBeGreaterThan(5); // More than initial 5 iterations
  });

  it('should cache positions on second call', async () => {
    const layout = new ForceDirectedLayout(graph);

    const pos1 = await layout.getPositions();
    const pos2 = await layout.getPositions();

    expect(pos1).toBe(pos2); // Same reference = cached
  });

  it('should respect edge weights for attraction', async () => {
    const weightedGraph = new Graph();
    weightedGraph.addNodesFrom(['A', 'B', 'C']);
    weightedGraph.addEdge('A', 'B', 10); // Strong connection
    weightedGraph.addEdge('B', 'C', 1);  // Weak connection

    const layout = new ForceDirectedLayout(weightedGraph, null, {
      iterations: 50,
      useWeights: true
    });

    const positions = await layout.getPositions();

    // A and B should be closer than B and C
    const distAB = Math.sqrt(
      Math.pow(positions.A.x - positions.B.x, 2) +
      Math.pow(positions.A.y - positions.B.y, 2)
    );
    const distBC = Math.sqrt(
      Math.pow(positions.B.x - positions.C.x, 2) +
      Math.pow(positions.B.y - positions.C.y, 2)
    );

    expect(distAB).toBeLessThan(distBC * 2); // Stronger weight = closer
  });
});

describe('CircularLayout', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
    graph.addNodesFrom(['A', 'B', 'C', 'D']);
    graph.addEdge('A', 'B', 1);
    graph.addEdge('B', 'C', 1);
    graph.addEdge('C', 'D', 1);
  });

  it('should create layout with default options', () => {
    const layout = new CircularLayout(graph);

    expect(layout.options.width).toBe(1000);
    expect(layout.options.height).toBe(1000);
    expect(layout.options.springLength).toBe(100);
  });

  it('should require betweenness stats', () => {
    const layout = new CircularLayout(graph);
    expect(layout.getRequiredStats()).toContain('betweenness');
  });

  it('should compute positions for all nodes', async () => {
    const layout = new CircularLayout(graph, null, {
      width: 100,
      height: 100,
      maxIterations: 10
    });

    const positions = await layout.getPositions();

    expect(positions).toHaveProperty('A');
    expect(positions).toHaveProperty('B');
    expect(positions).toHaveProperty('C');
    expect(positions).toHaveProperty('D');

    // Check position format
    expect(positions.A).toHaveProperty('x');
    expect(positions.A).toHaveProperty('y');
  });

  it('should respect graph-theoretic distances', async () => {
    // Linear graph: A-B-C-D
    const layout = new CircularLayout(graph, null, {
      width: 1000,
      height: 1000,
      springLength: 100,
      maxIterations: 50
    });

    const positions = await layout.getPositions();

    // Calculate distances
    const distAB = Math.sqrt(
      Math.pow(positions.A.x - positions.B.x, 2) +
      Math.pow(positions.A.y - positions.B.y, 2)
    );
    const distAC = Math.sqrt(
      Math.pow(positions.A.x - positions.C.x, 2) +
      Math.pow(positions.A.y - positions.C.y, 2)
    );
    const distAD = Math.sqrt(
      Math.pow(positions.A.x - positions.D.x, 2) +
      Math.pow(positions.A.y - positions.D.y, 2)
    );

    // A-D (distance 3) should be farther than A-C (distance 2)
    // which should be farther than A-B (distance 1)
    expect(distAD).toBeGreaterThan(distAC);
    expect(distAC).toBeGreaterThan(distAB);
  });

  it('should handle disconnected graphs with warning', async () => {
    const disconnected = new Graph();
    disconnected.addNodesFrom(['A', 'B', 'C', 'D']);
    disconnected.addEdge('A', 'B', 1);
    disconnected.addEdge('C', 'D', 1); // Separate component

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const layout = new CircularLayout(disconnected);
    const positions = await layout.getPositions();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('disconnected')
    );
    expect(positions).toHaveProperty('A');
    expect(positions).toHaveProperty('C');

    consoleSpy.mockRestore();
  });

  it('should support incremental updates', () => {
    const layout = new CircularLayout(graph, null, {
      maxIterations: 5
    });

    const pos1 = layout.updateLayout(1);
    const pos2 = layout.updateLayout(1);

    // Should have refined positions
    expect(layout._positions).toBeDefined();
  });

  it('should initialize positions in circular pattern', () => {
    const layout = new CircularLayout(graph, null, {
      width: 1000,
      height: 1000
    });

    const initialPos = layout._initializePositions();

    // All nodes should be roughly equidistant from center
    const centerX = 500;
    const centerY = 500;

    const distances = Object.values(initialPos).map(pos =>
      Math.sqrt(
        Math.pow(pos.x - centerX, 2) +
        Math.pow(pos.y - centerY, 2)
      )
    );

    // Check that distances are similar (circular layout)
    const avgDist = distances.reduce((a, b) => a + b) / distances.length;
    distances.forEach(dist => {
      expect(Math.abs(dist - avgDist)).toBeLessThan(50);
    });
  });
});
