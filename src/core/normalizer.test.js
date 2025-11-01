/**
 * Tests for result normalization
 */

import { describe, it, expect } from 'vitest';
import { normalizeFeatures } from './normalizer.js';

describe('normalizeFeatures', () => {
  it('should normalize single feature', () => {
    const stats = {
      degree: { 'A': 2, 'B': 3, 'C': 1 }
    };
    const nodes = ['A', 'B', 'C'];

    const result = normalizeFeatures(stats, nodes);

    expect(result).toEqual([
      { id: 'A', degree: 2 },
      { id: 'B', degree: 3 },
      { id: 'C', degree: 1 }
    ]);
  });

  it('should normalize multiple features', () => {
    const stats = {
      degree: { 'A': 2, 'B': 3 },
      eigenvector: { 'A': 0.5, 'B': 0.7 }
    };
    const nodes = ['A', 'B'];

    const result = normalizeFeatures(stats, nodes);

    expect(result).toEqual([
      { id: 'A', degree: 2, eigenvector: 0.5 },
      { id: 'B', degree: 3, eigenvector: 0.7 }
    ]);
  });

  it('should handle undefined values gracefully', () => {
    const stats = {
      degree: { 'A': 2 }
    };
    const nodes = ['A', 'B'];

    const result = normalizeFeatures(stats, nodes);

    expect(result).toEqual([
      { id: 'A', degree: 2 },
      { id: 'B', degree: undefined }
    ]);
  });

  it('should throw on invalid stats input', () => {
    expect(() => normalizeFeatures(null, ['A'])).toThrow(TypeError);
    expect(() => normalizeFeatures('invalid', ['A'])).toThrow('Stats must be an object');
  });

  it('should throw on invalid nodes input', () => {
    expect(() => normalizeFeatures({}, 'invalid')).toThrow(TypeError);
    expect(() => normalizeFeatures({}, 'invalid')).toThrow('Nodes must be an array');
  });

  it('should handle empty nodes array', () => {
    const result = normalizeFeatures({ degree: {} }, []);
    expect(result).toEqual([]);
  });

  it('should preserve node ID types', () => {
    const stats = {
      degree: { '1': 2, '2': 3 }
    };
    const nodes = ['1', '2'];

    const result = normalizeFeatures(stats, nodes);

    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });
});
