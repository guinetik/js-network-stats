import { Layout } from "./layout.js";

/**
 * Circular layout algorithm.
 *
 *
 * @extends Layout
 * @class
 * @example
 * const layout = new CircularLayout(graph, null, {
 *   width: 800,
 *   height: 600,
 *   springLength: 100,
 *   springStrength: 1.0
 * });
 *
 * const positions = layout.getPositions();
 */
export class CircularLayout extends Layout {
  /**
   * Create a Circular layout.
   *
   * @param {Graph} graph - The graph to layout
   * @param {Array<Object>|null} [stats=null] - Pre-computed stats (betweenness used if available)
   * @param {Object} [options={}] - Layout configuration
   * @param {number} [options.width=1000] - Layout area width
   * @param {number} [options.height=1000] - Layout area height
   * @param {number} [options.springLength=100] - Ideal spring length (scales with distance)
   * @param {number} [options.springStrength=1.0] - Spring constant multiplier
   * @param {number} [options.maxIterations=100] - Maximum iterations per node
   * @param {number} [options.tolerance=0.01] - Convergence threshold (energy delta)
   * @param {boolean} [options.disconnectedSpacing=200] - Spacing for disconnected components
   */
  constructor(graph, stats = null, options = {}) {
    const defaults = {
      width: 1000,
      height: 1000,
      springLength: 100,
      springStrength: 1.0,
      maxIterations: 100,
      tolerance: 0.01,
      disconnectedSpacing: 200
    };

    super(graph, stats, { ...defaults, ...options });

    /**
     * Shortest path distances between all node pairs
     * @type {Object|null}
     * @private
     */
    this._distances = null;

    /**
     * Spring constants between node pairs
     * @type {Object|null}
     * @private
     */
    this._springConstants = null;
  }

  /**
   * Circular can use betweenness centrality to identify important nodes.
   *
   * @override
   * @returns {string[]} Required statistics
   */
  getRequiredStats() {
    return ['betweenness'];
  }

  /**
   * Compute all-pairs shortest paths using Floyd-Warshall algorithm.
   * Returns both distances and a flag indicating if graph is connected.
   *
   * @private
   * @returns {Object} { distances: Object, isConnected: boolean }
   */
  _computeShortestPaths() {
    const nodes = this.getNodes();
    const n = nodes.length;
    const distances = {};
    const INF = Infinity;

    // Initialize distance matrix
    nodes.forEach(nodeA => {
      distances[nodeA] = {};
      nodes.forEach(nodeB => {
        if (nodeA === nodeB) {
          distances[nodeA][nodeB] = 0;
        } else {
          distances[nodeA][nodeB] = INF;
        }
      });
    });

    // Set direct edge distances
    nodes.forEach(node => {
      const neighbors = this.graph.getNeighbors(node);
      neighbors.forEach(neighbor => {
        distances[node][neighbor] = 1; // Unweighted distance
      });
    });

    // Floyd-Warshall algorithm
    nodes.forEach(k => {
      nodes.forEach(i => {
        nodes.forEach(j => {
          if (distances[i][k] + distances[k][j] < distances[i][j]) {
            distances[i][j] = distances[i][k] + distances[k][j];
          }
        });
      });
    });

    // Check if graph is connected
    let isConnected = true;
    outer: for (const nodeA of nodes) {
      for (const nodeB of nodes) {
        if (distances[nodeA][nodeB] === INF) {
          isConnected = false;
          break outer;
        }
      }
    }

    return { distances, isConnected };
  }

  /**
   * Compute spring constants for all node pairs.
   * K_ij = K / (d_ij)^2 where K is base strength and d_ij is shortest path distance.
   *
   * @private
   * @param {Object} distances - Shortest path distances
   * @returns {Object} Spring constants between node pairs
   */
  _computeSpringConstants(distances) {
    const { springStrength } = this.options;
    const nodes = this.getNodes();
    const n = nodes.length;
    const K = springStrength * n; // Base spring constant
    const springs = {};

    nodes.forEach(nodeA => {
      springs[nodeA] = {};
      nodes.forEach(nodeB => {
        if (nodeA !== nodeB) {
          const dist = distances[nodeA][nodeB];
          if (dist !== Infinity && dist > 0) {
            springs[nodeA][nodeB] = K / (dist * dist);
          } else {
            springs[nodeA][nodeB] = 0;
          }
        }
      });
    });

    return springs;
  }

  /**
   * Initialize positions in a circle or grid pattern.
   *
   * @private
   * @returns {Object} Initial positions
   */
  _initializePositions() {
    const { width, height } = this.options;
    const nodes = this.getNodes();
    const n = nodes.length;
    const positions = {};

    // Circular initial layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;

    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n;
      positions[node] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    return positions;
  }

  /**
   * Calculate energy derivatives (partial derivatives of energy function) for a node.
   * Returns the gradient (∂E/∂x, ∂E/∂y) for the given node.
   *
   * @private
   * @param {string} node - Node to calculate derivatives for
   * @param {Object} positions - Current positions
   * @returns {Object} { dx: number, dy: number } - Partial derivatives
   */
  _calculateEnergyDerivatives(node, positions) {
    const { springLength } = this.options;
    const nodes = this.getNodes();
    const pos = positions[node];

    let dEx = 0; // ∂E/∂x
    let dEy = 0; // ∂E/∂y

    nodes.forEach(other => {
      if (node === other) return;

      const otherPos = positions[other];
      const kij = this._springConstants[node][other];
      const lij = this._distances[node][other] * springLength;

      if (kij === 0) return;

      // Distance between nodes
      const dx = pos.x - otherPos.x;
      const dy = pos.y - otherPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) return;

      // Energy derivative components
      const factor = kij * (1 - lij / dist);
      dEx += factor * dx;
      dEy += factor * dy;
    });

    return { dx: dEx, dy: dEy };
  }

  /**
   * Find the node with maximum energy (furthest from optimal position).
   *
   * @private
   * @param {Object} positions - Current positions
   * @returns {string|null} Node ID with max energy, or null if converged
   */
  _findMaxEnergyNode(positions) {
    const { tolerance } = this.options;
    const nodes = this.getNodes();
    let maxEnergy = 0;
    let maxNode = null;

    nodes.forEach(node => {
      const { dx, dy } = this._calculateEnergyDerivatives(node, positions);
      const energy = Math.sqrt(dx * dx + dy * dy);

      if (energy > maxEnergy) {
        maxEnergy = energy;
        maxNode = node;
      }
    });

    // Check convergence
    if (maxEnergy < tolerance) {
      return null;
    }

    return maxNode;
  }

  /**
   * Move a node to minimize its energy using gradient descent.
   *
   * @private
   * @param {string} node - Node to optimize
   * @param {Object} positions - Current positions (modified in place)
   */
  _optimizeNodePosition(node, positions) {
    const { maxIterations, springLength } = this.options;
    const { width, height } = this.options;

    for (let iter = 0; iter < maxIterations; iter++) {
      const { dx, dy } = this._calculateEnergyDerivatives(node, positions);
      const energy = Math.sqrt(dx * dx + dy * dy);

      if (energy < 0.01) break; // Converged for this node

      // Simple gradient descent step
      const stepSize = 0.1;
      positions[node].x -= stepSize * dx;
      positions[node].y -= stepSize * dy;

      // Keep within bounds
      positions[node].x = Math.max(0, Math.min(width, positions[node].x));
      positions[node].y = Math.max(0, Math.min(height, positions[node].y));
    }
  }

  /**
   * Compute node positions using Circular algorithm.
   *
   * @override
   * @param {Object} [options={}] - Override default options
   * @returns {Promise<Object>} Map of node IDs to {x, y} coordinates
   */
  async computePositions(options = {}) {
    // Merge options
    this.options = { ...this.options, ...options };

    // Ensure betweenness stats are available
    await this.ensureStats();

    // Compute shortest paths
    const { distances, isConnected } = this._computeShortestPaths();
    this._distances = distances;

    // Handle disconnected graphs
    if (!isConnected) {
      console.warn('Circular: Graph is disconnected, layout may not be optimal');
      // For disconnected graphs, we could run the algorithm on each component
      // For now, we'll proceed with infinite distances being treated specially
    }

    // Compute spring constants
    this._springConstants = this._computeSpringConstants(distances);

    // Initialize positions
    const positions = this._initializePositions();

    // Iteratively optimize positions
    const { maxIterations } = this.options;
    const globalMaxIterations = maxIterations * this.getNodeCount();

    for (let i = 0; i < globalMaxIterations; i++) {
      // Find node with maximum energy
      const maxNode = this._findMaxEnergyNode(positions);

      if (!maxNode) {
        // Converged
        break;
      }

      // Optimize this node's position
      this._optimizeNodePosition(maxNode, positions);
    }

    return positions;
  }

  /**
   * Update layout iteratively.
   * For Circular, each update optimizes the worst node.
   *
   * @override
   * @param {number} [iterations=1] - Number of nodes to optimize
   * @returns {Object} Updated positions
   */
  updateLayout(iterations = 1) {
    // Initialize if needed
    if (!this._positions) {
      this._positions = this._initializePositions();
      const { distances } = this._computeShortestPaths();
      this._distances = distances;
      this._springConstants = this._computeSpringConstants(distances);
    }

    // Optimize worst nodes
    for (let i = 0; i < iterations; i++) {
      const maxNode = this._findMaxEnergyNode(this._positions);
      if (!maxNode) break; // Converged

      this._optimizeNodePosition(maxNode, this._positions);
    }

    return this._positions;
  }

  /**
   * Reset algorithm state.
   *
   * @override
   */
  reset() {
    super.reset();
    this._distances = null;
    this._springConstants = null;
  }
}

export default CircularLayout;
