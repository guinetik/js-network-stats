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
 */

export { Layout } from './layout.js';
export { ForceDirectedLayout } from './force-directed.js';
export { CircularLayout } from './circular.js';
