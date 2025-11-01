/**
 * Feature validation utilities
 * @module validators/features
 */

import { getValidFeatures } from '../core/constants.js';

/**
 * Validates that features array contains only valid feature names
 *
 * @param {*} features - Features to validate
 * @throws {TypeError} If features is not an array
 * @throws {Error} If features contain invalid values
 *
 * @example
 * validateFeatures(['degree', 'eigenvector']); // No error
 * validateFeatures(['invalid']); // Throws: Invalid feature: "invalid"
 * validateFeatures('degree'); // Throws: Features must be an array
 */
export function validateFeatures(features) {
  if (!Array.isArray(features)) {
    throw new TypeError('Features must be an array of strings');
  }

  if (features.length === 0) {
    throw new Error('Features array cannot be empty');
  }

  const validFeatures = getValidFeatures();

  for (const feature of features) {
    if (typeof feature !== 'string') {
      throw new TypeError(
        `Invalid feature type: expected string, got ${typeof feature}`
      );
    }

    if (!validFeatures.has(feature)) {
      throw new Error(
        `Invalid feature: "${feature}". Valid features are: ${Array.from(validFeatures).join(', ')}`
      );
    }
  }
}
