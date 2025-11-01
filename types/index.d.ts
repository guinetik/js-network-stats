/**
 * Type definitions for js-network-stats
 * Network graph statistics calculator
 */

/**
 * An edge in a network graph
 */
export interface NetworkEdge {
  /** Source node identifier */
  source: string;
  /** Target node identifier */
  target: string;
  /** Optional edge weight (default: 1) */
  weight?: number;
}

/**
 * Configuration options for network analysis
 */
export interface NetworkOptions {
  /**
   * Maximum iterations for eigenvector centrality calculation
   * @default 100000
   */
  maxIter?: number;

  /**
   * Enable detailed console output
   * @default true
   */
  verbose?: boolean;
}

/**
 * Statistics calculated for a single node
 */
export interface NodeStats {
  /** Node identifier */
  id: string;

  /** Number of connections (edges) to this node */
  degree?: number;

  /** Eigenvector centrality score (0-1) */
  eigenvector?: number;

  /** Betweenness centrality score (0-1) */
  betweenness?: number;

  /** Clustering coefficient (0-1) */
  clustering?: number;

  /** Number of cliques containing this node */
  cliques?: number;

  /** Community/modularity assignment (integer) */
  modularity?: number;
}

/**
 * Available feature types for network analysis
 */
export type FeatureType =
  | 'degree'
  | 'eigenvector'
  | 'betweenness'
  | 'clustering'
  | 'cliques'
  | 'modularity'
  | 'transitivity';

/**
 * Feature constants
 */
export const FEATURES: {
  /** Node degree (number of connections) */
  readonly DEGREE: 'degree';
  /** Eigenvector centrality */
  readonly EIGENVECTOR: 'eigenvector';
  /** Betweenness centrality */
  readonly BETWEENNESS: 'betweenness';
  /** Clustering coefficient */
  readonly CLUSTERING: 'clustering';
  /** Maximal cliques */
  readonly CLIQUES: 'cliques';
  /** Community detection / modularity */
  readonly MODULARITY: 'modularity';
  /** Transitivity */
  readonly TRANSITIVITY: 'transitivity';
  /** All available features */
  readonly ALL: ReadonlyArray<FeatureType>;
};

/**
 * Calculate network statistics for a graph
 *
 * @param network - Array of edge objects defining the network
 * @param features - Array of features to calculate, or null for all features
 * @param options - Configuration options
 * @returns Array of node statistics
 *
 * @throws {TypeError} If network is not an array or features is invalid
 * @throws {Error} If network is empty or contains invalid edges
 *
 * @example
 * ```typescript
 * import { getNetworkStats, FEATURES } from 'js-network-stats';
 *
 * const network = [
 *   { source: 'A', target: 'B' },
 *   { source: 'B', target: 'C' },
 *   { source: 'C', target: 'A' }
 * ];
 *
 * const stats = getNetworkStats(network, [FEATURES.DEGREE, FEATURES.EIGENVECTOR]);
 * console.log(stats);
 * ```
 */
export function getNetworkStats(
  network: NetworkEdge[],
  features?: FeatureType[] | null,
  options?: NetworkOptions
): NodeStats[];

/**
 * Default export of getNetworkStats function
 */
export default getNetworkStats;
