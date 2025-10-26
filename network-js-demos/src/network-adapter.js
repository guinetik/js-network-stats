/**
 * NetworkAdapter - Bridge between @guinetik/network-js library and visualization frontends
 *
 * This adapter translates between:
 * - Library format: Connection objects with source/target/weight
 * - Visualization format: nodes array and links array for D3/Canvas/WebGL
 *
 * It also enriches nodes with computed metrics from the network analysis library.
 *
 * @example
 * import { NetworkAdapter } from './network-adapter.js';
 *
 * const adapter = new NetworkAdapter();
 * const graphData = adapter.setData(nodes, links);
 * // graphData now has nodes enriched with centrality, clustering, etc.
 */

import { NetworkStats } from '@guinetik/network-js';

export class NetworkAdapter {
  /**
   * Create a new NetworkAdapter
   *
   * @param {Object} options - Configuration options
   * @param {Array<string>} options.features - Network features to compute (default: ['degree', 'eigenvector'])
   * @param {boolean} options.verbose - Enable verbose logging
   */
  constructor(options = {}) {
    this.options = {
      features: options.features || ['degree', 'eigenvector'],
      verbose: options.verbose || false
    };

    this.analyzer = new NetworkStats({ verbose: this.options.verbose });

    this.nodes = [];
    this.links = [];
    this.nodeMap = new Map(); // For quick node lookup by id
  }

  /**
   * Convert visualization format to library format
   * Translates nodes/links arrays into Connection objects
   *
   * @param {Array} nodes - Array of node objects {id, group, ...}
   * @param {Array} links - Array of link objects {source, target, ...}
   * @returns {Array} Array of Connection-like objects {source, target, weight}
   * @private
   */
  #toLibraryFormat(nodes, links) {
    const connections = [];

    links.forEach(link => {
      // Handle both string IDs and object references
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      connections.push({
        source: sourceId,
        target: targetId,
        weight: link.weight || 1
      });
    });

    return connections;
  }

  /**
   * Enrich nodes with computed network metrics
   *
   * @param {Array} nodes - Array of node objects
   * @param {Array} metrics - Array of metric objects from NetworkStats
   * @returns {Array} Nodes enriched with metrics
   * @private
   */
  #enrichNodesWithMetrics(nodes, metrics) {
    // Create a map of metrics by node id
    const metricsMap = new Map();
    metrics.forEach(metric => {
      metricsMap.set(metric.id, metric);
    });

    // Enrich each node with its metrics
    return nodes.map(node => {
      const nodeMetrics = metricsMap.get(node.id) || {};

      return {
        ...node,
        // Add all computed metrics
        degree: nodeMetrics.degree || 0,
        eigenvector: nodeMetrics.eigenvector || 0,
        betweenness: nodeMetrics.betweenness || 0,
        clustering: nodeMetrics.clustering || 0,
        cliques: nodeMetrics.cliques || 0,
        modularity: nodeMetrics.modularity || 0,
        // Alias for centrality (commonly used in visualizations)
        centrality: nodeMetrics.eigenvector || 0
      };
    });
  }

  /**
   * Set graph data and compute network metrics
   * This is the main bridge method that connects lib to visualization
   *
   * @param {Array} nodes - Array of node objects {id, group, ...}
   * @param {Array} links - Array of link objects {source, target, ...}
   * @returns {Object} Graph data with enriched nodes {nodes, links}
   */
  setData(nodes, links) {
    // Store the original data
    this.nodes = [...nodes];
    this.links = [...links];

    // Build node lookup map
    this.nodeMap.clear();
    nodes.forEach(node => {
      this.nodeMap.set(node.id, node);
    });

    // If we have no nodes or links, return early
    if (nodes.length === 0) {
      return { nodes: [], links: [] };
    }

    // Convert to library format
    const connections = this.#toLibraryFormat(nodes, links);

    // Analyze the network using the library
    let metrics = [];
    if (connections.length > 0) {
      try {
        metrics = this.analyzer.analyze(connections, this.options.features);
      } catch (error) {
        console.error('Network analysis failed:', error);
        // Return basic metrics if analysis fails
        metrics = nodes.map(node => ({ id: node.id, degree: 0, eigenvector: 0 }));
      }
    }

    // Enrich nodes with computed metrics
    const enrichedNodes = this.#enrichNodesWithMetrics(nodes, metrics);

    return {
      nodes: enrichedNodes,
      links: [...links]
    };
  }

  /**
   * Add a node to the graph
   *
   * @param {Object} node - Node object {id, group, ...}
   * @returns {Object} Updated graph data {nodes, links}
   */
  addNode(node) {
    this.nodes.push(node);
    this.nodeMap.set(node.id, node);
    return this.setData(this.nodes, this.links);
  }

  /**
   * Add a link to the graph
   *
   * @param {Object} link - Link object {source, target, weight}
   * @returns {Object} Updated graph data {nodes, links}
   */
  addLink(link) {
    this.links.push(link);
    return this.setData(this.nodes, this.links);
  }

  /**
   * Remove a node from the graph
   *
   * @param {string} nodeId - ID of node to remove
   * @returns {Object} Updated graph data {nodes, links}
   */
  removeNode(nodeId) {
    // Remove the node
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.nodeMap.delete(nodeId);

    // Remove any links connected to this node
    this.links = this.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return sourceId !== nodeId && targetId !== nodeId;
    });

    return this.setData(this.nodes, this.links);
  }

  /**
   * Remove a link from the graph
   *
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @returns {Object} Updated graph data {nodes, links}
   */
  removeLink(sourceId, targetId) {
    this.links = this.links.filter(link => {
      const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
      const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;

      return !(
        (linkSource === sourceId && linkTarget === targetId) ||
        (linkSource === targetId && linkTarget === sourceId)
      );
    });

    return this.setData(this.nodes, this.links);
  }

  /**
   * Get a node by ID
   *
   * @param {string} nodeId - Node ID
   * @returns {Object|null} Node object or null if not found
   */
  getNode(nodeId) {
    return this.nodeMap.get(nodeId) || null;
  }

  /**
   * Get all nodes
   *
   * @returns {Array} Array of all nodes
   */
  getNodes() {
    return [...this.nodes];
  }

  /**
   * Get all links
   *
   * @returns {Array} Array of all links
   */
  getLinks() {
    return [...this.links];
  }

  /**
   * Recompute metrics with different features
   *
   * @param {Array<string>} features - Features to compute
   * @returns {Object} Updated graph data {nodes, links}
   */
  recompute(features) {
    this.options.features = features;
    return this.setData(this.nodes, this.links);
  }
}

export default NetworkAdapter;
