/**
 * Base class for graph data adapters
 *
 * Adapters convert between different graph formats and the standard GraphData format.
 * All adapters should extend this class and implement the required methods.
 *
 * @example
 * class MyAdapter extends Adapter {
 *   static fromFormat(data, options) {
 *     // Convert from custom format to GraphData
 *     return { nodes: [...], edges: [...] };
 *   }
 *
 *   static toFormat(graphData, options) {
 *     // Convert from GraphData to custom format
 *     return customFormatData;
 *   }
 * }
 */
export class Adapter {
  /**
   * Convert from external format to standard GraphData
   *
   * @param {*} data - Data in the external format
   * @param {Object} [options={}] - Conversion options
   * @returns {import('../models/types.js').GraphData} Standard graph data
   * @throws {Error} If not implemented
   */
  static fromFormat(data, options = {}) {
    throw new Error('Adapter.fromFormat() must be implemented by subclass');
  }

  /**
   * Convert from standard GraphData to external format
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {Object} [options={}] - Conversion options
   * @returns {*} Data in the external format
   * @throws {Error} If not implemented
   */
  static toFormat(graphData, options = {}) {
    throw new Error('Adapter.toFormat() must be implemented by subclass');
  }

  /**
   * Validate that data conforms to GraphData format
   *
   * @param {*} data - Data to validate
   * @returns {boolean} True if valid
   * @throws {Error} If invalid with details
   */
  static validateGraphData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('GraphData must be an object');
    }

    if (!Array.isArray(data.nodes)) {
      throw new Error('GraphData.nodes must be an array');
    }

    if (!Array.isArray(data.edges)) {
      throw new Error('GraphData.edges must be an array');
    }

    // Validate nodes have IDs
    for (const node of data.nodes) {
      if (!node.id && node.id !== 0) {
        throw new Error('All nodes must have an id property');
      }
    }

    // Validate edges have source and target
    for (const edge of data.edges) {
      if (!edge.source && edge.source !== 0) {
        throw new Error('All edges must have a source property');
      }
      if (!edge.target && edge.target !== 0) {
        throw new Error('All edges must have a target property');
      }
    }

    return true;
  }

  /**
   * Normalize node/edge IDs to strings
   *
   * @param {import('../models/types.js').GraphData} graphData - Graph data
   * @returns {import('../models/types.js').GraphData} Normalized graph data
   */
  static normalizeIds(graphData) {
    return {
      nodes: graphData.nodes.map(node => ({
        ...node,
        id: String(node.id)
      })),
      edges: graphData.edges.map(edge => ({
        ...edge,
        source: String(edge.source),
        target: String(edge.target)
      }))
    };
  }

  /**
   * Create a Set of all node IDs for validation
   *
   * @param {import('../models/types.js').NodeData[]} nodes - Array of nodes
   * @returns {Set<string>} Set of node IDs
   */
  static getNodeIdSet(nodes) {
    return new Set(nodes.map(n => String(n.id)));
  }

  /**
   * Filter out edges that reference non-existent nodes
   *
   * @param {import('../models/types.js').GraphData} graphData - Graph data
   * @param {boolean} [warn=true] - Whether to log warnings
   * @returns {import('../models/types.js').GraphData} Filtered graph data
   */
  static filterInvalidEdges(graphData, warn = true) {
    const nodeIds = this.getNodeIdSet(graphData.nodes);
    const validEdges = [];
    const invalidEdges = [];

    for (const edge of graphData.edges) {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);

      if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
        validEdges.push(edge);
      } else {
        invalidEdges.push(edge);
      }
    }

    if (warn && invalidEdges.length > 0) {
      console.warn(
        `Filtered out ${invalidEdges.length} edges referencing non-existent nodes`
      );
    }

    return {
      nodes: graphData.nodes,
      edges: validEdges
    };
  }
}

export default Adapter;
