import { describe, test, expect } from 'vitest';
import { Louvain } from './louvain.js';
import { Connection } from './connection.js';

describe('Louvain community detection', () => {
  test('basic triangle network', () => {
    const nodes = ['id1', 'id2', 'id3'];
    const edges = [
      new Connection('id1', 'id2'),
      new Connection('id2', 'id3'), 
      new Connection('id3', 'id1')
    ];

    const louvain = new Louvain();
    louvain.setNodes(nodes);
    louvain.setEdges(edges);
    
    const communities = louvain.execute();
    
    // In a simple triangle, all nodes should be in the same community
    expect(communities['id1']).toBeDefined();
    expect(communities['id2']).toBeDefined();
    expect(communities['id3']).toBeDefined();
    expect(communities['id1']).toEqual(communities['id2']);
    expect(communities['id2']).toEqual(communities['id3']);
  });

  test('two separate communities', () => {
    const nodes = ['id1', 'id2', 'id3', 'id4', 'id5', 'id6'];
    const edges = [
      // First triangle
      new Connection('id1', 'id2'),
      new Connection('id2', 'id3'),
      new Connection('id3', 'id1'),
      // Second triangle
      new Connection('id4', 'id5'),
      new Connection('id5', 'id6'),
      new Connection('id6', 'id4'),
      // Weak connection between triangles
      new Connection('id1', 'id4', 0.1)
    ];

    const louvain = new Louvain();
    louvain.setNodes(nodes);
    louvain.setEdges(edges);
    
    const communities = louvain.execute();
    
    // Nodes in first triangle should be in same community
    expect(communities['id1']).toEqual(communities['id2']);
    expect(communities['id2']).toEqual(communities['id3']);
    
    // Nodes in second triangle should be in same community
    expect(communities['id4']).toEqual(communities['id5']);
    expect(communities['id5']).toEqual(communities['id6']);
    
    // Communities should be different
    expect(communities['id1']).not.toEqual(communities['id4']);
  });

  test('error handling', () => {
    const louvain = new Louvain();
    
    // Should throw error when trying to set edges before nodes
    expect(() => {
      louvain.setEdges([new Connection('id1', 'id2')]);
    }).toThrow('Please provide the graph nodes first!');
  });
  test('should handle empty graph', () => {
    const louvain = new Louvain();
    const nodes = [];
    const edges = [];
    
    louvain.setNodes(nodes);
    louvain.setEdges(edges);
    
    const communities = louvain.execute();
    expect(communities).toEqual({});
  });

  test('should handle graph with only nodes', () => {
    const louvain = new Louvain();
    const nodes = ['A', 'B', 'C'];
    const edges = [];
    
    louvain.setNodes(nodes);
    louvain.setEdges(edges);
    
    const communities = louvain.execute();
    expect(communities['A']).toBe('A');
    expect(communities['B']).toBe('B');
    expect(communities['C']).toBe('C');
  });

  test('should handle initial partition', () => {
    const louvain = new Louvain();
    const nodes = ['A', 'B', 'C', 'D'];
    const edges = [
      new Connection('A', 'B', 2),
      new Connection('B', 'C', 2),
      new Connection('C', 'D', 2),
      new Connection('D', 'A', 2)
    ];
    
    const initialPartition = {
      'A': 0,
      'B': 0,
      'C': 1,
      'D': 1
    };
    
    louvain.setNodes(nodes);
    louvain.setEdges(edges);
    louvain.setPartitionInit(initialPartition);
    
    const communities = louvain.execute();
    
    // With this initial partition and equal weights,
    // algorithm should maintain the two communities
    expect(communities['A']).toEqual(communities['B']);
    expect(communities['C']).toEqual(communities['D']);
    expect(communities['A']).not.toEqual(communities['C']);
  });

  test('should throw error for negative weights', () => {
    const louvain = new Louvain();
    const nodes = ['A', 'B'];
    const edges = [
      new Connection('A', 'B', -1) // Negative weight
    ];
    
    louvain.setNodes(nodes);
    louvain.setEdges(edges);
    
    expect(() => {
      louvain.execute();
    }).toThrow('Bad graph type, use positive weights');
  });

  test('should handle self-loops', () => {
    const louvain = new Louvain();
    const nodes = ['A', 'B'];
    const edges = [
      new Connection('A', 'A', 1), // Self-loop
      new Connection('A', 'B', 0.5)
    ];
    
    louvain.setNodes(nodes);
    louvain.setEdges(edges);
    
    const communities = louvain.execute();
    expect(communities).toBeDefined();
  });
});
