import * as d3 from 'd3';
import { Graph, ForceDirectedLayout, CircularLayout, RandomLayout, SpiralLayout, ShellLayout, NetworkStats, CSVAdapter } from '../../network-js/src/index.js';

// Alpine.js component for Network Graph controls
export function createNetworkGraphApp(graph, initialData) {
    return {
        // Data properties
        selectedDataset: 'default',
        selectedLayout: 'none',
        isLoading: false,

        // Node info display (reactive)
        nodeInfo: {
            type: 'default', // 'default', 'loading', 'success', 'error', 'node-added', 'node-removed', 'layout-applied', 'node-hover'
            message: 'Hover over a node to see details...',
            details: null
        },

        // Name counter for dynamic node creation
        nameCounter: 1,

        // Layout state (prevent infinite loops)
        isApplyingLayout: false,

        // Initialization
        init() {
            // Store reference to initial data
            this.initialData = initialData;
            // Theme is already set up in NetworkGraph and will handle updates automatically

            // Set up node info callback to connect D3 hover events to Alpine state
            graph.setNodeInfoCallback = (node) => {
                this.setNodeInfo('node-hover', `Node: ${node.id}`, {
                    id: node.id,
                    group: node.group,
                    centrality: node.centrality.toFixed(4),
                    degree: node.degree || 'N/A'
                });
            };

            // Set up hide callback to reset state when mouse leaves node
            graph.setNodeInfoHideCallback = () => {
                this.setNodeInfo('default', 'Hover over a node to see details...');
            };
        },

        // Community detection function (NOW ASYNC!)
        async detectCommunities(graphData) {
            try {
                // Convert to NetworkStats format (edge list)
                const network = graphData.links.map(link => ({
                    source: typeof link.source === 'object' ? link.source.id : link.source,
                    target: typeof link.target === 'object' ? link.target.id : link.target,
                    weight: link.weight || 1
                }));

                // Run modularity (community detection) - NOW WITH AWAIT!
                const analyzer = new NetworkStats({ verbose: false });
                const stats = await analyzer.analyze(network, ['modularity']);

                // Extract community assignments
                const communities = {};
                stats.forEach(nodeStat => {
                    communities[nodeStat.id] = nodeStat.modularity;
                });

                return communities;
            } catch (error) {
                console.error('Community detection failed:', error);
                // Return default communities (all nodes in group 1)
                const communities = {};
                graphData.nodes.forEach(node => {
                    communities[node.id] = 1;
                });
                return communities;
            }
        },

        // Update node info display
        setNodeInfo(type, message, details = null) {
            this.nodeInfo = { type, message, details };
        },

        // Control methods
        addRandomNode() {
            const newNodeId = `Node${graph.data.nodes.length + 1}`;
            const randomExisting = graph.data.nodes[Math.floor(Math.random() * graph.data.nodes.length)];

            graph.addNode([randomExisting.id], newNodeId, Math.floor(Math.random() * 5) + 1);

            this.setNodeInfo('node-added', 'Node Added', {
                nodeId: newNodeId,
                connectedTo: randomExisting.id
            });
        },

        addSpecificNode() {
            const aliceNode = graph.data.nodes.find(n => n.id === 'Alice');
            if (!aliceNode) {
                this.setNodeInfo('error', '"Alice" node not found in current graph');
                return;
            }

            const newNodeId = `Friend${graph.data.nodes.length + 1}`;
            graph.addNode(['Alice'], newNodeId, 2);

            this.setNodeInfo('node-added', 'Node Added to Alice', {
                nodeId: newNodeId,
                connectedTo: 'Alice'
            });
        },

        removeRandomNode() {
            if (graph.data.nodes.length <= 1) {
                this.setNodeInfo('error', 'Cannot remove - graph needs at least one node');
                return;
            }

            const randomNode = graph.data.nodes[Math.floor(Math.random() * graph.data.nodes.length)];
            const nodeId = randomNode.id;

            graph.removeNode(nodeId);

            this.setNodeInfo('node-removed', 'Node Removed', {
                nodeId: nodeId
            });
        },

        async loadData() {
            this.isLoading = true;
            this.setNodeInfo('loading', 'Please wait');

            let newData;

            try {
                if (this.selectedDataset === 'karate-json') {
                    // Load karate club data from JSON
                    const response = await fetch('../data/karateclub.json');
                    const karateData = await response.json();

                    // Convert node IDs to strings and add group from club property
                    newData = {
                        nodes: karateData.nodes.map(node => ({
                            id: String(node.id),
                            group: node.club === 'Mr. Hi' ? 1 : 2
                        })),
                        links: karateData.links.map(link => ({
                            source: String(link.source),
                            target: String(link.target),
                            weight: link.weight
                        }))
                    };

                    this.setNodeInfo('success', 'Loaded: Karate Club (JSON)', {
                        nodes: newData.nodes.length,
                        edges: newData.links.length,
                        description: "Zachary's famous social network"
                    });

                } else if (this.selectedDataset === 'karate-csv') {
                    // Load karate club data from CSV
                    newData = await CSVAdapter.loadFromURL(
                        '../data/karate-edges.csv',
                        '../data/karate-nodes.csv'
                    );

                    // Convert node IDs to strings and rename edges to links for D3
                    newData.nodes = newData.nodes.map(node => ({
                        ...node,
                        id: String(node.id)
                    }));
                    newData.links = newData.edges.map(edge => ({
                        ...edge,
                        source: String(edge.source),
                        target: String(edge.target)
                    }));
                    delete newData.edges;

                    // Detect communities using modularity (AWAIT!)
                    const communities = await this.detectCommunities(newData);

                    // Apply community groups to nodes
                    newData.nodes = newData.nodes.map(node => ({
                        ...node,
                        group: communities[node.id] || 1
                    }));

                    // Count unique communities
                    const uniqueCommunities = new Set(Object.values(communities));

                    this.setNodeInfo('success', 'Loaded: Karate Club (CSV)', {
                        nodes: newData.nodes.length,
                        edges: newData.links.length,
                        communities: uniqueCommunities.size,
                        description: 'Loaded from CSV - Much more efficient! 🚀'
                    });

                } else if (this.selectedDataset === 'miserables') {
                    // Load Les Misérables data from CSV
                    newData = await CSVAdapter.loadFromURL('../data/les_miserables.csv');

                    // Convert node IDs to strings and rename edges to links for D3
                    newData.nodes = newData.nodes.map(node => ({
                        ...node,
                        id: String(node.id)
                    }));
                    newData.links = newData.edges.map(edge => ({
                        ...edge,
                        source: String(edge.source),
                        target: String(edge.target)
                    }));
                    delete newData.edges;

                    // Detect communities using modularity (AWAIT!)
                    const communities = await this.detectCommunities(newData);

                    // Apply community groups to nodes
                    newData.nodes = newData.nodes.map(node => ({
                        ...node,
                        group: communities[node.id] || 1
                    }));

                    // Count unique communities
                    const uniqueCommunities = new Set(Object.values(communities));

                    this.setNodeInfo('success', 'Loaded: Les Misérables (CSV)', {
                        nodes: newData.nodes.length,
                        edges: newData.links.length,
                        communities: uniqueCommunities.size,
                        description: "Character co-appearance network from Victor Hugo's novel"
                    });

                } else {
                    // Use default data
                    newData = this.initialData;
                    this.setNodeInfo('success', 'Loaded: Default', {
                        nodes: newData.nodes.length,
                        edges: newData.links.length
                    });
                }

                // Reset name counter
                this.nameCounter = 1;

                // Load new data into graph
                graph.setData(newData.nodes, newData.links);
                // Theme will automatically apply colors

                // Auto-apply selected layout if it's not "none" AND we're not already applying a layout
                if (this.selectedLayout !== 'none' && !this.isApplyingLayout) {
                    console.log(`Auto-applying selected layout: ${this.selectedLayout}`);
                    // Small delay to ensure graph is fully rendered
                    setTimeout(() => {
                        this.applyLayoutAlgorithm();
                    }, 500);
                }

            } catch (error) {
                console.error('Failed to load dataset:', error);
                this.setNodeInfo('error', `Failed to load ${this.selectedDataset} dataset`);
            }

            this.isLoading = false;
        },

        async applyLayoutAlgorithm() {
            // Set flag to prevent infinite loops
            this.isApplyingLayout = true;

            const container = document.getElementById('graph-container');
            const width = container.clientWidth;
            const height = container.clientHeight;

            // Handle "None" - re-enable D3 physics (no loading needed)
            if (this.selectedLayout === 'none') {
                // Clear custom layout flag
                graph.customLayoutActive = false;

                // Unfix all nodes
                graph.data.nodes.forEach(node => {
                    node.fx = null;
                    node.fy = null;
                });

                // Re-enable all D3 forces (matching initSimulation configuration)
                graph.simulation
                    .force('charge', d3.forceManyBody().strength(-800).distanceMax(800))
                    .force('link', d3.forceLink(graph.data.links).id(d => d.id).distance(100).strength(0.5))
                    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
                    .force('x', d3.forceX(width / 2).strength(0.03))
                    .force('y', d3.forceY(height / 2).strength(0.03))
                    .force('collision', d3.forceCollide().radius(d => 6 + (d.centrality || 0) * 14).strength(0.7))
                    .force('boundary', graph.createBoundaryForce())
                    .alpha(1)
                    .restart();

                this.setNodeInfo('layout-applied', 'Layout: D3 Physics', {
                    description: "Using D3's built-in force simulation"
                });

                // Clear flag
                this.isApplyingLayout = false;

                // Theme will automatically handle colors
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

            // DISABLE D3 forces to prevent interference
            graph.simulation
                .force('charge', null)
                .force('link', null)
                .force('x', null)
                .force('y', null)
                .stop();

            // Apply positions to nodes and FIX them in place
            graph.data.nodes.forEach(node => {
                const pos = positions[node.id];
                if (pos) {
                    node.x = pos.x;
                    node.y = pos.y;
                    node.fx = pos.x; // Fix position permanently
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

            // Theme will automatically handle colors
        }
    };
}
