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
 * - `ForceDirectedLayout`: Spring-electrical model with Fruchterman-Reingold algorithm (O(iterations × V²))
 * - `KamadaKawaiLayout`: Energy minimization based on shortest paths (O(n³ + iterations × n²))
 * - `BipartiteLayout`: Two-layer layout for bipartite graphs (O(V))
 * - `MultipartiteLayout`: Multi-layer layout for hierarchical graphs (O(V))
 * - `BFSLayout`: Layer layout based on breadth-first search (O(V + E))
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
export { KamadaKawaiLayout } from './kamada-kawai.js';
export { BipartiteLayout } from './bipartite.js';
export { MultipartiteLayout } from './multipartite.js';
export { BFSLayout } from './bfs.js';
export {
  rescaleLayout,
  randomLayout,
  getBoundingBox,
  distance
} from './layout-utils.js';

/**
 * Registry of available layout algorithms with metadata.
 * This is the single source of truth for all available layouts.
 * Use this in UIs to populate layout selectors instead of hardcoding options.
 *
 * @example
 * import { LAYOUT_REGISTRY } from './layouts/index.js';
 *
 * // Get all layouts
 * const allLayouts = LAYOUT_REGISTRY.getAll();
 *
 * // Get specific layout metadata
 * const kamadaKawai = LAYOUT_REGISTRY.get('kamada-kawai');
 *
 * // Filter by category
 * const hierarchicalLayouts = LAYOUT_REGISTRY.filter(l => l.category === 'hierarchical');
 */
export const LAYOUT_REGISTRY = {
  /**
   * Metadata for each layout algorithm
   * @private
   */
  layouts: [
    {
      id: 'none',
      name: 'None (D3 Physics)',
      description: "D3's built-in force-directed physics simulation",
      category: 'physics',
      complexity: 'O(iterations)',
      bestFor: ['General graphs', 'Interactive exploration'],
      requiresStats: false
    },
    {
      id: 'random',
      name: 'Random',
      description: 'Random node positioning',
      category: 'simple',
      complexity: 'O(n)',
      bestFor: ['Testing', 'Initial visualization'],
      requiresStats: false
    },
    {
      id: 'circular',
      name: 'Circular',
      description: 'Nodes arranged in a circle',
      category: 'simple',
      complexity: 'O(n)',
      bestFor: ['Symmetric graphs', 'Ring topologies'],
      requiresStats: false
    },
    {
      id: 'spiral',
      name: 'Spiral',
      description: 'Archimedean spiral arrangement',
      category: 'simple',
      complexity: 'O(n)',
      bestFor: ['Linear structures', 'Sequences'],
      requiresStats: false
    },
    {
      id: 'shell',
      name: 'Shell',
      description: 'Concentric circles by degree',
      category: 'simple',
      complexity: 'O(n)',
      bestFor: ['Star-like graphs', 'Hub structures'],
      requiresStats: true
    },
    {
      id: 'spectral',
      name: 'Spectral',
      description: 'Laplacian eigenvector layout',
      category: 'spectral',
      complexity: 'O(n)',
      bestFor: ['Community detection visualization', 'Graph topology'],
      requiresStats: true,
      requiredStat: 'eigenvector-laplacian'
    },
    {
      id: 'force-directed',
      name: 'Force-Directed',
      description: 'Spring-electrical model (Fruchterman-Reingold)',
      category: 'physics',
      complexity: 'O(iterations × n²)',
      bestFor: ['General graphs', 'Complex networks'],
      requiresStats: false
    },
    {
      id: 'kamada-kawai',
      name: 'Kamada-Kawai',
      description: 'Energy minimization based on shortest paths',
      category: 'energy',
      complexity: 'O(n³ + iterations × n²)',
      bestFor: ['Small-medium graphs', 'Trees', 'Planar graphs'],
      requiresStats: false
    },
    {
      id: 'bipartite',
      name: 'Bipartite',
      description: 'Two-line layout for bipartite graphs',
      category: 'hierarchical',
      complexity: 'O(n)',
      bestFor: ['Bipartite graphs', 'Two-level hierarchies'],
      requiresStats: false
    },
    {
      id: 'multipartite',
      name: 'Multipartite',
      description: 'Multi-layer layout for hierarchical structures',
      category: 'hierarchical',
      complexity: 'O(n)',
      bestFor: ['DAGs', 'Organizational hierarchies'],
      requiresStats: false
    },
    {
      id: 'bfs',
      name: 'BFS Layout',
      description: 'Layer-by-layer breadth-first search',
      category: 'hierarchical',
      complexity: 'O(n + m)',
      bestFor: ['Trees', 'Network exploration'],
      requiresStats: false
    }
  ],

  /**
   * Get all available layouts
   * @returns {Array} Array of layout metadata objects
   */
  getAll() {
    return [...this.layouts];
  },

  /**
   * Get a specific layout by ID
   * @param {string} id - Layout ID
   * @returns {Object|null} Layout metadata or null if not found
   */
  get(id) {
    return this.layouts.find(l => l.id === id) || null;
  },

  /**
   * Filter layouts by predicate
   * @param {Function} predicate - Filter function
   * @returns {Array} Filtered layout metadata
   */
  filter(predicate) {
    return this.layouts.filter(predicate);
  },

  /**
   * Get layouts by category
   * @param {string} category - Category name (e.g., 'hierarchical', 'physics', 'simple')
   * @returns {Array} Layouts in that category
   */
  byCategory(category) {
    return this.layouts.filter(l => l.category === category);
  },

  /**
   * Get layouts that don't require pre-computed statistics
   * @returns {Array} Layouts that work without analysis
   */
  withoutStatRequirements() {
    return this.layouts.filter(l => !l.requiresStats);
  },

  /**
   * Check if a layout exists
   * @param {string} id - Layout ID
   * @returns {boolean} True if layout exists
   */
  exists(id) {
    return this.layouts.some(l => l.id === id);
  }
};
