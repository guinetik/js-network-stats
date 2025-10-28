import { describe, it, expect } from 'vitest';
import { Graph } from '../graph.js';
import { kamadaKawaiCompute } from './kamada-kawai.js';

describe('Kamada-Kawai Layout', () => {
  it('should not collapse nodes to center - simple path graph', async () => {
    // Create simple path: 0-1-2-3-4-5
    const graph = new Graph();
    for (let i = 0; i < 6; i++) {
      graph.addNode(i.toString());
    }
    for (let i = 0; i < 5; i++) {
      graph.addEdge(i.toString(), (i + 1).toString());
    }

    const graphData = {
      nodes: Array.from(graph.nodes),
      edges: graph.edges.map(edge => ({
        source: edge.u,
        target: edge.v,
        weight: edge.weight
      })),
      adjacency: Object.fromEntries(graph.adjacencyMap)
    };

    const positions = await kamadaKawaiCompute(graphData, {
      iterations: 1000,
      scale: 100,
      center: { x: 0, y: 0 }
    });

    // Check that nodes are distributed (not all at origin)
    const xCoords = Object.values(positions).map(p => p.x);
    const yCoords = Object.values(positions).map(p => p.y);

    const xRange = Math.max(...xCoords) - Math.min(...xCoords);
    const yRange = Math.max(...yCoords) - Math.min(...yCoords);

    expect(xRange).toBeGreaterThan(10); // Should have some spread
    expect(yRange).toBeGreaterThan(10);
  });

  it('should not collapse nodes to center - karate club graph', async () => {
    // Create karate club graph
    const graph = new Graph();

    // Add 34 nodes
    for (let i = 0; i < 34; i++) {
      graph.addNode(i.toString());
    }

    // Add edges from karate club (sample)
    const karateEdges = [
      [0, 1, 4], [0, 2, 5], [0, 3, 3], [0, 4, 3], [0, 5, 3],
      [0, 6, 3], [0, 7, 2], [0, 8, 2], [0, 10, 2], [0, 11, 3],
      [0, 12, 1], [0, 13, 3], [0, 17, 2], [0, 19, 2], [0, 21, 2],
      [0, 31, 2], [1, 2, 6], [1, 3, 3], [1, 7, 4], [1, 13, 5],
      [1, 17, 1], [1, 19, 2], [1, 21, 2], [1, 30, 2], [2, 3, 3],
      [2, 7, 4], [2, 8, 5], [2, 9, 1], [2, 13, 3], [2, 27, 2],
      [2, 28, 2], [2, 32, 2], [3, 7, 3], [3, 12, 3], [3, 13, 3],
      [4, 6, 2], [4, 10, 3], [5, 6, 5], [5, 10, 3], [5, 16, 3],
      [6, 16, 3], [8, 30, 3], [8, 32, 3], [8, 33, 4], [9, 33, 2],
      [13, 33, 3], [14, 32, 3], [14, 33, 2], [15, 32, 3], [15, 33, 4],
      [18, 32, 1], [18, 33, 2], [19, 33, 1], [20, 32, 3], [20, 33, 1],
      [22, 32, 2], [22, 33, 3], [23, 25, 5], [23, 27, 4], [23, 29, 3],
      [23, 32, 5], [23, 33, 4], [24, 25, 2], [24, 27, 3], [24, 31, 2],
      [25, 31, 7], [26, 29, 4], [26, 33, 2], [27, 33, 4], [28, 31, 2],
      [28, 33, 2], [29, 32, 4], [29, 33, 2], [30, 32, 3], [30, 33, 3],
      [31, 32, 4], [31, 33, 4], [32, 33, 5]
    ];

    karateEdges.forEach(([source, target, weight]) => {
      graph.addEdge(source.toString(), target.toString(), weight);
    });

    const graphData = {
      nodes: Array.from(graph.nodes),
      edges: graph.edges.map(edge => ({
        source: edge.u,
        target: edge.v,
        weight: edge.weight
      })),
      adjacency: Object.fromEntries(graph.adjacencyMap)
    };

    const positions = await kamadaKawaiCompute(graphData, {
      iterations: 1000,
      scale: 100,
      center: { x: 0, y: 0 }
    });

    console.log('\n=== Karate Club Layout Test ===');
    console.log('Sample positions:');
    ['0', '1', '2', '33'].forEach(nodeId => {
      const pos = positions[nodeId];
      console.log(`  Node ${nodeId}: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
    });

    // Check distribution
    const xCoords = Object.values(positions).map(p => p.x);
    const yCoords = Object.values(positions).map(p => p.y);

    const xMin = Math.min(...xCoords);
    const xMax = Math.max(...xCoords);
    const yMin = Math.min(...yCoords);
    const yMax = Math.max(...yCoords);
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    console.log('\nBounding box:');
    console.log(`  X: [${xMin.toFixed(2)}, ${xMax.toFixed(2)}] range: ${xRange.toFixed(2)}`);
    console.log(`  Y: [${yMin.toFixed(2)}, ${yMax.toFixed(2)}] range: ${yRange.toFixed(2)}`);

    // Check if all nodes collapsed to center
    const allAtCenter = xRange < 1 && yRange < 1;
    if (allAtCenter) {
      console.log('\n❌ FAIL: All nodes collapsed to center!');
    } else {
      console.log('\n✓ PASS: Nodes properly distributed');
    }

    expect(xRange).toBeGreaterThan(10);
    expect(yRange).toBeGreaterThan(10);
  });
});
