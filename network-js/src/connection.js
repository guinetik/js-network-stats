/**
 * Represents a weighted edge/connection between two nodes in a graph.
 * Connections are undirected by default.
 *
 * @class
 * @example
 * const edge = new Connection('nodeA', 'nodeB', 2.5);
 * console.log(edge.id); // 'nodeA_nodeB'
 * console.log(edge.hasNode('nodeA')); // true
 */
export class Connection {
  /**
   * Creates a new connection between two nodes.
   *
   * @param {string|number} source - The source node identifier
   * @param {string|number} target - The target node identifier
   * @param {number} [weight=1] - The weight of the connection (default: 1)
   */
  constructor(source, target, weight = 1) {
    this.source = source;
    this.target = target;
    this.weight = weight;
  }

  /**
   * Get a unique identifier for this connection.
   * Format: 'source_target'
   *
   * @type {string}
   * @readonly
   */
  get id() {
    return `${this.source}_${this.target}`;
  }

  /**
   * Check if this connection involves a specific node.
   *
   * @param {string|number} node - The node identifier to check
   * @returns {boolean} True if the node is either source or target
   */
  hasNode(node) {
    return this.source === node || this.target === node;
  }

  /**
   * Create a deep copy of this connection.
   *
   * @returns {Connection} A new Connection instance with the same properties
   */
  clone() {
    return new Connection(this.source, this.target, this.weight);
  }
}