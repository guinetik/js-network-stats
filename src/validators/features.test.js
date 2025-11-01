/**
 * Tests for feature validation
 */

import { describe, it, expect } from 'vitest';
import { validateFeatures } from './features.js';
import { FEATURES } from '../core/constants.js';

describe('validateFeatures', () => {
  it('should accept valid single feature', () => {
    expect(() => validateFeatures([FEATURES.DEGREE])).not.toThrow();
  });

  it('should accept valid multiple features', () => {
    const features = [FEATURES.DEGREE, FEATURES.EIGENVECTOR, FEATURES.BETWEENNESS];
    expect(() => validateFeatures(features)).not.toThrow();
  });

  it('should accept all available features', () => {
    expect(() => validateFeatures(FEATURES.ALL)).not.toThrow();
  });

  it('should reject non-array input', () => {
    expect(() => validateFeatures('degree')).toThrow(TypeError);
    expect(() => validateFeatures('degree')).toThrow('Features must be an array');
  });

  it('should reject empty array', () => {
    expect(() => validateFeatures([])).toThrow('Features array cannot be empty');
  });

  it('should reject invalid feature name', () => {
    expect(() => validateFeatures(['invalid_feature'])).toThrow('Invalid feature');
  });

  it('should reject non-string feature', () => {
    expect(() => validateFeatures([123])).toThrow('expected string');
  });

  it('should provide helpful error message with valid features', () => {
    try {
      validateFeatures(['not_a_feature']);
    } catch (error) {
      expect(error.message).toContain('Valid features are:');
      expect(error.message).toContain('degree');
      expect(error.message).toContain('eigenvector');
    }
  });
});
