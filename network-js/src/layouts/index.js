/**
 * Graph layout algorithms for computing node positions.
 *
 * **Usage Pattern**:
 * 1. Create layout instance with graph (and optionally pre-computed stats)
 * 2. Call `getPositions()` to compute coordinates
 * 3. Pass positions to visualization adapter (e.g., D3NetworkAdapter)
 *
 * **Available Layouts**:
 * - `ForceDirectedLayout`: Spring-electrical model (Fruchterman-Reingold)
 * - `CircularLayout`: Circular layout
 *
 * **Utilities**:
 * - `rescaleLayout`: Rescale positions to fit in specified range
 * - `randomLayout`: Generate random initial positions
 * - `getBoundingBox`: Calculate bounding box of positions
 * - `distance`: Calculate distance between two points
 */

export { Layout } from './layout.js';
export { ForceDirectedLayout } from './force-directed.js';
export { CircularLayout } from './circular.js';
export {
  rescaleLayout,
  randomLayout,
  getBoundingBox,
  distance
} from './layout-utils.js';
