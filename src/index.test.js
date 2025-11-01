/**
 * Integration tests for getNetworkStats
 */

import { describe, it, test, expect } from 'vitest';
import { getNetworkStats, FEATURES } from './index.js';

describe('getNetworkStats - Integration Tests', () => {
  const simpleNetwork = [
    { source: 'id1', target: 'id2' },
    { source: 'id2', target: 'id3' },
    { source: 'id3', target: 'id1' }
  ];

  describe('All features calculation', () => {
    test('should calculate all features with null parameter', () => {
      const stats = getNetworkStats(simpleNetwork, null, { verbose: false });

      expect(stats).toBeDefined();
      expect(stats.length).toBe(3);

      // Each node should have all features
      stats.forEach(node => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('degree');
        expect(node).toHaveProperty('eigenvector');
        expect(node).toHaveProperty('betweenness');
        expect(node).toHaveProperty('clustering');
        expect(node).toHaveProperty('cliques');
        expect(node).toHaveProperty('modularity');
      });
    });

    test('should calculate correct values for triangle graph', () => {
      const stats = getNetworkStats(simpleNetwork, null, { verbose: false });

      // Eigenvector - all nodes equal in a triangle
      expect(stats[0].eigenvector).toBeCloseTo(0.5773502691896257, 5);
      expect(stats[1].eigenvector).toBeCloseTo(0.5773502691896257, 5);
      expect(stats[2].eigenvector).toBeCloseTo(0.5773502691896257, 5);

      // Betweenness - no node is "between" others in a triangle
      expect(stats[0].betweenness).toBe(0);
      expect(stats[1].betweenness).toBe(0);
      expect(stats[2].betweenness).toBe(0);

      // Clustering - perfect triangle
      expect(stats[0].clustering).toBe(1);
      expect(stats[1].clustering).toBe(1);
      expect(stats[2].clustering).toBe(1);

      // Cliques
      expect(stats[0].cliques).toBe(1);
      expect(stats[1].cliques).toBe(1);
      expect(stats[2].cliques).toBe(1);

      // Degree - each node connected to 2 others
      expect(stats[0].degree).toBe(2);
      expect(stats[1].degree).toBe(2);
      expect(stats[2].degree).toBe(2);

      // Modularity - communities detected
      expect(stats[0].modularity).toBeDefined();
      expect(stats[1].modularity).toBeDefined();
      expect(stats[2].modularity).toBeDefined();
    });
  });

  describe('Individual feature calculations', () => {
    test('feature: degree', () => {
      const stats = getNetworkStats(simpleNetwork, [FEATURES.DEGREE], { verbose: false });

      expect(stats).toBeDefined();
      expect(stats[0].degree).toBe(2);
      expect(stats[1].degree).toBe(2);
      expect(stats[2].degree).toBe(2);

      // Should NOT have other features
      expect(stats[0].eigenvector).toBeUndefined();
      expect(stats[0].betweenness).toBeUndefined();
    });

    test('feature: eigenvector', () => {
      const stats = getNetworkStats(
        simpleNetwork,
        [FEATURES.EIGENVECTOR],
        { verbose: false, maxIter: 100000 }
      );

      expect(stats).toBeDefined();
      expect(stats[0].eigenvector).toBeCloseTo(0.5773502691896257, 5);
      expect(stats[1].eigenvector).toBeCloseTo(0.5773502691896257, 5);
      expect(stats[2].eigenvector).toBeCloseTo(0.5773502691896257, 5);
    });

    test('feature: betweenness', () => {
      const stats = getNetworkStats(simpleNetwork, [FEATURES.BETWEENNESS], { verbose: false });

      expect(stats).toBeDefined();
      expect(stats[0].betweenness).toBe(0);
      expect(stats[1].betweenness).toBe(0);
      expect(stats[2].betweenness).toBe(0);
    });

    test('feature: clustering', () => {
      const stats = getNetworkStats(simpleNetwork, [FEATURES.CLUSTERING], { verbose: false });

      expect(stats).toBeDefined();
      expect(stats[0].clustering).toBe(1);
      expect(stats[1].clustering).toBe(1);
      expect(stats[2].clustering).toBe(1);
    });

    test('feature: cliques', () => {
      const stats = getNetworkStats(simpleNetwork, [FEATURES.CLIQUES], { verbose: false });

      expect(stats).toBeDefined();
      expect(stats[0].cliques).toBe(1);
      expect(stats[1].cliques).toBe(1);
      expect(stats[2].cliques).toBe(1);
    });

    test('feature: modularity', () => {
      const stats = getNetworkStats(simpleNetwork, [FEATURES.MODULARITY], { verbose: false });

      expect(stats).toBeDefined();
      expect(stats[0]).toHaveProperty('modularity');
      expect(stats[1]).toHaveProperty('modularity');
      expect(stats[2]).toHaveProperty('modularity');
    });

    test('multiple features', () => {
      const stats = getNetworkStats(
        simpleNetwork,
        [FEATURES.DEGREE, FEATURES.CLUSTERING],
        { verbose: false }
      );

      expect(stats).toBeDefined();
      expect(stats[0]).toHaveProperty('degree');
      expect(stats[0]).toHaveProperty('clustering');
      expect(stats[0]).not.toHaveProperty('betweenness');
    });
  });

  describe('Input validation', () => {
    test('should throw on non-array network', () => {
      expect(() => getNetworkStats('not an array', [FEATURES.DEGREE]))
        .toThrow(TypeError);
      expect(() => getNetworkStats('not an array', [FEATURES.DEGREE]))
        .toThrow('Network must be an array');
    });

    test('should throw on empty network', () => {
      expect(() => getNetworkStats([], [FEATURES.DEGREE]))
        .toThrow('Network cannot be empty');
    });

    test('should throw on invalid feature name', () => {
      expect(() => getNetworkStats(simpleNetwork, ['invalid_feature']))
        .toThrow('Invalid feature');
    });

    test('should throw on empty features array', () => {
      expect(() => getNetworkStats(simpleNetwork, []))
        .toThrow('Features array cannot be empty');
    });

    test('should throw on edge without source', () => {
      const invalidNetwork = [{ target: 'B' }];
      expect(() => getNetworkStats(invalidNetwork, [FEATURES.DEGREE]))
        .toThrow('missing source or target');
    });

    test('should throw on edge without target', () => {
      const invalidNetwork = [{ source: 'A' }];
      expect(() => getNetworkStats(invalidNetwork, [FEATURES.DEGREE]))
        .toThrow('missing source or target');
    });
  });

  describe('Different graph structures', () => {
    test('star graph - hub and spoke', () => {
      const starNetwork = [
        { source: 'center', target: 'A' },
        { source: 'center', target: 'B' },
        { source: 'center', target: 'C' }
      ];

      const stats = getNetworkStats(starNetwork, [FEATURES.DEGREE], { verbose: false });

      const center = stats.find(n => n.id === 'center');
      expect(center.degree).toBe(3);

      const leaf = stats.find(n => n.id === 'A');
      expect(leaf.degree).toBe(1);
    });

    test('path graph - linear chain', () => {
      const pathNetwork = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'D' }
      ];

      const stats = getNetworkStats(pathNetwork, [FEATURES.BETWEENNESS], { verbose: false });

      // Middle nodes have higher betweenness
      const nodeB = stats.find(n => n.id === 'B');
      const nodeC = stats.find(n => n.id === 'C');
      expect(nodeB.betweenness).toBeGreaterThan(0);
      expect(nodeC.betweenness).toBeGreaterThan(0);

      // End nodes have zero betweenness
      const nodeA = stats.find(n => n.id === 'A');
      const nodeD = stats.find(n => n.id === 'D');
      expect(nodeA.betweenness).toBe(0);
      expect(nodeD.betweenness).toBe(0);
    });

    test('disconnected graph', () => {
      const disconnectedNetwork = [
        { source: 'A', target: 'B' },
        { source: 'C', target: 'D' }
      ];

      const stats = getNetworkStats(disconnectedNetwork, [FEATURES.DEGREE], { verbose: false });

      expect(stats).toHaveLength(4);
      stats.forEach(node => {
        expect(node.degree).toBe(1);
      });
    });

    test('ring graph', () => {
      const ringNetwork = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'D' },
        { source: 'D', target: 'A' }
      ];

      const stats = getNetworkStats(ringNetwork, [FEATURES.DEGREE], { verbose: false });

      // All nodes in ring have degree 2
      stats.forEach(node => {
        expect(node.degree).toBe(2);
      });
    });
  });

  describe('Options handling', () => {
    test('respects maxIter option', () => {
      const stats = getNetworkStats(
        simpleNetwork,
        [FEATURES.EIGENVECTOR],
        { maxIter: 1000, verbose: false }
      );

      expect(stats).toBeDefined();
      expect(stats[0]).toHaveProperty('eigenvector');
    });

    test('respects verbose: false', () => {
      expect(() => {
        getNetworkStats(simpleNetwork, [FEATURES.DEGREE], { verbose: false });
      }).not.toThrow();
    });

    test('respects verbose: true', () => {
      expect(() => {
        getNetworkStats(simpleNetwork, [FEATURES.DEGREE], { verbose: true });
      }).not.toThrow();
    });

    test('uses default options', () => {
      const stats = getNetworkStats(simpleNetwork, [FEATURES.DEGREE]);
      expect(stats).toBeDefined();
    });
  });

  describe('Weighted graphs', () => {
    test('accepts weighted edges', () => {
      const weightedNetwork = [
        { source: 'A', target: 'B', weight: 1.5 },
        { source: 'B', target: 'C', weight: 2.0 },
        { source: 'C', target: 'A', weight: 1.0 }
      ];

      const stats = getNetworkStats(weightedNetwork, [FEATURES.DEGREE], { verbose: false });

      expect(stats).toHaveLength(3);
      expect(stats[0]).toHaveProperty('degree');
    });

    test('rejects negative weights', () => {
      const invalidNetwork = [
        { source: 'A', target: 'B', weight: -1 }
      ];

      expect(() => getNetworkStats(invalidNetwork, [FEATURES.DEGREE]))
        .toThrow('weight must be non-negative');
    });

    test('rejects invalid weight types', () => {
      const invalidNetwork = [
        { source: 'A', target: 'B', weight: 'invalid' }
      ];

      expect(() => getNetworkStats(invalidNetwork, [FEATURES.DEGREE]))
        .toThrow('weight must be a valid number');
    });
  });

  describe('Node ID types', () => {
    test('handles numeric node IDs', () => {
      const numericNetwork = [
        { source: 1, target: 2 },
        { source: 2, target: 3 },
        { source: 3, target: 1 }
      ];

      const stats = getNetworkStats(numericNetwork, [FEATURES.DEGREE], { verbose: false });

      expect(stats).toHaveLength(3);
      expect(stats.map(n => n.id).sort()).toEqual([1, 2, 3]);
    });

    test('handles string node IDs', () => {
      const stringNetwork = [
        { source: 'Alice', target: 'Bob' },
        { source: 'Bob', target: 'Carol' }
      ];

      const stats = getNetworkStats(stringNetwork, [FEATURES.DEGREE], { verbose: false });

      expect(stats).toHaveLength(3);
      const ids = stats.map(n => n.id).sort();
      expect(ids).toEqual(['Alice', 'Bob', 'Carol']);
    });

    test('rejects invalid node ID types', () => {
      const invalidNetwork = [
        { source: {}, target: 'B' }
      ];

      expect(() => getNetworkStats(invalidNetwork, [FEATURES.DEGREE]))
        .toThrow('source must be a string or number');
    });
  });

  describe('Performance with larger graphs', () => {
    test('handles moderately large graphs', () => {
      // Create a ring graph with 50 nodes
      const largeNetwork = [];
      for (let i = 0; i < 50; i++) {
        largeNetwork.push({
          source: `node${i}`,
          target: `node${(i + 1) % 50}`
        });
      }

      const stats = getNetworkStats(largeNetwork, [FEATURES.DEGREE], { verbose: false });

      expect(stats).toHaveLength(50);
      // Ring graph: all nodes have degree 2
      stats.forEach(node => {
        expect(node.degree).toBe(2);
      });
    });
  });

  describe('FEATURES constant export', () => {
    test('exports FEATURES constant', () => {
      expect(FEATURES).toBeDefined();
      expect(FEATURES.DEGREE).toBe('degree');
      expect(FEATURES.EIGENVECTOR).toBe('eigenvector');
      expect(FEATURES.BETWEENNESS).toBe('betweenness');
      expect(FEATURES.CLUSTERING).toBe('clustering');
      expect(FEATURES.CLIQUES).toBe('cliques');
      expect(FEATURES.MODULARITY).toBe('modularity');
    });

    test('FEATURES.ALL contains all feature names', () => {
      expect(FEATURES.ALL).toContain('degree');
      expect(FEATURES.ALL).toContain('eigenvector');
      expect(FEATURES.ALL).toContain('betweenness');
      expect(FEATURES.ALL).toContain('clustering');
      expect(FEATURES.ALL).toContain('cliques');
      expect(FEATURES.ALL).toContain('modularity');
    });
  });
});
