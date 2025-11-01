/**
 * Network validation utilities
 * @module validators/network
 */

/**
 * Validates that a network is a valid array of edge objects
 *
 * @param {*} network - Network to validate
 * @throws {TypeError} If network is not an array
 * @throws {Error} If network is empty or contains invalid edges
 *
 * @example
 * validateNetwork([
 *   { source: 'A', target: 'B' },
 *   { source: 'B', target: 'C' }
 * ]); // No error
 *
 * validateNetwork([]); // Throws: Network cannot be empty
 * validateNetwork('invalid'); // Throws: Network must be an array
 */
export function validateNetwork(network) {
  if (!Array.isArray(network)) {
    throw new TypeError('Network must be an array of edge objects');
  }

  if (network.length === 0) {
    throw new Error('Network cannot be empty');
  }

  for (let i = 0; i < network.length; i++) {
    const edge = network[i];

    if (!edge || typeof edge !== 'object') {
      throw new Error(
        `Invalid edge at index ${i}: edge must be an object`
      );
    }

    if (!edge.source || !edge.target) {
      throw new Error(
        `Invalid edge at index ${i}: missing source or target property`
      );
    }

    // Validate source and target are strings or numbers
    const sourceType = typeof edge.source;
    const targetType = typeof edge.target;

    if (sourceType !== 'string' && sourceType !== 'number') {
      throw new Error(
        `Invalid edge at index ${i}: source must be a string or number`
      );
    }

    if (targetType !== 'string' && targetType !== 'number') {
      throw new Error(
        `Invalid edge at index ${i}: target must be a string or number`
      );
    }

    // Validate weight if present
    if (edge.weight !== undefined) {
      const weightType = typeof edge.weight;
      if (weightType !== 'number' || isNaN(edge.weight)) {
        throw new Error(
          `Invalid edge at index ${i}: weight must be a valid number`
        );
      }

      if (edge.weight < 0) {
        throw new Error(
          `Invalid edge at index ${i}: weight must be non-negative`
        );
      }
    }
  }
}
