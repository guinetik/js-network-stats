/**
 * CSVAdapter - Parse CSV files into network graph format
 *
 * Supports two CSV formats:
 * 1. Edge list (most common): source,target,weight
 * 2. Adjacency list: node,neighbor1,neighbor2,...
 *
 * Much more efficient than JSON for large graphs!
 *
 * @example
 * // Edge list format:
 * source,target,weight
 * Alice,Bob,1
 * Bob,Charlie,2
 *
 * // Node properties (optional):
 * id,group,label
 * Alice,1,Alice Smith
 * Bob,2,Bob Jones
 */

export class CSVAdapter {
  /**
   * Parse CSV text into rows
   *
   * @private
   * @param {string} csvText - Raw CSV text
   * @returns {Array<Array<string>>} Array of rows (each row is array of values)
   */
  static parseCSV(csvText) {
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
        } else if (char === ',' && !inQuotes) {
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
   * @param {Object} [options={}] - Parsing options
   * @param {boolean} [options.hasHeader=true] - Whether first row is header
   * @param {number} [options.defaultWeight=1] - Default edge weight
   * @returns {Object} Network data {nodes, links}
   *
   * @example
   * const csv = `
   * source,target,weight
   * A,B,1
   * B,C,2
   * `;
   * const data = CSVAdapter.parseEdgeList(csv);
   * // { nodes: [{id: 'A'}, {id: 'B'}, {id: 'C'}],
   * //   links: [{source: 'A', target: 'B', weight: 1}, ...] }
   */
  static parseEdgeList(csvText, options = {}) {
    const { hasHeader = true, defaultWeight = 1 } = options;
    const rows = this.parseCSV(csvText);

    // Skip header if present
    const dataRows = hasHeader ? rows.slice(1) : rows;

    // Collect unique nodes and links
    const nodeSet = new Set();
    const links = [];

    for (const row of dataRows) {
      if (row.length < 2) continue; // Skip invalid rows

      const source = row[0];
      const target = row[1];
      const weight = row[2] ? parseFloat(row[2]) : defaultWeight;

      nodeSet.add(source);
      nodeSet.add(target);

      links.push({
        source,
        target,
        weight: isNaN(weight) ? defaultWeight : weight
      });
    }

    // Convert node set to array of node objects
    const nodes = Array.from(nodeSet).map((id, index) => ({
      id,
      group: 1 // Default group
    }));

    return { nodes, links };
  }

  /**
   * Parse node properties CSV format
   * Expected columns: id,group,label (any additional columns become properties)
   *
   * @param {string} csvText - CSV text content
   * @param {Object} [options={}] - Parsing options
   * @param {boolean} [options.hasHeader=true] - Whether first row is header
   * @returns {Array<Object>} Array of node objects
   *
   * @example
   * const csv = `
   * id,group,label
   * A,1,Alice
   * B,2,Bob
   * `;
   * const nodes = CSVAdapter.parseNodes(csv);
   * // [{id: 'A', group: 1, label: 'Alice'}, {id: 'B', group: 2, label: 'Bob'}]
   */
  static parseNodes(csvText, options = {}) {
    const { hasHeader = true } = options;
    const rows = this.parseCSV(csvText);

    if (rows.length === 0) return [];

    // Get header row
    const header = hasHeader ? rows[0] : ['id', 'group', 'label'];
    const dataRows = hasHeader ? rows.slice(1) : rows;

    // Parse each row into node object
    const nodes = dataRows.map(row => {
      const node = {};

      for (let i = 0; i < header.length; i++) {
        const key = header[i];
        const value = row[i];

        // Convert numbers
        if (key === 'group' && value) {
          node[key] = parseInt(value);
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
   * Parse a complete network from separate edge and node CSV files
   *
   * @param {string} edgeCSV - Edge list CSV content
   * @param {string} nodeCSV - Node properties CSV content (optional)
   * @param {Object} [options={}] - Parsing options
   * @returns {Object} Network data {nodes, links}
   *
   * @example
   * const edges = "source,target,weight\nA,B,1";
   * const nodes = "id,group,label\nA,1,Alice\nB,2,Bob";
   * const data = CSVAdapter.parseNetwork(edges, nodes);
   */
  static parseNetwork(edgeCSV, nodeCSV = null, options = {}) {
    // Parse edges first
    const { nodes: edgeNodes, links } = this.parseEdgeList(edgeCSV, options);

    // If node CSV provided, use it
    if (nodeCSV) {
      const nodeList = this.parseNodes(nodeCSV, options);

      // Create map of parsed nodes
      const nodeMap = new Map(nodeList.map(n => [n.id, n]));

      // Merge with edge nodes (keep all nodes from edges, add properties from node list)
      const nodes = edgeNodes.map(node => {
        const parsedNode = nodeMap.get(node.id);
        return parsedNode ? { ...node, ...parsedNode } : node;
      });

      return { nodes, links };
    }

    return { nodes: edgeNodes, links };
  }

  /**
   * Load network from CSV file(s)
   *
   * @param {string} edgeURL - URL to edge list CSV file
   * @param {string} [nodeURL=null] - URL to node properties CSV file (optional)
   * @param {Object} [options={}] - Parsing options
   * @returns {Promise<Object>} Network data {nodes, links}
   *
   * @example
   * const data = await CSVAdapter.loadFromURL('../data/edges.csv', '../data/nodes.csv');
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

      return this.parseNetwork(edgeCSV, nodeCSV, options);
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
   * @param {Object} [options={}] - Parsing options
   * @returns {Promise<Object>} Network data {nodes, links}
   *
   * @example
   * const input = document.querySelector('input[type="file"]');
   * const data = await CSVAdapter.loadFromFile(input.files[0]);
   */
  static async loadFromFile(edgeFile, nodeFile = null, options = {}) {
    try {
      // Read edge file
      const edgeCSV = await edgeFile.text();

      // Read node file if provided
      let nodeCSV = null;
      if (nodeFile) {
        nodeCSV = await nodeFile.text();
      }

      return this.parseNetwork(edgeCSV, nodeCSV, options);
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  /**
   * Convert network data to edge list CSV
   *
   * @param {Array<Object>} links - Array of link objects
   * @param {boolean} [includeHeader=true] - Include CSV header
   * @returns {string} CSV text
   *
   * @example
   * const links = [{source: 'A', target: 'B', weight: 1}];
   * const csv = CSVAdapter.toEdgeListCSV(links);
   * // "source,target,weight\nA,B,1"
   */
  static toEdgeListCSV(links, includeHeader = true) {
    const rows = [];

    if (includeHeader) {
      rows.push('source,target,weight');
    }

    for (const link of links) {
      const source = link.source?.id || link.source;
      const target = link.target?.id || link.target;
      const weight = link.weight || 1;
      rows.push(`${source},${target},${weight}`);
    }

    return rows.join('\n');
  }

  /**
   * Convert network data to node properties CSV
   *
   * @param {Array<Object>} nodes - Array of node objects
   * @param {boolean} [includeHeader=true] - Include CSV header
   * @returns {string} CSV text
   */
  static toNodesCSV(nodes, includeHeader = true) {
    if (nodes.length === 0) return '';

    const rows = [];

    // Get all unique keys
    const keys = new Set();
    nodes.forEach(node => {
      Object.keys(node).forEach(key => keys.add(key));
    });

    const header = Array.from(keys);

    if (includeHeader) {
      rows.push(header.join(','));
    }

    for (const node of nodes) {
      const values = header.map(key => {
        const value = node[key];
        // Quote strings with commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value !== undefined ? value : '';
      });
      rows.push(values.join(','));
    }

    return rows.join('\n');
  }
}

export default CSVAdapter;
