import * as d3 from 'd3';
import { Graph, ForceDirectedLayout, CircularLayout, RandomLayout, SpiralLayout, ShellLayout, SpectralLayout, KamadaKawaiLayout, BipartiteLayout, MultipartiteLayout, BFSLayout, LAYOUT_REGISTRY } from '../../network-js/src/index.js';
// Import worker URL for Vite
import workerUrl from '../../network-js/src/compute/network-worker.js?worker&url';

// Network configurations
const NETWORKS = {
  caruaru: {
    name: 'Caruaru',
    file: '../data/network_caruaru.json',
    description: 'Small network (~130 edges)'
  },
  rj: {
    name: 'Rio de Janeiro',
    file: '../data/network_rj.json',
    description: 'Medium network (~1,900 edges)'
  },
  niteroi: {
    name: 'Niterói',
    file: '../data/network_niteroi.json',
    description: 'Large network (~18,500 edges)'
  }
};

// Alpine.js component for Brazilian Networks controls
export function createBrazilianNetworksApp(graph) {
  return {
    // Data properties
    selectedNetwork: '',
    selectedLayout: 'none',
    availableLayouts: LAYOUT_REGISTRY.getAll(),  // Get all layouts from registry
    selectedFeatures: [],
    selectedSizeMetric: '',  // NEW: Metric to use for node sizing
    selectedCommunityAlgorithm: 'louvain',
    networkLoaded: false,
    analyzing: false,
    detectingCommunities: false,
    isLoading: false,
    progress: 0,
    progressText: '',

    // Network data
    networkData: null,
    analysisResults: null,
    communityResults: null,

    // Stats
    stats: {
      nodes: 0,
      edges: 0,
      avgDegree: 0,
      analysisTime: '-',
      communityTime: '-',
      modularity: null,
      communities: null
    },

    // Graph-level stats
    graphStats: null,
    hasGraphStats: false,

    // Worker info
    workersSupported: false,
    workerCount: 0,
    useWorkers: false,

    // Selected node
    selectedNode: null,

    // Community detection
    hasCommunities: false,

    // Layout state (prevent infinite loops)
    isApplyingLayout: false,

    // Node info display (reactive)
    nodeInfo: {
      type: 'default',
      message: 'Select a network to begin...',
      details: null
    },

    // Initialization
    init() {
      // Check worker support
      this.workersSupported = typeof Worker !== 'undefined';
      this.workerCount = navigator.hardwareConcurrency || 4;

      // Set up node info callback
      graph.setNodeInfoCallback = (node) => {
        this.selectedNode = node;
        this.setNodeInfo('node-hover', `Node: ${node.id}`, {
          id: node.id,
          group: node.group || 1,
          community: this.hasCommunities ? node.modularity : null,
          centrality: node.centrality?.toFixed(4) || 'N/A',
          // Node-level stats
          degree: node.degree || 'N/A',
          betweenness: node.betweenness?.toFixed(4),
          clustering: node.clustering?.toFixed(3),
          eigenvector: node.eigenvector?.toFixed(4),
          cliques: node.cliques,
          // NEW: Additional stats from new architecture
          closeness: node.closeness?.toFixed(4),
          egoDensity: node['ego-density']?.toFixed(3)
        });
      };

      graph.setNodeInfoHideCallback = () => {
        this.selectedNode = null;
        if (!this.networkLoaded) {
          this.setNodeInfo('default', 'Select a network to begin...');
        } else {
          this.setNodeInfo('default', 'Hover over a node to see details...');
        }
      };
    },

    // Update node info display
    setNodeInfo(type, message, details = null) {
      this.nodeInfo = { type, message, details };
    },

    async loadNetwork() {
      if (!this.selectedNetwork) return;

      this.isLoading = true;
      this.networkLoaded = false;
      this.selectedNode = null;
      this.setNodeInfo('loading', 'Loading network data...');

      try {
        const config = NETWORKS[this.selectedNetwork];
        console.log('Loading network:', config.name);

        const response = await fetch(config.file);
        this.networkData = await response.json();

        // Convert edge list to D3 format
        const nodesSet = new Set();
        const links = [];

        this.networkData.forEach(edge => {
          nodesSet.add(edge.source);
          nodesSet.add(edge.target);
          links.push({
            source: edge.source,
            target: edge.target,
            weight: edge.weight || 1
          });
        });

        const nodes = Array.from(nodesSet).map(id => ({
          id,
          group: 1
        }));

        // Update stats
        this.stats = {
          nodes: nodes.length,
          edges: links.length,
          avgDegree: (2 * links.length / nodes.length).toFixed(2),
          analysisTime: '-'
        };

        // Determine if workers will be used
        this.useWorkers = nodes.length >= 500 && this.workersSupported;

        // Load data into NetworkGraph WITHOUT calculating stats
        // Just show the structure - stats calculated only when user clicks "Analyze Network"
        graph.data.nodes = nodes;
        graph.data.links = links;

        // Set loading indicator to "Calculating layout..."
        this.setNodeInfo('loading', 'Calculating graph layout...');

        // Set callback for when graph calculation completes
        graph.onCalculationComplete = async () => {
          this.networkLoaded = true;
          this.isLoading = false;
          this.setNodeInfo('success', `Loaded: ${config.name}`, {
            nodes: nodes.length,
            edges: links.length,
            description: config.description
          });
          console.log('Network loaded successfully (structure only, no stats calculated)');

          // Auto-apply selected layout if it's not "none" AND we're not already applying a layout
          if (this.selectedLayout !== 'none' && !this.isApplyingLayout) {
            console.log(`Auto-applying selected layout: ${this.selectedLayout}`);
            // Small delay to ensure graph is fully rendered
            setTimeout(() => {
              this.applyLayoutAlgorithm();
            }, 100);
          }
        };

        // Render the graph structure (no metrics calculation - pass false)
        graph.updateGraph(false);

        // Don't set isLoading = false yet - wait for calculation to complete
        this.hasCommunities = false;
        this.analysisResults = null;

        // Reset stats
        this.stats.analysisTime = '-';
        this.stats.modularity = null;
        this.stats.communities = null;

      } catch (error) {
        console.error('Error loading network:', error);
        this.setNodeInfo('error', `Failed to load network: ${error.message}`);
        this.isLoading = false;
      }
    },

    async analyzeNetwork() {
      if (!this.networkLoaded || this.selectedFeatures.length === 0) {
        alert('Please load a network and select at least one metric');
        return;
      }

      this.analyzing = true;
      this.progress = 0;
      this.progressText = 'Calculating metrics...';
      this.setNodeInfo('loading', 'Running network analysis...');

      const startTime = performance.now();

      try {
        const { NetworkStats } = await import('@guinetik/network-js');
        const analyzer = new NetworkStats({
          verbose: false,
          workerScript: workerUrl
        });

        // Analyze with selected features + graph-level stats
        const results = await analyzer.analyze(this.networkData, this.selectedFeatures, {
          includeGraphStats: true,
          graphStats: ['density', 'diameter', 'average_clustering', 'average_shortest_path', 'connected_components', 'average_degree']
        });

        const duration = performance.now() - startTime;
        this.stats.analysisTime = `${(duration / 1000).toFixed(2)}s`;

        // Store results
        this.analysisResults = results.nodes;
        this.graphStats = results.graph;
        this.hasGraphStats = true;

        // Create a map of results by node ID
        const resultsMap = new Map();
        results.nodes.forEach(nodeResult => {
          resultsMap.set(nodeResult.id.toString(), nodeResult);
        });

        console.log('Analysis complete. Sample node result:', results.nodes[0]);

        // Apply all metrics to graph nodes
        graph.data.nodes.forEach(node => {
          const result = resultsMap.get(node.id.toString());
          if (result) {
            Object.assign(node, result);
          }
        });

        // Debug: check if laplacian data was merged
        if (this.selectedFeatures.includes('eigenvector-laplacian')) {
          console.log('Eigenvector-laplacian selected. Sample node after merge:', graph.data.nodes[0]);
        }

        // Calculate primary metric for node sizing (use selected size metric or first feature)
        const primaryMetric = this.selectedSizeMetric || this.selectedFeatures[0];
        if (primaryMetric) {
          const values = graph.data.nodes
            .map(n => n[primaryMetric])
            .filter(v => v !== undefined && !isNaN(v));

          if (values.length > 0) {
            const min = Math.min(...values);
            const max = Math.max(...values);

            graph.data.nodes.forEach(node => {
              const value = node[primaryMetric];
              if (value !== undefined && !isNaN(value)) {
                // Normalize to 0-1 range for centrality
                node.centrality = max > min ? (value - min) / (max - min) : 0.5;
              }
            });
          }
        }

        // Force re-render of the graph with new sizes
        graph.updateGraph(false);

        // Explicitly update node sizes
        graph.nodeGroup.selectAll('circle')
          .transition()
          .duration(300)
          .attr('r', d => 4 + d.centrality * 12);

        this.analyzing = false;
        this.progressText = 'Complete!';

        this.setNodeInfo('success', 'Analysis complete', {
          nodes: graph.data.nodes.length,
          edges: graph.data.links.length,
          time: this.stats.analysisTime,
          metric: primaryMetric
        });

        console.log('Analysis complete', {
          features: this.selectedFeatures,
          primaryMetric,
          sampleNode: graph.data.nodes[0]
        });
      } catch (error) {
        console.error('Analysis error:', error);
        this.setNodeInfo('error', `Analysis failed: ${error.message}`);
        this.analyzing = false;
      }
    },

    async detectCommunities() {
      if (!this.networkLoaded) {
        alert('Please load a network first');
        return;
      }

      this.detectingCommunities = true;
      this.setNodeInfo('loading', 'Detecting communities...');

      const startTime = performance.now();

      try {
        const { NetworkStats } = await import('@guinetik/network-js');
        const analyzer = new NetworkStats({
          verbose: false,
          workerScript: workerUrl
        });

        // Run community detection
        const results = await analyzer.analyze(this.networkData, ['modularity']);

        const duration = performance.now() - startTime;
        this.stats.communityTime = `${(duration / 1000).toFixed(2)}s`;

        // Store community results
        this.communityResults = results;

        // Create a map of results by node ID
        const resultsMap = new Map();
        results.forEach(nodeResult => {
          resultsMap.set(nodeResult.id.toString(), nodeResult);
        });

        // Count unique communities and calculate modularity
        const communitySet = new Set();
        let totalModularity = 0;

        results.forEach(nodeResult => {
          if (nodeResult.modularity !== undefined) {
            communitySet.add(nodeResult.modularity);
            totalModularity += nodeResult.modularity;
          }
        });

        this.stats.communities = communitySet.size;
        this.stats.modularity = (totalModularity / results.length).toFixed(3);
        this.hasCommunities = true;

        // Apply community colors to graph nodes
        graph.data.nodes.forEach(node => {
          const result = resultsMap.get(node.id.toString());
          if (result && result.modularity !== undefined) {
            node.group = result.modularity;  // Use community as group for coloring
            node.modularity = result.modularity;  // Store for hover info
          }
        });

        // Force complete re-render to update colors
        graph.updateGraph(false);

        // Explicitly re-apply theme colors to ALL nodes
        graph.theme.applyNodeColors(graph.nodeGroup.selectAll('circle'));

        this.detectingCommunities = false;

        // Don't show in temporary info box - it's in the persistent community box now
        this.setNodeInfo('default', 'Hover over a node to see details...');

        console.log('Community detection complete', {
          algorithm: this.selectedCommunityAlgorithm,
          communities: this.stats.communities,
          modularity: this.stats.modularity
        });
      } catch (error) {
        console.error('Community detection error:', error);
        this.setNodeInfo('error', `Community detection failed: ${error.message}`);
        this.detectingCommunities = false;
      }
    },

    async applyLayoutAlgorithm() {
      // Set flag to prevent infinite loops
      this.isApplyingLayout = true;

      const container = document.getElementById('graph-container');
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Handle "None" - re-enable D3 physics
      if (this.selectedLayout === 'none') {
        // Clear custom layout flag
        graph.customLayoutActive = false;

        // Unfix all nodes
        graph.data.nodes.forEach(node => {
          node.fx = null;
          node.fy = null;
        });

        // Re-enable ALL D3 forces and properly update the simulation
        graph.simulation.nodes(graph.data.nodes);
        graph.simulation
          .force('charge', d3.forceManyBody().strength(-500).distanceMax(800))
          .force('link', d3.forceLink(graph.data.links).id(d => d.id).distance(100).strength(0.8))
          .force('center', d3.forceCenter(width / 2, height / 2).strength(0.3))
          .force('x', d3.forceX(width / 2).strength(0.1))
          .force('y', d3.forceY(height / 2).strength(0.1))
          .force('collision', d3.forceCollide().radius(d => 6 + (d.centrality || 0.5) * 14).strength(0.9))
          .force('boundary', graph.createBoundaryForce())
          .alpha(1)
          .alphaTarget(0)
          .restart();

        this.setNodeInfo('layout-applied', 'Layout: D3 Physics', {
          description: "Using D3's built-in force simulation"
        });

        // Clear flag
        this.isApplyingLayout = false;
        return;
      }

      // Show loading state for custom layouts
      graph.hideGraphDuringCalculation();
      this.setNodeInfo('loading', 'Calculating layout positions...');

      // Build Graph object from current data
      const currentGraph = new Graph();

      // Add all nodes
      graph.data.nodes.forEach(node => {
        currentGraph.addNode(node.id);
      });

      // Add all edges
      graph.data.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        currentGraph.addEdge(sourceId, targetId, link.weight || 1);
      });

      // Create appropriate layout
      let layout;
      let layoutName;

      // Use smaller of width/height to determine scale
      const scale = Math.min(width, height) / 2.5;

      switch (this.selectedLayout) {
        case 'random':
          layout = new RandomLayout(currentGraph, {
            scale: scale,
            center: { x: width / 2, y: height / 2 }
          });
          layoutName = 'Random';
          break;

        case 'circular':
          layout = new CircularLayout(currentGraph, {
            scale: scale,
            center: { x: width / 2, y: height / 2 }
          });
          layoutName = 'Circular';
          break;

        case 'spiral':
          layout = new SpiralLayout(currentGraph, {
            scale: scale,
            center: { x: width / 2, y: height / 2 },
            resolution: 0.15  // Looser spiral (lower = fewer rotations per node)
          });
          layoutName = 'Spiral';
          break;

        case 'shell':
          // Build nodeProperties map from visualization nodes if stats are available
          const nodePropsMap = new Map();
          graph.data.nodes.forEach(node => {
            if (node.degree !== undefined) {
              nodePropsMap.set(node.id, { degree: node.degree });
            }
          });

          layout = new ShellLayout(currentGraph, {
            scale: scale,
            center: { x: width / 2, y: height / 2 },
            nodeProperties: nodePropsMap.size > 0 ? nodePropsMap : null
          });
          layoutName = 'Shell';
          break;

        case 'spectral':
          // Build nodeProperties map with Laplacian eigenvector coordinates if available
          const spectralPropsMap = new Map();
          let hasSpectralData = false;
          console.log('Checking spectral data on', graph.data.nodes.length, 'nodes');
          graph.data.nodes.forEach(node => {
            if (node.laplacian_x !== undefined && node.laplacian_y !== undefined) {
              spectralPropsMap.set(node.id, {
                laplacian_x: node.laplacian_x,
                laplacian_y: node.laplacian_y
              });
              hasSpectralData = true;
            }
          });

          console.log('Spectral data found:', hasSpectralData, 'nodes with data:', spectralPropsMap.size);

          if (!hasSpectralData) {
            this.setNodeInfo('error', 'Spectral layout requires eigenvector-laplacian stat. Include it in "Analyze Network".');
            graph.showGraphAfterCalculation();  // Show graph again since we're not proceeding with layout
            this.isApplyingLayout = false;
            return;
          }

          layout = new SpectralLayout(currentGraph, {
            scale: scale,
            center: { x: width / 2, y: height / 2 },
            nodeProperties: spectralPropsMap.size > 0 ? spectralPropsMap : null
          });
          layoutName = 'Spectral';
          console.log('SpectralLayout created, computing positions...');
          break;

        case 'kamada-kawai':
          layout = new KamadaKawaiLayout(currentGraph, {
            iterations: 100,
            scale: scale,
            center: { x: width / 2, y: height / 2 }
          });
          layoutName = 'Kamada-Kawai';
          break;

        case 'bipartite':
          layout = new BipartiteLayout(currentGraph, {
            align: 'vertical',
            scale: scale,
            center: { x: width / 2, y: height / 2 }
          });
          layoutName = 'Bipartite';
          break;

        case 'multipartite':
          layout = new MultipartiteLayout(currentGraph, {
            align: 'vertical',
            scale: scale,
            center: { x: width / 2, y: height / 2 }
          });
          layoutName = 'Multipartite';
          break;

        case 'bfs':
          // Use first node as start for BFS
          const firstNode = Array.from(currentGraph.nodes)[0];
          layout = new BFSLayout(currentGraph, {
            startNode: firstNode,
            align: 'vertical',
            scale: scale,
            center: { x: width / 2, y: height / 2 }
          });
          layoutName = 'BFS Layout';
          break;

        default:
          layout = new ForceDirectedLayout(currentGraph, {
            iterations: 50,
            scale: scale,
            center: { x: width / 2, y: height / 2 }
          });
          layoutName = 'Force-Directed';
      }

      // Compute positions
      const positions = await layout.getPositions();

      // Set custom layout flag to prevent D3 simulation from restarting
      graph.customLayoutActive = true;

      // DISABLE ALL D3 forces to prevent interference
      graph.simulation
        .force('charge', null)
        .force('link', null)
        .force('center', null)
        .force('x', null)
        .force('y', null)
        .force('collision', null)
        .force('boundary', null)
        .alpha(0)           // Set energy to 0
        .alphaTarget(0)     // Disable heating
        .stop();            // Stop the simulation

      // Apply positions to nodes and FIX them in place
      graph.data.nodes.forEach(node => {
        const pos = positions[node.id];
        if (pos) {
          node.x = pos.x;
          node.y = pos.y;
          node.fx = pos.x;
          node.fy = pos.y;
        }
      });

      // Show graph now that positions are calculated
      graph.showGraphAfterCalculation();

      // Update visualization (will happen in showGraphAfterCalculation, but call again to ensure)
      graph.updatePositions();

      // Update info
      this.setNodeInfo('layout-applied', `Layout Applied: ${layoutName}`, {
        description: 'Nodes fixed in position (D3 physics disabled)'
      });

      // Clear flag
      this.isApplyingLayout = false;
    }
  };
}
