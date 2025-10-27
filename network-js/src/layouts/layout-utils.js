/**
 * Utility functions for graph layouts
 * (matches NetworkX approach)
 *
 * @module layout-utils
 */

/**
 * Rescale layout positions to fit in [-scale, scale] range
 * Matches NetworkX's rescale_layout function
 *
 * The function:
 * 1. Centers positions by subtracting the mean
 * 2. Finds the maximum absolute coordinate value
 * 3. Scales all positions so max coordinate equals scale
 * 4. Adds the center offset
 *
 * @param {Object} positions - Node positions map (nodeId -> {x, y})
 * @param {Array} nodes - List of node IDs
 * @param {number} scale - Scale factor (positions will fit in [-scale, scale])
 * @param {Object} center - Center point {x, y}
 * @returns {Object} Rescaled positions (nodeId -> {x, y})
 * @example
 * const positions = {
 *   'A': { x: 0, y: 0 },
 *   'B': { x: 2, y: 2 },
 *   'C': { x: 1, y: 1 }
 * };
 * const rescaled = rescaleLayout(positions, ['A', 'B', 'C'], 100, {x: 0, y: 0});
 * // Result: positions scaled so max coordinate is 100
 */
export function rescaleLayout(positions, nodes, scale = 1, center = { x: 0, y: 0 }) {
  if (nodes.length === 0) return positions;

  // Find centroid (mean position)
  let sumX = 0, sumY = 0;
  nodes.forEach(nodeId => {
    sumX += positions[nodeId].x;
    sumY += positions[nodeId].y;
  });
  const meanX = sumX / nodes.length;
  const meanY = sumY / nodes.length;

  // Center positions (subtract mean)
  const centered = {};
  nodes.forEach(nodeId => {
    centered[nodeId] = {
      x: positions[nodeId].x - meanX,
      y: positions[nodeId].y - meanY
    };
  });

  // Find max absolute coordinate across all dimensions
  let maxCoord = 0;
  nodes.forEach(nodeId => {
    const absX = Math.abs(centered[nodeId].x);
    const absY = Math.abs(centered[nodeId].y);
    maxCoord = Math.max(maxCoord, absX, absY);
  });

  // Rescale to [-scale, scale] and add center offset
  const rescaled = {};
  if (maxCoord > 0) {
    const scaleFactor = scale / maxCoord;
    nodes.forEach(nodeId => {
      rescaled[nodeId] = {
        x: centered[nodeId].x * scaleFactor + center.x,
        y: centered[nodeId].y * scaleFactor + center.y
      };
    });
  } else {
    // All nodes at same position - place at center
    nodes.forEach(nodeId => {
      rescaled[nodeId] = { x: center.x, y: center.y };
    });
  }

  return rescaled;
}

/**
 * Generate random initial positions for nodes
 * Uses uniform random distribution in [0, 1] range
 *
 * @param {Array} nodes - List of node IDs
 * @param {number} dim - Number of dimensions (default: 2)
 * @returns {Object} Random positions (nodeId -> {x, y})
 * @example
 * const positions = randomLayout(['A', 'B', 'C']);
 * // positions = { 'A': {x: 0.42, y: 0.73}, 'B': {x: 0.15, y: 0.89}, ... }
 */
export function randomLayout(nodes, dim = 2) {
  const positions = {};
  nodes.forEach(nodeId => {
    if (dim === 2) {
      positions[nodeId] = {
        x: Math.random(),
        y: Math.random()
      };
    } else {
      // For future 3D support
      const coords = {};
      for (let i = 0; i < dim; i++) {
        coords[i] = Math.random();
      }
      positions[nodeId] = coords;
    }
  });
  return positions;
}

/**
 * Calculate the bounding box of a set of positions
 *
 * @param {Object} positions - Node positions map
 * @param {Array} nodes - List of node IDs
 * @returns {Object} Bounding box {minX, maxX, minY, maxY}
 */
export function getBoundingBox(positions, nodes) {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  nodes.forEach(nodeId => {
    const pos = positions[nodeId];
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  });

  return { minX, maxX, minY, maxY };
}

/**
 * Calculate distance between two points
 *
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @returns {number} Euclidean distance
 */
export function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export default {
  rescaleLayout,
  randomLayout,
  getBoundingBox,
  distance
};
