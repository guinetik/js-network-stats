import { Adapter } from './adapter.js';
import { createLogger } from '@guinetik/logger';

const log = createLogger({
  prefix: 'JSONAdapter',
  level: 'info'
});

/**
 * JSONAdapter - Convert between various JSON graph formats
 *
 * Supports multiple JSON graph formats:
 * - Standard GraphData (our format)
 * - D3.js force-directed format
 * - Cytoscape.js format
 * - NetworkX node-link format (see NetworkXAdapter for more options)
 *
 * @extends Adapter
 *
 * @example
 * import { JSONAdapter } from '@guinetik/network-js';
 *
 * // Convert from D3 format
 * const graphData = JSONAdapter.fromD3(d3Data);
 *
 * // Convert to Cytoscape format
 * const cytoData = JSONAdapter.toCytoscape(graphData);
 */
export class JSONAdapter extends Adapter {
  /**
   * Convert from D3.js force-directed format to GraphData
   *
   * D3 format uses 'links' instead of 'edges' and may have object references
   *
   * @param {import('../models/types.js').D3GraphData} d3Data - D3 format data
   * @returns {import('../models/types.js').GraphData} Standard graph data
   *
   * @example
   * const d3Data = {
   *   nodes: [{ id: 'A' }, { id: 'B' }],
   *   links: [{ source: 'A', target: 'B' }]
   * };
   * const graphData = JSONAdapter.fromD3(d3Data);
   */
  static fromD3(d3Data) {
    if (!d3Data || !d3Data.nodes) {
      throw new Error('Invalid D3 data: must have nodes array');
    }

    const nodes = d3Data.nodes.map(node => ({
      id: String(node.id),
      ...node
    }));

    const edges = (d3Data.links || []).map(link => ({
      source: String(link.source?.id || link.source),
      target: String(link.target?.id || link.target),
      weight: link.weight || link.value || 1,
      ...link
    }));

    const graphData = { nodes, edges };
    return this.filterInvalidEdges(graphData);
  }

  /**
   * Convert from Cytoscape.js format to GraphData
   *
   * @param {import('../models/types.js').CytoscapeData} cytoData - Cytoscape format
   * @returns {import('../models/types.js').GraphData} Standard graph data
   *
   * @example
   * const cytoData = {
   *   nodes: [{ data: { id: 'A' } }],
   *   edges: [{ data: { id: 'e1', source: 'A', target: 'B' } }]
   * };
   * const graphData = JSONAdapter.fromCytoscape(cytoData);
   */
  static fromCytoscape(cytoData) {
    if (!cytoData || !Array.isArray(cytoData.nodes)) {
      throw new Error('Invalid Cytoscape data: must have nodes array');
    }

    const nodes = cytoData.nodes.map(el => ({
      id: String(el.data.id),
      ...el.data
    }));

    const edges = (cytoData.edges || []).map(el => ({
      source: String(el.data.source),
      target: String(el.data.target),
      weight: el.data.weight || 1,
      ...el.data
    }));

    const graphData = { nodes, edges };
    return this.filterInvalidEdges(graphData);
  }

  /**
   * Auto-detect and convert from various JSON formats
   *
   * Attempts to detect the format and convert appropriately
   *
   * @param {Object} jsonData - JSON data in any supported format
   * @returns {import('../models/types.js').GraphData} Standard graph data
   *
   * @example
   * const graphData = JSONAdapter.fromFormat(unknownJsonData);
   */
  static fromFormat(jsonData) {
    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error('Invalid JSON data');
    }

    // Check if it's already GraphData format (has 'edges')
    if (jsonData.nodes && jsonData.edges) {
      return this.normalizeIds(jsonData);
    }

    // Check if it's D3 format (has 'links')
    if (jsonData.nodes && jsonData.links) {
      return this.fromD3(jsonData);
    }

    // Check if it's Cytoscape format
    if (Array.isArray(jsonData.nodes) && jsonData.nodes[0]?.data) {
      return this.fromCytoscape(jsonData);
    }

    // Check if it's NetworkX node-link format
    if (jsonData.nodes && (jsonData.links || jsonData.edges)) {
      // Try to handle as D3-like format
      return this.fromD3({
        nodes: jsonData.nodes,
        links: jsonData.links || jsonData.edges
      });
    }

    throw new Error('Unknown JSON format - cannot auto-detect');
  }

  /**
   * Convert GraphData to D3.js format
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @returns {import('../models/types.js').D3GraphData} D3 format
   *
   * @example
   * const d3Data = JSONAdapter.toD3(graphData);
   */
  static toD3(graphData) {
    this.validateGraphData(graphData);

    return {
      nodes: graphData.nodes.map(node => ({ ...node })),
      links: graphData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        value: edge.weight,
        ...edge
      }))
    };
  }

  /**
   * Convert GraphData to Cytoscape.js format
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @returns {import('../models/types.js').CytoscapeData} Cytoscape format
   *
   * @example
   * const cytoData = JSONAdapter.toCytoscape(graphData);
   */
  static toCytoscape(graphData) {
    this.validateGraphData(graphData);

    return {
      nodes: graphData.nodes.map(node => ({
        data: { ...node }
      })),
      edges: graphData.edges.map((edge, index) => ({
        data: {
          id: `e${index}`,
          source: edge.source,
          target: edge.target,
          weight: edge.weight || 1,
          ...edge
        }
      }))
    };
  }

  /**
   * Convert GraphData to standard JSON format (default export)
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {Object} [options={}] - Export options
   * @param {string} [options.format='standard'] - Format: 'standard', 'd3', or 'cytoscape'
   * @param {boolean} [options.pretty=false] - Pretty-print JSON
   * @returns {string} JSON string
   *
   * @example
   * const json = JSONAdapter.toFormat(graphData, { format: 'd3', pretty: true });
   */
  static toFormat(graphData, options = {}) {
    const { format = 'standard', pretty = false } = options;

    let data;
    switch (format) {
      case 'd3':
        data = this.toD3(graphData);
        break;
      case 'cytoscape':
        data = this.toCytoscape(graphData);
        break;
      case 'standard':
      default:
        this.validateGraphData(graphData);
        data = graphData;
    }

    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  /**
   * Load graph data from URL
   *
   * @param {string} url - URL to JSON file
   * @returns {Promise<import('../models/types.js').GraphData>} Standard graph data
   *
   * @example
   * const graphData = await JSONAdapter.loadFromURL('../data/graph.json');
   */
  static async loadFromURL(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const jsonData = await response.json();
      return this.fromFormat(jsonData);
    } catch (error) {
      log.error('Error loading JSON', {
        url,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

export default JSONAdapter;
