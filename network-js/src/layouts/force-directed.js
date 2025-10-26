import { Layout } from "./layout.js";

/**
 * Force-directed graph layout using Fruchterman-Reingold algorithm.
 *
 * **Algorithm**: Spring-electrical model where:
 * - Edges act as springs (attractive force)
 * - Nodes repel each other (repulsive force)
 * - System iteratively reaches equilibrium
 *
 * **Use Case**: General-purpose layout for most network visualizations
 * **Complexity**: O(V² + E) per iteration (can be optimized with Barnes-Hut)
 *
 * @extends Layout
 * @class
 * @example
 * const layout = new ForceDirectedLayout(graph, null, {
 *   width: 800,
 *   height: 600,
 *   iterations: 50,
 *   repulsion: 100,
 *   attraction: 0.01
 * });
 *
 * const positions = layout.getPositions();
 */
export class ForceDirectedLayout extends Layout {
  /**
   * Create a force-directed layout.
   *
   * @param {Graph} graph - The graph to layout
   * @param {Array<Object>|null} [stats=null] - Pre-computed stats (optional, degree will be computed if needed)
   * @param {Object} [options={}] - Layout configuration
   * @param {number} [options.width=1000] - Layout area width
   * @param {number} [options.height=1000] - Layout area height
   * @param {number} [options.iterations=50] - Number of simulation iterations
   * @param {number} [options.repulsion=100] - Node repulsion strength
   * @param {number} [options.attraction=0.01] - Edge attraction strength
   * @param {number} [options.damping=0.9] - Velocity damping factor (0-1)
   * @param {number} [options.minDistance=10] - Minimum node separation
   * @param {boolean} [options.useWeights=true] - Use edge weights for attraction
   */
  constructor(graph, stats = null, options = {}) {
    const defaults = {
      width: 1000,
      height: 1000,
      iterations: 100,
      repulsion: 50000,      // Much stronger repulsion
      attraction: 0.1,        // Stronger attraction
      damping: 0.85,          // Less damping for more movement
      minDistance: 30,        // Larger minimum distance
      useWeights: true
    };

    super(graph, stats, { ...defaults, ...options });

    /**
     * Current velocities for each node
     * @type {Object}
     * @private
     */
    this._velocities = null;

    /**
     * Current iteration count
     * @type {number}
     * @private
     */
    this._currentIteration = 0;
  }

  /**
   * Force-directed layout can benefit from degree centrality for node sizing.
   *
   * @override
   * @returns {string[]} Required statistics
   */
  getRequiredStats() {
    return ['degree'];
  }

  /**
   * Initialize random positions for all nodes.
   *
   * @private
   * @returns {Object} Map of node IDs to {x, y} coordinates
   */
  _initializePositions() {
    const positions = {};
    const { width, height } = this.options;
    const nodes = this.getNodes();

    // Random initial positions
    nodes.forEach(node => {
      positions[node] = {
        x: Math.random() * width,
        y: Math.random() * height
      };
    });

    return positions;
  }

  /**
   * Initialize zero velocities for all nodes.
   *
   * @private
   * @returns {Object} Map of node IDs to {vx, vy} velocities
   */
  _initializeVelocities() {
    const velocities = {};
    const nodes = this.getNodes();

    nodes.forEach(node => {
      velocities[node] = { vx: 0, vy: 0 };
    });

    return velocities;
  }

  /**
   * Calculate repulsive forces between all node pairs.
   *
   * @private
   * @param {Object} positions - Current node positions
   * @param {Object} forces - Accumulated forces (modified in place)
   */
  _calculateRepulsion(positions, forces) {
    const { repulsion, minDistance } = this.options;
    const nodes = this.getNodes();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        const posA = positions[nodeA];
        const posB = positions[nodeB];

        // Vector from B to A
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;

        // Distance with minimum threshold
        const distance = Math.max(
          Math.sqrt(dx * dx + dy * dy),
          minDistance
        );

        // Repulsive force (inverse square law)
        const force = repulsion / (distance * distance);

        // Normalize direction
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        // Apply force to both nodes (Newton's third law)
        forces[nodeA].fx += fx;
        forces[nodeA].fy += fy;
        forces[nodeB].fx -= fx;
        forces[nodeB].fy -= fy;
      }
    }
  }

  /**
   * Calculate attractive forces along edges.
   *
   * @private
   * @param {Object} positions - Current node positions
   * @param {Object} forces - Accumulated forces (modified in place)
   */
  _calculateAttraction(positions, forces) {
    const { attraction, useWeights } = this.options;
    const nodes = this.getNodes();

    nodes.forEach(node => {
      const neighbors = this.graph.getNeighbors(node);
      const pos = positions[node];

      neighbors.forEach(neighbor => {
        const neighborPos = positions[neighbor];

        if (!neighborPos) return; // Skip if neighbor position not found

        // Get edge weight
        const edgeWeight = useWeights ? this.graph.getEdgeWeight(node, neighbor) : 1;

        // Vector from node to neighbor
        const dx = neighborPos.x - pos.x;
        const dy = neighborPos.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        // Attractive force (spring model)
        const force = attraction * distance * edgeWeight;

        // Normalize direction
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        // Apply force
        forces[node].fx += fx;
        forces[node].fy += fy;
      });
    });
  }

  /**
   * Apply forces to update positions via velocity integration.
   *
   * @private
   * @param {Object} positions - Current positions (modified in place)
   * @param {Object} forces - Current forces
   */
  _applyForces(positions, forces) {
    const { damping, width, height } = this.options;
    const nodes = this.getNodes();

    nodes.forEach(node => {
      // Update velocity
      this._velocities[node].vx = (this._velocities[node].vx + forces[node].fx) * damping;
      this._velocities[node].vy = (this._velocities[node].vy + forces[node].fy) * damping;

      // Update position
      positions[node].x += this._velocities[node].vx;
      positions[node].y += this._velocities[node].vy;

      // Keep within bounds (with soft boundary)
      positions[node].x = Math.max(0, Math.min(width, positions[node].x));
      positions[node].y = Math.max(0, Math.min(height, positions[node].y));
    });
  }

  /**
   * Perform one iteration of the force simulation.
   *
   * @private
   * @param {Object} positions - Current positions
   */
  _simulateStep(positions) {
    const nodes = this.getNodes();

    // Initialize forces to zero
    const forces = {};
    nodes.forEach(node => {
      forces[node] = { fx: 0, fy: 0 };
    });

    // Calculate all forces
    this._calculateRepulsion(positions, forces);
    this._calculateAttraction(positions, forces);

    // Apply forces to update positions
    this._applyForces(positions, forces);
  }

  /**
   * Compute final node positions using force simulation.
   *
   * @override
   * @param {Object} [options={}] - Override default options
   * @returns {Promise<Object>} Map of node IDs to {x, y} coordinates
   */
  async computePositions(options = {}) {
    // Merge options
    this.options = { ...this.options, ...options };

    // Ensure degree stats are available (for potential use by adapters)
    await this.ensureStats();

    // Initialize positions and velocities
    const positions = this._initializePositions();
    this._velocities = this._initializeVelocities();
    this._currentIteration = 0;

    // Run simulation for specified iterations
    const { iterations } = this.options;
    for (let i = 0; i < iterations; i++) {
      this._simulateStep(positions);
      this._currentIteration++;
    }

    return positions;
  }

  /**
   * Perform incremental layout updates for animation.
   * This allows step-by-step refinement of the layout.
   *
   * @override
   * @param {number} [iterations=1] - Number of iterations to perform
   * @returns {Object} Updated positions
   */
  updateLayout(iterations = 1) {
    // Initialize if not already done
    if (!this._positions) {
      this._positions = this._initializePositions();
      this._velocities = this._initializeVelocities();
      this._currentIteration = 0;
    }

    // Run specified number of iterations
    for (let i = 0; i < iterations; i++) {
      this._simulateStep(this._positions);
      this._currentIteration++;
    }

    return this._positions;
  }

  /**
   * Reset simulation state.
   *
   * @override
   */
  reset() {
    super.reset();
    this._velocities = null;
    this._currentIteration = 0;
  }

  /**
   * Get current iteration count.
   *
   * @returns {number} Number of iterations performed
   */
  getCurrentIteration() {
    return this._currentIteration;
  }
}

export default ForceDirectedLayout;
