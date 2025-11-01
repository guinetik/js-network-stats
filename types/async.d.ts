/**
 * Type definitions for js-network-stats/async
 * Async API with worker thread support
 */

import { NetworkEdge, FeatureType, NodeStats } from './index.js';

/**
 * Options for async network analysis with worker support
 */
export interface AsyncNetworkOptions {
  /**
   * Enable detailed console output
   * @default true
   */
  verbose?: boolean;

  /**
   * Maximum iterations for eigenvector centrality calculation
   * @default 100000
   */
  maxIter?: number;

  /**
   * Worker mode: true (force workers), false (force sync), 'auto' (smart detection)
   * @default 'auto'
   */
  workers?: boolean | 'auto';

  /**
   * Edge count threshold for auto worker mode
   * @default 500
   */
  workerThreshold?: number;

  /**
   * Maximum number of worker threads
   * @default CPU count - 1
   */
  maxWorkers?: number;

  /**
   * Task timeout in milliseconds
   * @default 60000
   */
  taskTimeout?: number;

  /**
   * Progress callback function (receives 0-1 progress value)
   */
  onProgress?: (progress: number) => void;
}

/**
 * Calculate network statistics asynchronously with worker thread support
 *
 * @param network - Array of edge objects defining the network
 * @param features - Array of features to calculate, or null for all features
 * @param options - Async configuration options
 * @returns Promise resolving to array of node statistics
 *
 * @example
 * ```typescript
 * import { getNetworkStatsAsync } from 'js-network-stats/async';
 *
 * const network = [
 *   { source: 'A', target: 'B' },
 *   { source: 'B', target: 'C' }
 * ];
 *
 * // Simple usage
 * const stats = await getNetworkStatsAsync(network, ['degree']);
 *
 * // With progress callback
 * const stats = await getNetworkStatsAsync(network, ['betweenness'], {
 *   onProgress: (p) => console.log(`Progress: ${Math.round(p * 100)}%`)
 * });
 *
 * // Force workers
 * const stats = await getNetworkStatsAsync(network, ['degree'], {
 *   workers: true
 * });
 * ```
 */
export function getNetworkStatsAsync(
  network: NetworkEdge[],
  features?: FeatureType[] | null,
  options?: AsyncNetworkOptions
): Promise<NodeStats[]>;

/**
 * Cleanup worker threads and free resources
 * Call this when done with async operations
 *
 * @example
 * ```typescript
 * import { getNetworkStatsAsync, cleanup } from 'js-network-stats/async';
 *
 * const stats = await getNetworkStatsAsync(network, ['degree']);
 * await cleanup(); // Free worker threads
 * ```
 */
export function cleanup(): Promise<void>;

/**
 * Default export
 */
export default getNetworkStatsAsync;
