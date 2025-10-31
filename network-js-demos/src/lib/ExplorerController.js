import { CSVAdapter, JSONAdapter, NetworkXAdapter } from '@guinetik/network-js';
import { createLogger } from '@guinetik/logger';

/**
 * Controller for the Explorer page that handles file uploads and adapter integration
 * 
 * This controller manages:
 * - Sample network loading (Caruaru, Rio, Niterói)
 * - File upload handling (CSV, JSON, NetworkX)
 * - Adapter-based data conversion
 * - Network analysis with graph-level statistics
 * - Community detection
 * - Status feedback management
 */
export class ExplorerController {
  /**
   * Creates a new ExplorerController instance
   * 
   * @param {Object} dependencies - Required dependencies
   * @param {Object} dependencies.graphManager - The graph manager (e.g., from useNetworkGraph)
   * @param {Function} dependencies.onStatusChange - Callback for status updates (message, type)
   */
  constructor({ graphManager, onStatusChange = null }) {
    this.graphManager = graphManager;
    this.onStatusChange = onStatusChange;
    this.log = createLogger({
      prefix: 'ExplorerController',
      level: import.meta.env.DEV ? 'debug' : 'info'
    });
    
    // Sample network configurations
    this.sampleNetworks = {
      caruaru: {
        name: 'Caruaru',
        file: '/data/network_caruaru.json',
        description: 'Small network (~130 edges)'
      },
      rj: {
        name: 'Rio de Janeiro',
        file: '/data/network_rj.json',
        description: 'Medium network (~1,900 edges)'
      },
      niteroi: {
        name: 'Niterói',
        file: '/data/network_niteroi.json',
        description: 'Large network (~18,500 edges)'
      }
    };

    // Worker support detection
    this.workersSupported = typeof Worker !== 'undefined';
    this.workerCount = navigator.hardwareConcurrency || 4;
  }

  /**
   * Loads a sample network by key
   * 
   * @param {string} networkKey - Key of the network to load ('caruaru', 'rj', 'niteroi')
   * @returns {Promise<Object>} Result object with success status and data
   */
  async loadSampleNetwork(networkKey) {
    const network = this.sampleNetworks[networkKey];
    
    if (!network) {
      return {
        success: false,
        error: `Unknown network: ${networkKey}`
      };
    }

    try {
      this.log.debug('Loading sample network', { networkKey, networkName: network.name });
      this._updateStatus('Loading network data...', 'info');
      
      // Fetch the JSON file (raw edge list format)
      const response = await fetch(network.file);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const edgeList = await response.json();
      
      // Convert edge list to GraphData format
      const nodeSet = new Set();
      const edges = [];

      edgeList.forEach(edge => {
        nodeSet.add(edge.source);
        nodeSet.add(edge.target);
        edges.push({
          source: String(edge.source),
          target: String(edge.target),
          weight: edge.weight || 1
        });
      });

      const nodes = Array.from(nodeSet).map(id => ({
        id: String(id),
        group: 1
      }));

      // Convert to D3 format (nodes/links)
      const d3Data = {
        nodes,
        links: edges.map(e => ({
          source: e.source,
          target: e.target,
          weight: e.weight
        }))
      };

      // Load data into graph
      this.graphManager.loadData(d3Data.nodes, d3Data.links);

      const message = `✅ Loaded ${network.name} (${nodes.length} nodes, ${edges.length} edges)`;
      this.log.info('Sample network loaded successfully', { 
        name: network.name, 
        nodeCount: nodes.length, 
        edgeCount: edges.length 
      });
      this._updateStatus(message, 'success');

      return {
        success: true,
        data: d3Data,
        name: network.name,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        description: network.description,
        useWorkers: nodes.length >= 500 && this.workersSupported
      };
    } catch (err) {
      const message = `❌ Failed to load network: ${err.message}`;
      this.log.error('Failed to load sample network', { networkKey, error: err.message, stack: err.stack });
      this._updateStatus(message, 'error');
      
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Loads a network from uploaded files using adapters
   * 
   * @param {string} format - Format type ('csv', 'json', 'networkx')
   * @param {File} edgeFile - Edge file (required for CSV, optional for others)
   * @param {File} nodeFile - Node file (optional, only for CSV)
   * @param {File} dataFile - Data file (for JSON/NetworkX)
   * @returns {Promise<Object>} Result object with success status and data
   */
  async loadUploadedNetwork(format, edgeFile, nodeFile, dataFile) {
    try {
      this.log.debug('Loading uploaded network', { format });
      this._updateStatus('Loading uploaded file...', 'info');

      let graphData;

      // Parse based on format using adapters
      if (format === 'csv') {
        if (!edgeFile) {
          throw new Error('Edges CSV file is required');
        }
        this.log.debug('Loading CSV files', { edgeFile: edgeFile.name, nodeFile: nodeFile?.name });
        graphData = await CSVAdapter.loadFromFiles(edgeFile, nodeFile || null);
      } else if (format === 'json') {
        if (!dataFile) {
          throw new Error('JSON file is required');
        }
        this.log.debug('Loading JSON file', { fileName: dataFile.name });
        const jsonText = await dataFile.text();
        const jsonData = JSON.parse(jsonText);

        // Check if it's a raw edge list array (like caruaru format)
        if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].source && jsonData[0].target) {
          this.log.debug('Detected raw edge list array format');
          // Extract nodes from edges
          const nodeSet = new Set();
          jsonData.forEach(edge => {
            nodeSet.add(edge.source);
            nodeSet.add(edge.target);
          });

          graphData = {
            nodes: Array.from(nodeSet).map(id => ({ id: String(id), group: 1 })),
            edges: jsonData.map(edge => ({
              source: String(edge.source),
              target: String(edge.target),
              weight: edge.weight || 1
            }))
          };
        } else {
          // Try standard format detection
          graphData = JSONAdapter.fromFormat(jsonData);
        }
      } else if (format === 'networkx') {
        if (!dataFile) {
          throw new Error('NetworkX JSON file is required');
        }
        this.log.debug('Loading NetworkX file', { fileName: dataFile.name });
        const jsonText = await dataFile.text();
        const jsonData = JSON.parse(jsonText);
        graphData = NetworkXAdapter.fromFormat(jsonData);
      } else {
        throw new Error(`Unknown format: ${format}`);
      }

      this.log.info('Parsed graph data', {
        nodes: graphData.nodes.length,
        edges: graphData.edges.length
      });

      // Convert to D3 format for visualization
      const nodes = graphData.nodes.map(node => ({
        ...node,
        id: String(node.id),
        group: node.group || 1
      }));

      const links = graphData.edges.map(edge => ({
        source: String(edge.source),
        target: String(edge.target),
        weight: edge.weight || 1
      }));

      // Load data into graph
      this.graphManager.loadData(nodes, links);

      const fileName = dataFile?.name || edgeFile?.name || 'uploaded file';
      const message = `✅ Loaded ${fileName} (${nodes.length} nodes, ${links.length} edges)`;
      this.log.info('Uploaded network loaded successfully', { 
        fileName,
        nodeCount: nodes.length, 
        edgeCount: links.length 
      });
      this._updateStatus(message, 'success');

      return {
        success: true,
        data: { nodes, links },
        name: fileName,
        nodeCount: nodes.length,
        edgeCount: links.length,
        description: `Uploaded ${format.toUpperCase()} file`,
        useWorkers: nodes.length >= 500 && this.workersSupported
      };
    } catch (err) {
      const message = `❌ Failed to load file: ${err.message}`;
      this.log.error('Failed to load uploaded network', { format, error: err.message, stack: err.stack });
      this._updateStatus(message, 'error');
      
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Analyzes the graph using specified metrics and includes graph-level statistics
   * 
   * @param {string[]} metrics - Array of metric names to compute
   * @param {string} sizeMetric - Metric to use for node sizing (optional)
   * @returns {Promise<Object>} Result object with success status and analysis results
   */
  async analyzeGraph(metrics = ['degree', 'eigenvector'], sizeMetric = null) {
    try {
      this.log.debug('Starting graph analysis', { metrics, sizeMetric });
      this._updateStatus('Analyzing network using workers...', 'info');
      
      const results = await this.graphManager.analyzeGraph(metrics, {
        includeGraphStats: true,
        graphStats: [
          'density',
          'diameter',
          'average_clustering',
          'average_shortest_path',
          'connected_components',
          'average_degree'
        ]
      });

      if (results) {
        const nodeCount = results.nodes.length;
        const linkCount = results.links.length;
        const avgDegree = (2 * linkCount / nodeCount).toFixed(2);

        // Update visual encoding based on size metric
        if (sizeMetric && results.nodes.some(n => n[sizeMetric] !== undefined)) {
          this.graphManager.updateVisualEncoding({
            sizeBy: sizeMetric,
            minRadius: 4,
            maxRadius: 20
          });
        }

        const message = `✅ Analysis complete! Computed ${nodeCount} node metrics`;
        this.log.info('Graph analysis complete', { 
          nodeCount, 
          metrics,
          hasGraphStats: !!results.graphStats
        });
        this._updateStatus(message, 'success');
        
        return {
          success: true,
          results,
          nodeCount,
          linkCount,
          avgDegree,
          metrics,
          graphStats: results.graphStats || {
            average_degree: parseFloat(avgDegree)
          }
        };
      }

      this.log.warn('Analysis returned no results');
      return { success: false, error: 'Analysis returned no results' };
    } catch (err) {
      const message = `❌ Analysis failed: ${err.message}`;
      this.log.error('Graph analysis failed', { error: err.message, stack: err.stack, metrics });
      this._updateStatus(message, 'error');
      
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Applies a layout algorithm to the graph
   * 
   * @param {string} layoutId - ID of the layout algorithm to apply
   * @returns {Promise<Object>} Result object with success status
   */
  async applyLayout(layoutId) {
    if (layoutId === 'none') {
      const message = 'ℹ️ Using D3 physics simulation (no layout algorithm)';
      this.log.debug('Using default D3 physics simulation');
      this._updateStatus(message, 'info');
      
      return {
        success: true,
        layoutId: 'none',
        message: 'Using default D3 physics simulation'
      };
    }

    try {
      this.log.debug('Applying layout algorithm', { layoutId });
      this._updateStatus(`Applying ${layoutId} layout...`, 'info');
      
      const success = await this.graphManager.applyLayout(layoutId);

      if (success) {
        const message = `✅ Applied ${layoutId} layout algorithm`;
        this.log.info('Layout applied successfully', { layoutId });
        this._updateStatus(message, 'success');
        
        return {
          success: true,
          layoutId
        };
      }

      this.log.warn('Layout application failed', { layoutId });
      return { success: false, error: 'Layout application failed' };
    } catch (err) {
      const message = `❌ Layout failed: ${err.message}`;
      this.log.error('Layout application failed', { layoutId, error: err.message, stack: err.stack });
      this._updateStatus(message, 'error');
      
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Detects communities in the current graph
   * 
   * @param {string} algorithmId - Algorithm ID (e.g., 'louvain')
   * @returns {Promise<Object>} Community detection results
   */
  async detectCommunities(algorithmId) {
    if (!this.graphManager.graphInstance.value) {
      this._updateStatus('Graph not initialized', 'error');
      return null;
    }

    const nodeCount = this.graphManager.getNodeIds().length;
    if (nodeCount === 0) {
      this._updateStatus('Graph is empty', 'error');
      return null;
    }

    try {
      this._updateStatus(`Detecting communities using ${algorithmId}...`, 'info');

      const result = await this.graphManager.detectCommunities(algorithmId);

      if (result) {
        const message = `Found ${result.numCommunities} communities (modularity: ${result.modularity.toFixed(3)})`;
        this._updateStatus(message, 'success');
        return result;
      } else {
        this._updateStatus('Community detection failed', 'error');
        return null;
      }
    } catch (error) {
      this.log.error('Community detection failed', { 
        algorithmId, 
        error: error.message, 
        stack: error.stack 
      });
      this._updateStatus(`Error: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Gets available layout algorithms
   * 
   * @returns {Array} Array of layout objects with id, name, and description
   */
  getAvailableLayouts() {
    return this.graphManager.getAvailableLayouts();
  }

  /**
   * Gets available community detection algorithms
   * 
   * @returns {Array} Array of algorithm metadata objects
   */
  getAvailableCommunityAlgorithms() {
    return this.graphManager.getAvailableCommunityAlgorithms();
  }

  /**
   * Gets worker support information
   * 
   * @returns {Object} Worker support info
   */
  getWorkerInfo() {
    return {
      supported: this.workersSupported,
      count: this.workerCount
    };
  }

  /**
   * Updates status via callback if provided
   * 
   * @param {string} message - Status message
   * @param {string} type - Status type ('info', 'success', 'error')
   * @private
   */
  _updateStatus(message, type) {
    if (this.onStatusChange) {
      this.onStatusChange(message, type);
    }
  }
}

