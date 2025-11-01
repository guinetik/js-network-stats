/**
 * Tests for graph utilities
 */

import { describe, it, expect } from 'vitest';
import { getDistinctNodes, getAllUniqueNodes, edgesToTuples } from './utils.js';

describe('getDistinctNodes', () => {
  it('should extract distinct source nodes', () => {
    const network = [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'C' }
    ];

    const result = getDistinctNodes(network, 'source');
    expect(result).toEqual(['A', 'B']);
  });

  it('should extract distinct target nodes', () => {
    const network = [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'C' }
    ];

    const result = getDistinctNodes(network, 'target');
    expect(result).toEqual(['B', 'C']);
  });

  it('should handle numeric node IDs', () => {
    const network = [
      { source: 1, target: 2 },
      { source: 1, target: 3 }
    ];

    const result = getDistinctNodes(network, 'source');
    expect(result).toEqual([1]);
  });
});

describe('getAllUniqueNodes', () => {
  it('should get all unique nodes from network', () => {
    const network = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'A' }
    ];

    const result = getAllUniqueNodes(network);
    expect(result.sort()).toEqual(['A', 'B', 'C']);
  });

  it('should handle nodes appearing only as source', () => {
    const network = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' }
    ];

    const result = getAllUniqueNodes(network);
    expect(result.sort()).toEqual(['A', 'B', 'C']);
  });

  it('should handle nodes appearing only as target', () => {
    const network = [
      { source: 'A', target: 'C' },
      { source: 'B', target: 'C' }
    ];

    const result = getAllUniqueNodes(network);
    expect(result.sort()).toEqual(['A', 'B', 'C']);
  });

  it('should remove duplicates', () => {
    const network = [
      { source: 'A', target: 'A' },
      { source: 'A', target: 'B' }
    ];

    const result = getAllUniqueNodes(network);
    expect(result.sort()).toEqual(['A', 'B']);
  });

  it('should handle empty network', () => {
    const result = getAllUniqueNodes([]);
    expect(result).toEqual([]);
  });
});

describe('edgesToTuples', () => {
  it('should convert edges to tuples', () => {
    const network = [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 2 }
    ];

    const result = edgesToTuples(network);
    expect(result).toEqual([
      ['A', 'B'],
      ['B', 'C']
    ]);
  });

  it('should ignore weight property', () => {
    const network = [
      { source: 'A', target: 'B', weight: 5 }
    ];

    const result = edgesToTuples(network);
    expect(result).toEqual([['A', 'B']]);
  });

  it('should handle empty network', () => {
    const result = edgesToTuples([]);
    expect(result).toEqual([]);
  });
});
