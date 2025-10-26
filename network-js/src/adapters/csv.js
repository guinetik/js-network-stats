import { Adapter } from './adapter.js';

/**
 * CSVAdapter - Parse CSV files into network graph format
 *
 * Supports two CSV formats:
 * 1. Edge list (most common): source,target,weight
 * 2. Node properties: id,group,label,...
 *
 * Much more efficient than JSON for large graphs!
 *
 * @extends Adapter
 *
 * @example
 * import { CSVAdapter } from '@guinetik/network-js';
 *
 * // Load from URLs
 * const graphData = await CSVAdapter.loadFromURL(
 *   '../data/edges.csv',
 *   '../data/nodes.csv'
 * );
 *
 * // Parse from text
 * const graphData = CSVAdapter.fromEdgeList(csvText);
 *
 * // Export to CSV
 * const edgesCsv = CSVAdapter.toEdgeList(graphData);
 */
export class CSVAdapter extends Adapter {
  /**
   * Parse CSV text into rows
   *
   * @private
   * @param {string} csvText - Raw CSV text
   * @param {string} [delimiter=','] - Column delimiter
   * @returns {Array<Array<string>>} Array of rows (each row is array of values)
   */
  static parseCSV(csvText, delimiter = ',') {
    const rows = [];
    const lines = csvText.trim().split('\n');

    for (const line of lines) {
      // Simple CSV parsing (handles quoted values)
      const row = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse edge list CSV format
   * Expected columns: source,target,weight (weight is optional)
   *
   * @param {string} csvText - CSV text content
   * @param {import('../models/types.js').AdapterOptions} [options={}] - Parsing options
   * @returns {import('../models/types.js').GraphData} Standard graph data
   *
   * @example
   * const csv = `
   * source,target,weight
   * A,B,1
   * B,C,2
   * `;
   * const data = CSVAdapter.fromEdgeList(csv);
   * // { nodes: [{id: 'A'}, {id: 'B'}, {id: 'C'}],
   * //   edges: [{source: 'A', target: 'B', weight: 1}, ...] }
   */
  static fromEdgeList(csvText, options = {}) {
    const {
      header = true,
      delimiter = ',',
      weighted = true
    } = options;

    const rows = this.parseCSV(csvText, delimiter);

    // Skip header if present
    const dataRows = header ? rows.slice(1) : rows;

    // Collect unique nodes and edges
    const nodeSet = new Set();
    const edges = [];

    for (const row of dataRows) {
      if (row.length < 2) continue; // Skip invalid rows

      const source = row[0];
      const target = row[1];
      const weight = weighted && row[2] ? parseFloat(row[2]) : 1;

      nodeSet.add(source);
      nodeSet.add(target);

      edges.push({
        source,
        target,
        weight: isNaN(weight) ? 1 : weight
      });
    }

    // Convert node set to array of node objects
    const nodes = Array.from(nodeSet).map(id => ({
      id,
      group: 1 // Default group
    }));

    return { nodes, edges };
  }

  /**
   * Parse node properties CSV format
   * Expected columns: id,group,label (any additional columns become properties)
   *
   * @param {string} csvText - CSV text content
   * @param {import('../models/types.js').AdapterOptions} [options={}] - Parsing options
   * @returns {import('../models/types.js').NodeData[]} Array of node objects
   *
   * @example
   * const csv = `
   * id,group,label
   * A,1,Alice
   * B,2,Bob
   * `;
   * const nodes = CSVAdapter.fromNodes(csv);
   * // [{id: 'A', group: 1, label: 'Alice'}, {id: 'B', group: 2, label: 'Bob'}]
   */
  static fromNodes(csvText, options = {}) {
    const { header = true, delimiter = ',' } = options;
    const rows = this.parseCSV(csvText, delimiter);

    if (rows.length === 0) return [];

    // Get header row
    const headerRow = header ? rows[0] : ['id', 'group', 'label'];
    const dataRows = header ? rows.slice(1) : rows;

    // Parse each row into node object
    const nodes = dataRows.map(row => {
      const node = {};

      for (let i = 0; i < headerRow.length; i++) {
        const key = headerRow[i];
        const value = row[i];

        // Convert numbers
        if (key === 'group' && value) {
          node[key] = parseInt(value, 10);
        } else if (!isNaN(value) && value !== '') {
          node[key] = parseFloat(value);
        } else {
          node[key] = value;
        }
      }

      return node;
    });

    return nodes;
  }

  /**
   * Parse a complete network from separate edge and node CSV text
   *
   * @param {string} edgeCSV - Edge list CSV content
   * @param {string} [nodeCSV=null] - Node properties CSV content (optional)
   * @param {import('../models/types.js').AdapterOptions} [options={}] - Parsing options
   * @returns {import('../models/types.js').GraphData} Standard graph data
   *
   * @example
   * const edges = "source,target,weight\nA,B,1";
   * const nodes = "id,group,label\nA,1,Alice\nB,2,Bob";
   * const data = CSVAdapter.fromFormat(edges, nodes);
   */
  static fromFormat(edgeCSV, nodeCSV = null, options = {}) {
    // Parse edges first
    const { nodes: edgeNodes, edges } = this.fromEdgeList(edgeCSV, options);

    // If node CSV provided, merge node properties
    if (nodeCSV) {
      const nodeList = this.fromNodes(nodeCSV, options);

      // Create map of parsed nodes
      const nodeMap = new Map(nodeList.map(n => [String(n.id), n]));

      // Merge with edge nodes (keep all nodes from edges, add properties from node list)
      const nodes = edgeNodes.map(node => {
        const parsedNode = nodeMap.get(String(node.id));
        return parsedNode ? { ...node, ...parsedNode } : node;
      });

      const graphData = { nodes, edges };
      return this.filterInvalidEdges(graphData);
    }

    const graphData = { nodes: edgeNodes, edges };
    return this.filterInvalidEdges(graphData);
  }

  /**
   * Load network from CSV URL(s)
   *
   * @param {string} edgeURL - URL to edge list CSV file
   * @param {string} [nodeURL=null] - URL to node properties CSV file (optional)
   * @param {import('../models/types.js').AdapterOptions} [options={}] - Parsing options
   * @returns {Promise<import('../models/types.js').GraphData>} Standard graph data
   *
   * @example
   * const data = await CSVAdapter.loadFromURL(
   *   '../data/edges.csv',
   *   '../data/nodes.csv'
   * );
   */
  static async loadFromURL(edgeURL, nodeURL = null, options = {}) {
    try {
      // Fetch edge CSV
      const edgeResponse = await fetch(edgeURL);
      if (!edgeResponse.ok) {
        throw new Error(`Failed to fetch edges: ${edgeResponse.statusText}`);
      }
      const edgeCSV = await edgeResponse.text();

      // Fetch node CSV if provided
      let nodeCSV = null;
      if (nodeURL) {
        const nodeResponse = await fetch(nodeURL);
        if (nodeResponse.ok) {
          nodeCSV = await nodeResponse.text();
        }
      }

      return this.fromFormat(edgeCSV, nodeCSV, options);
    } catch (error) {
      console.error('Error loading CSV:', error);
      throw error;
    }
  }

  /**
   * Load network from File objects (for file input)
   *
   * @param {File} edgeFile - Edge list CSV file
   * @param {File} [nodeFile=null] - Node properties CSV file (optional)
   * @param {import('../models/types.js').AdapterOptions} [options={}] - Parsing options
   * @returns {Promise<import('../models/types.js').GraphData>} Standard graph data
   *
   * @example
   * const input = document.querySelector('input[type="file"]');
   * const data = await CSVAdapter.loadFromFiles(input.files[0]);
   */
  static async loadFromFiles(edgeFile, nodeFile = null, options = {}) {
    try {
      // Read edge file
      const edgeCSV = await edgeFile.text();

      // Read node file if provided
      let nodeCSV = null;
      if (nodeFile) {
        nodeCSV = await nodeFile.text();
      }

      return this.fromFormat(edgeCSV, nodeCSV, options);
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  /**
   * Convert GraphData to edge list CSV
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {Object} [options={}] - Export options
   * @param {boolean} [options.header=true] - Include CSV header
   * @param {string} [options.delimiter=','] - Column delimiter
   * @returns {string} CSV text
   *
   * @example
   * const csv = CSVAdapter.toEdgeList(graphData);
   * // "source,target,weight\nA,B,1\nB,C,2"
   */
  static toEdgeList(graphData, options = {}) {
    const { header = true, delimiter = ',' } = options;
    const rows = [];

    if (header) {
      rows.push(['source', 'target', 'weight'].join(delimiter));
    }

    for (const edge of graphData.edges) {
      const source = edge.source?.id || edge.source;
      const target = edge.target?.id || edge.target;
      const weight = edge.weight || 1;
      rows.push([source, target, weight].join(delimiter));
    }

    return rows.join('\n');
  }

  /**
   * Convert GraphData nodes to CSV
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {Object} [options={}] - Export options
   * @param {boolean} [options.header=true] - Include CSV header
   * @param {string} [options.delimiter=','] - Column delimiter
   * @returns {string} CSV text
   */
  static toNodes(graphData, options = {}) {
    const { header = true, delimiter = ',' } = options;
    const { nodes } = graphData;

    if (nodes.length === 0) return '';

    const rows = [];

    // Get all unique keys from all nodes
    const keys = new Set();
    nodes.forEach(node => {
      Object.keys(node).forEach(key => keys.add(key));
    });

    const headerRow = Array.from(keys);

    if (header) {
      rows.push(headerRow.join(delimiter));
    }

    for (const node of nodes) {
      const values = headerRow.map(key => {
        const value = node[key];
        // Quote strings with commas
        if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value !== undefined && value !== null ? value : '';
      });
      rows.push(values.join(delimiter));
    }

    return rows.join('\n');
  }

  /**
   * Convert GraphData to CSV format (both edges and nodes)
   *
   * @param {import('../models/types.js').GraphData} graphData - Standard graph data
   * @param {Object} [options={}] - Export options
   * @returns {{edges: string, nodes: string}} Object with edges and nodes CSV
   */
  static toFormat(graphData, options = {}) {
    this.validateGraphData(graphData);

    return {
      edges: this.toEdgeList(graphData, options),
      nodes: this.toNodes(graphData, options)
    };
  }
}

export default CSVAdapter;
