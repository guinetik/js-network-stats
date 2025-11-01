/**
 * Tests for network validation
 */

import { describe, it, expect } from 'vitest';
import { validateNetwork } from './network.js';

describe('validateNetwork', () => {
  it('should accept valid network', () => {
    const network = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' }
    ];

    expect(() => validateNetwork(network)).not.toThrow();
  });

  it('should accept network with numeric IDs', () => {
    const network = [
      { source: 1, target: 2 },
      { source: 2, target: 3 }
    ];

    expect(() => validateNetwork(network)).not.toThrow();
  });

  it('should accept network with weights', () => {
    const network = [
      { source: 'A', target: 'B', weight: 1.5 },
      { source: 'B', target: 'C', weight: 2.0 }
    ];

    expect(() => validateNetwork(network)).not.toThrow();
  });

  it('should reject non-array input', () => {
    expect(() => validateNetwork('not an array')).toThrow(TypeError);
    expect(() => validateNetwork('not an array')).toThrow('Network must be an array');
  });

  it('should reject empty array', () => {
    expect(() => validateNetwork([])).toThrow('Network cannot be empty');
  });

  it('should reject edge without source', () => {
    const network = [{ target: 'B' }];
    expect(() => validateNetwork(network)).toThrow('missing source or target');
  });

  it('should reject edge without target', () => {
    const network = [{ source: 'A' }];
    expect(() => validateNetwork(network)).toThrow('missing source or target');
  });

  it('should reject edge with invalid source type', () => {
    const network = [{ source: {}, target: 'B' }];
    expect(() => validateNetwork(network)).toThrow('source must be a string or number');
  });

  it('should reject edge with invalid target type', () => {
    const network = [{ source: 'A', target: [] }];
    expect(() => validateNetwork(network)).toThrow('target must be a string or number');
  });

  it('should reject edge with invalid weight', () => {
    const network = [{ source: 'A', target: 'B', weight: 'invalid' }];
    expect(() => validateNetwork(network)).toThrow('weight must be a valid number');
  });

  it('should reject edge with negative weight', () => {
    const network = [{ source: 'A', target: 'B', weight: -1 }];
    expect(() => validateNetwork(network)).toThrow('weight must be non-negative');
  });

  it('should reject edge with NaN weight', () => {
    const network = [{ source: 'A', target: 'B', weight: NaN }];
    expect(() => validateNetwork(network)).toThrow('weight must be a valid number');
  });
});
