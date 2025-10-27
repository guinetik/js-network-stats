/**
 * Compute Infrastructure - Parallel computation support
 *
 * @module compute
 */

// PRIMARY EXPORT - Use WorkerManager for all compute operations
export { default as WorkerManager } from './WorkerManager.js';

// Shared compute utilities (for algorithm implementations)
export * from './compute-utils.js';

// Secondary exports (for advanced use cases)
export { WorkerAdapter, BrowserWorkerAdapter, NodeWorkerAdapter, MockWorkerAdapter } from './WorkerAdapter.js';
export { WorkerPool } from './WorkerPool.js';

// Re-export for convenience
export { default as WorkerPoolDefault } from './WorkerPool.js';
