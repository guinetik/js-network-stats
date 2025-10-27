/**
 * Graph layout algorithms for computing node positions.
 *
 * **Usage Pattern**:
 * 1. Create layout instance with graph (and optionally pre-computed stats)
 * 2. Call `getPositions()` to compute coordinates
 * 3. Pass positions to visualization adapter (e.g., D3NetworkAdapter)
 *
 * **Available Layouts**:
 * - `RandomLayout`: Random positioning (O(V))
 * - `CircularLayout`: Circular layout (O(V))
 * - `SpiralLayout`: Spiral arrangement (O(V))
 * - `ShellLayout`: Concentric shells (O(V)) - uses degree for grouping
 * - `SpectralLayout`: Laplacian eigenvector layout (O(V)) - requires eigenvector-laplacian stat
 * - `ForceDirectedLayout`: Spring-electrical model (O(iterations × V²))
 *
 * **Utilities**:
 * - `rescaleLayout`: Rescale positions to fit in specified range
 * - `randomLayout`: Generate random initial positions
 * - `getBoundingBox`: Calculate bounding box of positions
 * - `distance`: Calculate distance between two points
 */

export { Layout } from './layout.js';
export { RandomLayout } from './random.js';
export { CircularLayout } from './circular.js';
export { SpiralLayout } from './spiral.js';
export { ShellLayout } from './shell.js';
export { SpectralLayout } from './spectral.js';
export { ForceDirectedLayout } from './force-directed.js';
export {
  rescaleLayout,
  randomLayout,
  getBoundingBox,
  distance
} from './layout-utils.js';
