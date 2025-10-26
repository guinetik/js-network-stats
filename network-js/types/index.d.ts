/**
 * TypeScript type definitions for @guinetik/network-js
 * Network analysis library for graph theory and statistical metrics
 * @module @guinetik/network-js
 */

// ============================================================================
// Core Types and Interfaces
// ============================================================================

/**
 * Node identifier type - can be string or number
 */
export type NodeId = string | number;

/**
 * Edge data object with source, target, and optional weight
 */
export interface EdgeData {
  source: NodeId;
  target: NodeId;
  weight?: number;
}

/**
 * Standard graph data format with nodes and edges arrays
 */
export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}

/**
 * Node data object with id and optional metadata
 */
export interface NodeData {
  id: NodeId;
  [key: string]: any;
}

/**
 * Result from community detection algorithm
 */
export interface CommunityResult {
  /** Map of node ID to community ID */
  communities: Record<NodeId, number>;
  /** Modularity score (quality metric) */
  modularity: number;
  /** Number of detected communities */
  numCommunities: number;
  /** Name of the algorithm used */
  algorithm: string;
  /** Algorithm-specific options used */
  options?: Record<string, any>;
}

/**
 * Node statistics result object from NetworkStats.analyze()
 */
export interface NodeStats {
  /** Node identifier */
  id: NodeId;
  /** Degree centrality (number of connections) */
  degree?: number;
  /** Eigenvector centrality (influence) */
  eigenvector?: number;
  /** Betweenness centrality (bridge importance) */
  betweenness?: number;
  /** Clustering coefficient (local group cohesion) */
  clustering?: number;
  /** Number of maximal cliques containing this node */
  cliques?: number;
  /** Community ID from modularity detection */
  modularity?: number;
  /** Legacy alias for clustering */
  transitivity?: number;
}

/**
 * Layout position for a node
 */
export interface LayoutPosition {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
}

/**
 * Layout result mapping node IDs to positions
 */
export type LayoutResult = Map<NodeId, LayoutPosition>;

// ============================================================================
// Connection Class
// ============================================================================

/**
 * Represents a weighted, undirected edge between two nodes
 */
export class Connection {
  constructor(source: NodeId, target: NodeId, weight?: number);

  /** Source node identifier */
  source: NodeId;

  /** Target node identifier */
  target: NodeId;

  /** Edge weight (default: 1) */
  weight: number;

  /**
   * Check if this edge contains a specific node
   * @param node - Node identifier to check
   * @returns True if edge contains the node
   */
  hasNode(node: NodeId): boolean;

  /**
   * Get the other endpoint of this edge
   * @param node - One endpoint of the edge
   * @returns The other endpoint
   * @throws Error if node is not part of this edge
   */
  getOtherNode(node: NodeId): NodeId;

  /**
   * String representation of the edge
   */
  toString(): string;
}

// ============================================================================
// Graph Class
// ============================================================================

/**
 * Undirected, weighted graph data structure using adjacency maps.
 * Provides O(1) neighbor lookups and efficient graph operations.
 */
export class Graph {
  constructor();

  /** Set of all node identifiers in the graph */
  nodes: Set<NodeId>;

  /** Array of all edges (Connection objects) in the graph */
  edges: Connection[];

  /** Adjacency map for fast neighbor lookups: Map<node, Map<neighbor, weight>> */
  adjacencyMap: Map<NodeId, Map<NodeId, number>>;

  /**
   * Add a single node to the graph
   * @param node - Node identifier to add
   * @returns The graph instance for chaining
   */
  addNode(node: NodeId): this;

  /**
   * Add multiple nodes to the graph
   * @param nodes - Array of node identifiers to add
   * @returns The graph instance for chaining
   */
  addNodesFrom(nodes: NodeId[]): this;

  /**
   * Remove a node and all its associated edges from the graph
   * @param node - Node identifier to remove
   * @returns The graph instance for chaining
   * @throws Error if node does not exist
   */
  removeNode(node: NodeId): this;

  /**
   * Check if a node exists in the graph
   * @param node - Node identifier to check
   * @returns True if node exists, false otherwise
   */
  hasNode(node: NodeId): boolean;

  /**
   * Add multiple edges to the graph from a list of edge tuples
   * @param edgeList - Array of [source, target, weight?] tuples
   * @returns The graph instance for chaining
   */
  addEdgesFrom(edgeList: Array<[NodeId, NodeId, number?]>): this;

  /**
   * Add a weighted edge between two nodes
   * Creates an undirected connection (bidirectional)
   * Automatically adds nodes if they don't exist
   * @param source - Source node identifier
   * @param target - Target node identifier
   * @param weight - Edge weight (default: 1)
   * @returns The graph instance for chaining
   */
  addEdge(source: NodeId, target: NodeId, weight?: number): this;

  /**
   * Check if an edge exists between two nodes
   * @param source - Source node identifier
   * @param target - Target node identifier
   * @returns True if edge exists (in either direction)
   */
  hasEdge(source: NodeId, target: NodeId): boolean;

  /**
   * Get the weight of an edge between two nodes
   * @param source - Source node identifier
   * @param target - Target node identifier
   * @returns Edge weight, or undefined if edge doesn't exist
   */
  getEdgeWeight(source: NodeId, target: NodeId): number | undefined;

  /**
   * Get all neighbors of a node
   * @param node - Node identifier
   * @returns Array of neighbor node identifiers
   */
  getNeighbors(node: NodeId): NodeId[];

  /**
   * Get the degree (number of connections) of a node
   * @param node - Node identifier
   * @returns Number of neighbors, or 0 if node doesn't exist
   */
  getDegree(node: NodeId): number;

  /**
   * Get the number of nodes in the graph
   * @returns Node count
   */
  numberOfNodes(): number;

  /**
   * Get the number of edges in the graph
   * @returns Edge count
   */
  numberOfEdges(): number;

  /**
   * Create a deep copy of the graph
   * @returns New Graph instance with copied nodes and edges
   */
  copy(): Graph;

  /**
   * Get a subgraph containing only the specified nodes
   * @param nodeSubset - Array of node identifiers to include
   * @returns New Graph instance containing only specified nodes and their interconnecting edges
   */
  subgraph(nodeSubset: NodeId[]): Graph;

  /**
   * Clear all nodes and edges from the graph
   * @returns The graph instance for chaining
   */
  clear(): this;

  /**
   * Get string representation of the graph
   * @returns Summary string with node and edge counts
   */
  toString(): string;
}

// ============================================================================
// Network Analysis Class
// ============================================================================

/**
 * Static utility class for network analysis algorithms.
 * Provides methods for computing various centrality measures and network properties.
 */
export class Network {
  /**
   * Compute degree centrality for all nodes
   * @param graph - Graph to analyze
   * @returns Map of node IDs to degree values
   */
  static degree(graph: Graph): Map<NodeId, number>;

  /**
   * Compute eigenvector centrality using power iteration
   * @param graph - Graph to analyze
   * @param options - Configuration options
   * @param options.maxIter - Maximum iterations (default: 100000)
   * @param options.tol - Convergence tolerance (default: 1e-6)
   * @returns Map of node IDs to eigenvector centrality values
   */
  static eigenvectorCentrality(
    graph: Graph,
    options?: { maxIter?: number; tol?: number }
  ): Map<NodeId, number>;

  /**
   * Compute betweenness centrality (shortest path bridge importance)
   * @param graph - Graph to analyze
   * @returns Map of node IDs to betweenness centrality values
   */
  static betweennessCentrality(graph: Graph): Map<NodeId, number>;

  /**
   * Compute local clustering coefficient for all nodes
   * @param graph - Graph to analyze
   * @returns Map of node IDs to clustering coefficient values
   */
  static clustering(graph: Graph): Map<NodeId, number>;

  /**
   * Count number of maximal cliques containing each node
   * @param graph - Graph to analyze
   * @returns Map of node IDs to clique counts
   */
  static numberOfCliques(graph: Graph): Map<NodeId, number>;

  /**
   * Detect communities using the Louvain modularity optimization algorithm
   * @param graph - Graph to analyze
   * @param options - Configuration options
   * @param options.louvainModule - Custom Louvain implementation (for testing)
   * @returns Map of node IDs to community IDs
   */
  static modularity(
    graph: Graph,
    options?: { louvainModule?: any }
  ): Record<NodeId, number>;
}

// ============================================================================
// Louvain Community Detection
// ============================================================================

/**
 * Louvain method for community detection using modularity optimization.
 * Implements the fast unfolding algorithm for finding high-modularity partitions.
 */
export class Louvain {
  constructor();

  /**
   * Set the nodes for community detection
   * @param nodes - Array of node identifiers
   * @returns The Louvain instance for chaining
   */
  setNodes(nodes: NodeId[]): this;

  /**
   * Set the edges for community detection
   * @param edges - Array of edge objects
   * @returns The Louvain instance for chaining
   */
  setEdges(edges: EdgeData[]): this;

  /**
   * Execute the Louvain algorithm
   * @returns Map of node IDs to community IDs
   */
  execute(): Record<NodeId, number>;
}

// ============================================================================
// NetworkStats Class
// ============================================================================

/**
 * Options for NetworkStats analyzer
 */
export interface NetworkStatsOptions {
  /** Maximum iterations for iterative algorithms (default: 100000) */
  maxIter?: number;
  /** Enable detailed logging (default: true) */
  verbose?: boolean;
  /** Custom Louvain module (for testing) */
  louvainModule?: any;
}

/**
 * Available network analysis features
 */
export interface NetworkStatsFeatures {
  /** Eigenvector centrality (importance based on neighbors) */
  EIGENVECTOR: 'eigenvector';
  /** Community detection using Louvain algorithm */
  MODULARITY: 'modularity';
  /** Betweenness centrality (bridge importance) */
  BETWEENNESS: 'betweenness';
  /** Local clustering coefficient (group cohesion) */
  CLUSTERING: 'clustering';
  /** Network transitivity (deprecated, use CLUSTERING) */
  TRANSITIVITY: 'transitivity';
  /** Number of maximal cliques per node */
  CLIQUES: 'cliques';
  /** Degree centrality (connection count) */
  DEGREE: 'degree';
  /** All available features */
  ALL: string[];
}

/**
 * Main class for analyzing network graphs and calculating statistical metrics.
 * Provides a high-level API for computing various centrality measures and network properties.
 *
 * Supported Features:
 * - Degree centrality
 * - Eigenvector centrality
 * - Betweenness centrality
 * - Clustering coefficient
 * - Clique detection
 * - Community detection (modularity via Louvain)
 */
export class NetworkStats {
  /** Available network analysis features */
  static FEATURES: NetworkStatsFeatures;

  /**
   * Create a new NetworkStats analyzer instance
   * @param options - Configuration options
   */
  constructor(options?: NetworkStatsOptions);

  /**
   * Analyze a network and compute the requested statistical features.
   * This is the main entry point for network analysis.
   *
   * @param network - Array of edge objects representing the network
   * @param features - Features to compute (defaults to ALL features)
   * @returns Array of node statistics, one object per node
   *
   * @example
   * ```typescript
   * const analyzer = new NetworkStats({ verbose: false });
   * const network = [
   *   { source: 'A', target: 'B', weight: 1 },
   *   { source: 'B', target: 'C', weight: 2 }
   * ];
   * const results = analyzer.analyze(network, ['degree', 'clustering']);
   * ```
   */
  analyze(network: EdgeData[], features?: string | string[]): NodeStats[];
}

// ============================================================================
// Data Adapters
// ============================================================================

/**
 * Abstract base class for graph data adapters.
 * Adapters convert between different graph data formats.
 */
export abstract class Adapter {
  /**
   * Create an adapter instance
   * @param name - Adapter name
   */
  constructor(name: string);

  /** Adapter name */
  name: string;

  /**
   * Parse input data into GraphData format
   * @param input - Input data in adapter-specific format
   * @returns Normalized GraphData object
   */
  abstract parse(input: any): GraphData;

  /**
   * Get adapter information
   * @returns Object with adapter name
   */
  getInfo(): { name: string };
}

/**
 * CSV adapter for parsing CSV files into graph data.
 * Supports both edge list CSV (source,target,weight) and separate node/edge CSVs.
 */
export class CSVAdapter extends Adapter {
  constructor();

  /**
   * Parse CSV data into GraphData format
   * @param input - CSV string or array of CSV rows
   * @returns GraphData object with nodes and edges
   */
  parse(input: string | string[]): GraphData;
}

/**
 * JSON adapter for parsing JSON graph data.
 * Supports multiple JSON formats (NetworkX-like, node-link, adjacency).
 */
export class JSONAdapter extends Adapter {
  constructor();

  /**
   * Parse JSON data into GraphData format
   * @param input - JSON object or JSON string
   * @returns GraphData object with nodes and edges
   */
  parse(input: object | string): GraphData;
}

/**
 * NetworkX adapter for parsing NetworkX-format JSON graph data.
 * Handles the specific node-link format used by NetworkX (Python library).
 */
export class NetworkXAdapter extends Adapter {
  constructor();

  /**
   * Parse NetworkX JSON data into GraphData format
   * @param input - NetworkX JSON object (node-link format)
   * @returns GraphData object with nodes and edges
   */
  parse(input: {
    nodes: Array<{ id: NodeId; [key: string]: any }>;
    links: Array<{ source: NodeId; target: NodeId; [key: string]: any }>;
  }): GraphData;
}

// ============================================================================
// Graph Layouts
// ============================================================================

/**
 * Options for layout algorithms
 */
export interface LayoutOptions {
  /** Canvas width (default: 800) */
  width?: number;
  /** Canvas height (default: 600) */
  height?: number;
  /** Padding from canvas edges (default: 50) */
  padding?: number;
  /** Random seed for reproducible layouts */
  seed?: number;
}

/**
 * Options for force-directed layout
 */
export interface ForceDirectedLayoutOptions extends LayoutOptions {
  /** Number of iterations (default: 300) */
  iterations?: number;
  /** Cooling factor for temperature (default: 0.95) */
  coolingFactor?: number;
  /** Ideal edge length (default: 100) */
  idealEdgeLength?: number;
  /** Repulsion strength (default: 1000) */
  repulsion?: number;
  /** Initial temperature (default: 100) */
  initialTemperature?: number;
}

/**
 * Abstract base class for graph layout algorithms.
 * Layout algorithms compute 2D positions for graph nodes.
 */
export abstract class Layout {
  /**
   * Create a layout instance
   * @param name - Layout algorithm name
   * @param options - Layout options
   */
  constructor(name: string, options?: LayoutOptions);

  /** Layout algorithm name */
  name: string;

  /** Layout options */
  options: LayoutOptions;

  /**
   * Compute layout positions for a graph
   * @param graph - Graph to layout
   * @returns Map of node IDs to {x, y} positions
   */
  abstract compute(graph: Graph): LayoutResult;

  /**
   * Get layout information
   * @returns Object with layout name
   */
  getInfo(): { name: string };
}

/**
 * Force-directed layout using Fruchterman-Reingold algorithm.
 * Simulates physical forces to position nodes aesthetically.
 */
export class ForceDirectedLayout extends Layout {
  /**
   * Create a force-directed layout
   * @param options - Force-directed layout options
   */
  constructor(options?: ForceDirectedLayoutOptions);

  /**
   * Compute force-directed layout positions
   * @param graph - Graph to layout
   * @returns Map of node IDs to {x, y} positions
   */
  compute(graph: Graph): LayoutResult;
}

/**
 * Circular layout algorithm.
 * Positions nodes evenly distributed on a circle.
 */
export class CircularLayout extends Layout {
  /**
   * Create a circular layout
   * @param options - Layout options
   */
  constructor(options?: LayoutOptions);

  /**
   * Compute circular layout positions
   * @param graph - Graph to layout
   * @returns Map of node IDs to {x, y} positions
   */
  compute(graph: Graph): LayoutResult;
}

// ============================================================================
// Community Detection (Strategy Pattern)
// ============================================================================

/**
 * Abstract base class for community detection algorithms.
 * Implements the Strategy Pattern for pluggable algorithm implementations.
 */
export abstract class CommunityAlgorithm {
  /**
   * Create a community detection algorithm
   * @param name - Algorithm name
   * @param description - Algorithm description
   * @throws Error if instantiated directly (abstract class)
   */
  constructor(name: string, description?: string);

  /** Algorithm name */
  name: string;

  /** Algorithm description */
  description: string;

  /**
   * Detect communities in a graph
   * @param graph - Graph to analyze
   * @returns Community detection result
   * @throws Error if not implemented by subclass
   */
  abstract detect(graph: Graph): CommunityResult;

  /**
   * Get algorithm information
   * @returns Object with algorithm name and description
   */
  getInfo(): { name: string; description: string };
}

/**
 * Options for Louvain algorithm
 */
export interface LouvainAlgorithmOptions {
  /** Resolution parameter (default: 1.0) */
  resolution?: number;
  /** Randomize node order (default: false) */
  randomize?: boolean;
}

/**
 * Louvain algorithm for community detection using modularity optimization.
 * Fast and efficient method for detecting communities in large networks.
 */
export class LouvainAlgorithm extends CommunityAlgorithm {
  /**
   * Create a Louvain algorithm instance
   * @param options - Louvain algorithm options
   */
  constructor(options?: LouvainAlgorithmOptions);

  /** Algorithm options */
  options: LouvainAlgorithmOptions;

  /**
   * Detect communities using Louvain method
   * @param graph - Graph to analyze
   * @returns Community detection result with modularity score
   * @throws Error if graph is null or invalid
   */
  detect(graph: Graph): CommunityResult;
}

/**
 * Community detection orchestrator using Strategy Pattern.
 * Accepts both algorithm instances and string names for backward compatibility.
 */
export class CommunityDetection {
  /**
   * Create a community detection instance
   * @param graph - Graph to analyze (optional, can be set later)
   */
  constructor(graph?: Graph);

  /** The graph to analyze */
  graph: Graph | null;

  /**
   * Set the graph to analyze
   * @param graph - Graph instance
   * @returns The CommunityDetection instance for chaining
   */
  setGraph(graph: Graph): this;

  /**
   * Detect communities using the specified algorithm.
   * Supports both algorithm instances (Strategy Pattern) and string names (backward compatible).
   *
   * @param algorithm - Algorithm instance or string name ('louvain')
   * @param options - Options for string-based algorithm creation
   * @returns Community detection result
   * @throws Error if no graph is set or algorithm is invalid
   *
   * @example
   * ```typescript
   * // Using algorithm instance (Strategy Pattern)
   * const louvain = new LouvainAlgorithm({ resolution: 1.5 });
   * const result = detector.detectCommunities(louvain);
   *
   * // Using string name (backward compatible)
   * const result2 = detector.detectCommunities('louvain', { resolution: 1.5 });
   * ```
   */
  detectCommunities(
    algorithm?: CommunityAlgorithm | string,
    options?: Record<string, any>
  ): CommunityResult;
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Functional wrapper for backward compatibility with legacy API.
 * Creates a NetworkStats instance and analyzes the network in one call.
 *
 * @param network - Array of edge objects
 * @param features - Features to compute (null = all features)
 * @param options - Configuration options
 * @returns Array of node statistics
 *
 * @example
 * ```typescript
 * import getNetworkStats from '@guinetik/network-js';
 *
 * const stats = getNetworkStats(
 *   [{ source: 'A', target: 'B' }],
 *   ['degree', 'clustering'],
 *   { verbose: false }
 * );
 * ```
 */
export function getNetworkStats(
  network: EdgeData[],
  features?: string[] | null,
  options?: NetworkStatsOptions
): NodeStats[];

export default getNetworkStats;
