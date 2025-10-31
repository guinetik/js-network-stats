/**
 * GraphMemento - Captures a snapshot of the graph state
 *
 * Implements the Memento Pattern for undo/redo functionality
 * Stores a deep copy of nodes and links at a point in time
 *
 * @class
 */
export class GraphMemento {
  /**
   * Create a memento from current graph state
   *
   * @param {Array} nodes - Array of node objects
   * @param {Array} links - Array of link objects
   * @param {string} description - Description of the state (e.g., "After adding parent: John")
   */
  constructor(nodes, links, description = '') {
    // Deep copy nodes to prevent mutation
    this.nodes = JSON.parse(JSON.stringify(nodes));

    // Deep copy links, normalizing source/target to IDs only
    this.links = links.map(link => ({
      source: typeof link.source === 'string' ? link.source : link.source.id,
      target: typeof link.target === 'string' ? link.target : link.target.id
    }));

    this.description = description;
    this.timestamp = Date.now();
  }

  /**
   * Get the saved nodes
   * @returns {Array} Deep copy of nodes
   */
  getNodes() {
    return JSON.parse(JSON.stringify(this.nodes));
  }

  /**
   * Get the saved links
   * @returns {Array} Deep copy of links
   */
  getLinks() {
    return JSON.parse(JSON.stringify(this.links));
  }

  /**
   * Get memento description
   * @returns {string} Description
   */
  getDescription() {
    return this.description;
  }

  /**
   * Get timestamp when memento was created
   * @returns {number} Unix timestamp
   */
  getTimestamp() {
    return this.timestamp;
  }

  /**
   * Get a summary of this memento (for debugging)
   * @returns {Object} {nodeCount, linkCount, description, timestamp}
   */
  getSummary() {
    return {
      nodeCount: this.nodes.length,
      linkCount: this.links.length,
      description: this.description,
      timestamp: new Date(this.timestamp).toLocaleString()
    };
  }
}

export default GraphMemento;
