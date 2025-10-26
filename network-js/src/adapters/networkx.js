import { Adapter } from './adapter.js';

/**
 * NetworkXAdapter - Convert between NetworkX (Python) graph formats
 *
 * Supports NetworkX JSON formats for Python interoperability:
 * - node-link format (most common)
 * - adjacency format
 * - cytoscape format (compatible)
 *
 * Use this for data exchange with NetworkX Python library.
 *
 * @extends Adapter
 *
 * @example
 * import { NetworkXAdapter } from '@guinetik/network-js';
 *
 * // From NetworkX node-link JSON
 * const graphData = NetworkXAdapter.fromNodeLink(nxData);
 *
 * // To NetworkX node-link JSON
 * const nxData = NetworkXAdapter.toNodeLink(graphData);
 */
export class NetworkXAdapter extends Adapter {
  /**
   * Convert from NetworkX node-link format to GraphData
   *
   * This is the most common NetworkX JSON format
   *
   * @param {import('../models/types.js').NetworkXNodeLink} nxData - NetworkX node-link format
   * @returns {import('../models/types.js').GraphData} Standard graph data
   *
   * @example
   * // Python: nx.node_link_data(G)
   * const nxData = {
   *   directed: false,
   *   multigraph: false,
   *   graph: {},
   *   nodes: [{ id: 0 }, { id: 1 }],
   *   links: [{ source: 0, target: 1 }]
   * };
   * const graphData = NetworkXAdapter.fromNodeLink(nxData);
   */
  static fromNodeLink(nxData) {
    if (!nxData || !Array.isArray(nxData.nodes)) {
      throw new Error('Invalid NetworkX node-link data: must have nodes array');
    }

    const nodes = nxData.nodes.map(node => ({
      id: String(node.id),
      ...node
    }));

    const edges = (nxData.links || []).map(link => ({
      source: String(link.source),
      target: String(link.target),
      weight: link.weight || 1,
      ...link
    }));

    const graphData = { nodes, edges };
    return this.filterInvalidEdges(graphData);
  }

  /**
   * Convert from NetworkX adjacency format to GraphData
   *
   * @param {Array<Object>} nxData - NetworkX adjacency format
   * @returns {import('../models/types.js').GraphData} Standard graph data
   *
   * @example
   * // Python: nx.adjacency_data(G)
   * const nxData = [
   *   { id: 0, adjacency: [{ id: 1, weight: 1 }] },
   *   { id: 1, adjacency: [{ id: 0, weight: 1 }] }
   * ];
   * const graphData = NetworkXAdapter.fromAdjacency(nxData);
   */
  static fromAdjacency(nxData) {
    if (!Array.isArray(nxData)) {
      throw new Error('Invalid NetworkX adjacency data: must be array');
    }

    const nodes = [];
    const edges = [];
    const edgeSet = new Set(); // Prevent duplicate edges

    for (const nodeData of nxData) {
      const nodeId = String(nodeData.id);
      nodes.push({
        id: nodeId,
        ...nodeData
      });

      if (nodeData.adjacency && Array.isArray(nodeData.adjacency)) {
        for (const neighbor of nodeData.adjacency) {
          const targetId = String(neighbor.id);
          const edgeKey = `${nodeId}-${targetId}`;
          const reverseKey = `${targetId}-${nodeId}`;

          // Skip if we've already added this edge (undirected)
          if (!edgeSet.has(edgeKey) && !edgeSet.has(reverseKey)) {
            edges.push({
              source: nodeId,
              target: targetId,
              weight: neighbor.weight || 1,
              ...neighbor
            });
            edgeSet.add(edgeKey);
          }
        }
      }
    }

    const graphData = { nodes, edges };
    return this.filterInvalidEdges(graphData);
  }

  /**
   * Auto-detect NetworkX format and convert
   *
   * @param {Object} nxData - NetworkX data in any format
   * @returns {import('../models/types.js').GraphData} Standard graph data
   *
   * @example
   * const graphData = NetworkXAdapter.fromFormat(nxData);
   */
  static fromFormat(nxData) {
    if (!nxData || typeof nxData !== 'object') {
      throw new Error('Invalid NetworkX data');
    }

    // Check if it's node-link format
    if (nxData.nodes && Array.isArray(nxData.nodes)) {
      if (nxData.links || nxData.edges) {
        return this.fromNodeLink({
          ...nxData,
          links: nxData.links || nxData.edges
        });
      }
    }

    // Check if it's adjacency format (array of nodes with adjacency lists)
    if (Array.isArray(nxData) && nxData[0]?.adjacency) {
      return this.fromAdjacency(nxData);
    }

    throw new Error('Unknown NetworkX format');
  }

  /**
   * Convert GraphData to NetworkX node-link format
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {Object} [options={}] - Export options
   * @param {boolean} [options.directed=false] - Whether graph is directed
   * @param {boolean} [options.multigraph=false] - Whether graph allows multiple edges
   * @returns {import('../models/types.js').NetworkXNodeLink} NetworkX node-link format
   *
   * @example
   * const nxData = NetworkXAdapter.toNodeLink(graphData);
   * // Can be loaded in Python: G = nx.node_link_graph(nxData)
   */
  static toNodeLink(graphData, options = {}) {
    this.validateGraphData(graphData);

    const { directed = false, multigraph = false } = options;

    return {
      directed,
      multigraph,
      graph: {},
      nodes: graphData.nodes.map(node => ({ ...node })),
      links: graphData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight || 1,
        ...edge
      }))
    };
  }

  /**
   * Convert GraphData to NetworkX adjacency format
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @returns {Array<Object>} NetworkX adjacency format
   *
   * @example
   * const nxData = NetworkXAdapter.toAdjacency(graphData);
   * // Can be loaded in Python: G = nx.adjacency_graph(nxData)
   */
  static toAdjacency(graphData) {
    this.validateGraphData(graphData);

    // Build adjacency map
    const adjacencyMap = new Map();

    // Initialize all nodes
    for (const node of graphData.nodes) {
      adjacencyMap.set(String(node.id), {
        ...node,
        adjacency: []
      });
    }

    // Add edges
    for (const edge of graphData.edges) {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);

      const sourceNode = adjacencyMap.get(sourceId);
      if (sourceNode) {
        sourceNode.adjacency.push({
          id: targetId,
          weight: edge.weight || 1,
          ...edge
        });
      }

      // For undirected graphs, add reverse edge
      const targetNode = adjacencyMap.get(targetId);
      if (targetNode && sourceId !== targetId) {
        targetNode.adjacency.push({
          id: sourceId,
          weight: edge.weight || 1,
          ...edge
        });
      }
    }

    return Array.from(adjacencyMap.values());
  }

  /**
   * Convert GraphData to NetworkX format (default: node-link)
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {Object} [options={}] - Export options
   * @param {string} [options.format='node-link'] - Format: 'node-link' or 'adjacency'
   * @param {boolean} [options.directed=false] - Whether graph is directed
   * @param {boolean} [options.multigraph=false] - Whether graph allows multiple edges
   * @returns {Object|Array} NetworkX format data
   *
   * @example
   * const nxData = NetworkXAdapter.toFormat(graphData, { format: 'node-link' });
   */
  static toFormat(graphData, options = {}) {
    const { format = 'node-link' } = options;

    switch (format) {
      case 'adjacency':
        return this.toAdjacency(graphData);
      case 'node-link':
      default:
        return this.toNodeLink(graphData, options);
    }
  }
}

export default NetworkXAdapter;
