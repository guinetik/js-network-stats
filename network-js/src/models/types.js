/**
 * Type definitions for @guinetik/network-js
 *
 * This file provides JSDoc type definitions for the entire library.
 * No runtime code - just types for documentation and IDE support.
 */

/**
 * Standard graph data format used throughout the library.
 * This is the canonical format for representing graphs.
 *
 * @typedef {Object} GraphData
 * @property {NodeData[]} nodes - Array of nodes in the graph
 * @property {EdgeData[]} edges - Array of edges in the graph
 *
 * @example
 * const graphData = {
 *   nodes: [
 *     { id: 'A', label: 'Node A', size: 10 },
 *     { id: 'B', label: 'Node B', size: 5 }
 *   ],
 *   edges: [
 *     { source: 'A', target: 'B', weight: 1.5 }
 *   ]
 * };
 */

/**
 * Represents a node in the graph.
 *
 * @typedef {Object} NodeData
 * @property {string|number} id - Unique identifier for the node
 * @property {string} [label] - Optional display label
 * @property {number} [group] - Optional group/community identifier
 * @property {*} [attributes] - Any additional node attributes
 *
 * @example
 * const node = {
 *   id: 'user_123',
 *   label: 'Alice',
 *   group: 1,
 *   attributes: { age: 25, city: 'NYC' }
 * };
 */

/**
 * Represents an edge (link/connection) between two nodes.
 *
 * @typedef {Object} EdgeData
 * @property {string|number} source - ID of the source node
 * @property {string|number} target - ID of the target node
 * @property {number} [weight] - Optional edge weight (default: 1)
 * @property {string} [type] - Optional edge type
 * @property {*} [attributes] - Any additional edge attributes
 *
 * @example
 * const edge = {
 *   source: 'A',
 *   target: 'B',
 *   weight: 2.5,
 *   type: 'friendship'
 * };
 */

/**
 * Edge list format - simple array of edges
 * Common in many graph formats and papers
 *
 * @typedef {EdgeData[]} EdgeList
 *
 * @example
 * const edgeList = [
 *   { source: 'A', target: 'B', weight: 1 },
 *   { source: 'B', target: 'C', weight: 2 }
 * ];
 */

/**
 * Adjacency list format - maps node IDs to their neighbors
 *
 * @typedef {Object.<string, string[]>} AdjacencyList
 *
 * @example
 * const adjList = {
 *   'A': ['B', 'C'],
 *   'B': ['A', 'C'],
 *   'C': ['A', 'B']
 * };
 */

/**
 * Adjacency matrix format - 2D array representation
 *
 * @typedef {number[][]} AdjacencyMatrix
 *
 * @example
 * const adjMatrix = [
 *   [0, 1, 1],  // A connects to B and C
 *   [1, 0, 1],  // B connects to A and C
 *   [1, 1, 0]   // C connects to A and B
 * ];
 */

/**
 * Community assignment - maps node IDs to community IDs
 * Result of community detection algorithms
 *
 * @typedef {Object.<string, number>} CommunityAssignment
 *
 * @example
 * const communities = {
 *   'A': 0,
 *   'B': 0,
 *   'C': 1,
 *   'D': 1
 * };
 */

/**
 * Network statistics for a single node
 *
 * @typedef {Object} NodeStats
 * @property {string|number} id - Node identifier
 * @property {number} [degree] - Degree centrality
 * @property {number} [eigenvector] - Eigenvector centrality
 * @property {number} [betweenness] - Betweenness centrality
 * @property {number} [clustering] - Clustering coefficient
 * @property {number} [cliques] - Number of cliques containing this node
 * @property {number} [modularity] - Community/modularity group
 *
 * @example
 * const stats = {
 *   id: 'A',
 *   degree: 3,
 *   eigenvector: 0.45,
 *   betweenness: 0.12,
 *   clustering: 0.67,
 *   modularity: 1
 * };
 */

/**
 * Options for adapter operations
 *
 * @typedef {Object} AdapterOptions
 * @property {boolean} [weighted] - Whether edges have weights
 * @property {boolean} [directed] - Whether graph is directed
 * @property {string} [delimiter] - CSV delimiter (default: ',')
 * @property {boolean} [header] - Whether CSV has header row
 * @property {Object.<string, string>} [columnMap] - Map CSV columns to graph properties
 */

/**
 * NetworkX node-link format
 * Standard JSON format used by NetworkX library
 *
 * @typedef {Object} NetworkXNodeLink
 * @property {boolean} directed - Whether graph is directed
 * @property {boolean} multigraph - Whether graph allows multiple edges
 * @property {Object.<string, *>} graph - Graph-level attributes
 * @property {Array.<{id: string|number, [key: string]: *}>} nodes - Array of node objects
 * @property {Array.<{source: string|number, target: string|number, [key: string]: *}>} links - Array of edge objects
 *
 * @example
 * const nxData = {
 *   directed: false,
 *   multigraph: false,
 *   graph: {},
 *   nodes: [{ id: 0 }, { id: 1 }],
 *   links: [{ source: 0, target: 1 }]
 * };
 */

/**
 * D3.js force-directed graph format
 * Used by D3's force simulation
 *
 * @typedef {Object} D3GraphData
 * @property {Array.<{id: string, [key: string]: *}>} nodes - Array of node objects
 * @property {Array.<{source: string|Object, target: string|Object, [key: string]: *}>} links - Array of link objects
 *
 * @example
 * const d3Data = {
 *   nodes: [{ id: 'A' }, { id: 'B' }],
 *   links: [{ source: 'A', target: 'B' }]
 * };
 */

/**
 * Cytoscape.js graph format
 *
 * @typedef {Object} CytoscapeData
 * @property {Array.<{data: {id: string, [key: string]: *}}>} nodes - Array of node elements
 * @property {Array.<{data: {id: string, source: string, target: string, [key: string]: *}}>} edges - Array of edge elements
 */

/**
 * Community detection result with metadata
 *
 * @typedef {Object} CommunityResult
 * @property {CommunityAssignment} communities - Node to community mapping
 * @property {number} modularity - Modularity score of the partition
 * @property {number} numCommunities - Number of communities detected
 * @property {string} algorithm - Name of algorithm used
 * @property {Object.<string, *>} [metadata] - Additional algorithm-specific data
 *
 * @example
 * const result = {
 *   communities: { 'A': 0, 'B': 0, 'C': 1 },
 *   modularity: 0.42,
 *   numCommunities: 2,
 *   algorithm: 'louvain',
 *   metadata: { iterations: 5 }
 * };
 */

/**
 * Layout algorithm result - node positions
 *
 * @typedef {Object.<string, {x: number, y: number}>} LayoutPositions
 *
 * @example
 * const positions = {
 *   'A': { x: 100, y: 200 },
 *   'B': { x: 300, y: 150 }
 * };
 */

export default {};
