# Compute Infrastructure - Technical Design

## Overview

This document describes the parallel computation architecture for network-js, enabling analysis of large graphs (10k-100k+ nodes) using WebWorkers (browser) and Worker Threads (Node.js).

## Design Principles

1. **Universal API** - Same interface works in browser and Node.js
2. **Progressive Enhancement** - Falls back gracefully when workers unavailable
3. **Automatic Optimization** - Auto-detects when to use workers based on graph size
4. **User Control** - Override automatic decisions with configuration
5. **Memory Efficient** - Minimize data transfer between main thread and workers
6. **Progress Tracking** - Long-running operations report progress

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    NetworkStats                          │
│  (Main API - decides single-thread vs parallel)         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├─────────────────┬───────────────────┐
                   │                 │                   │
         ┌─────────▼─────────┐  ┌───▼────────┐  ┌──────▼──────┐
         │  Single-threaded  │  │ WorkerPool │  │  Fallback   │
         │   (small graphs)  │  │  Manager   │  │  (no worker)│
         └───────────────────┘  └─────┬──────┘  └─────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
            │   Worker 1   │  │   Worker 2  │  │   Worker N  │
            │ (Web/Thread) │  │ (Web/Thread)│  │ (Web/Thread)│
            └──────────────┘  └─────────────┘  └─────────────┘
```

---

## Component Design

### 1. WorkerAdapter (Platform Abstraction)

**Purpose:** Unified interface for WebWorkers and Worker Threads

**File:** `src/compute/WorkerAdapter.js`

```javascript
/**
 * Abstract adapter for cross-platform worker support
 */
class WorkerAdapter {
  constructor(workerScript) {
    this.workerScript = workerScript;
    this.worker = null;
  }

  /**
   * Create worker instance (browser or Node.js)
   */
  static create(workerScript) {
    if (typeof Worker !== 'undefined') {
      return new BrowserWorkerAdapter(workerScript);
    } else if (typeof require !== 'undefined') {
      return new NodeWorkerAdapter(workerScript);
    } else {
      throw new Error('No worker support available');
    }
  }

  /**
   * Post message to worker
   */
  postMessage(message) {
    throw new Error('Must implement postMessage');
  }

  /**
   * Listen for messages from worker
   */
  onMessage(callback) {
    throw new Error('Must implement onMessage');
  }

  /**
   * Listen for errors from worker
   */
  onError(callback) {
    throw new Error('Must implement onError');
  }

  /**
   * Terminate worker
   */
  terminate() {
    throw new Error('Must implement terminate');
  }

  /**
   * Check if workers are supported
   */
  static isSupported() {
    return typeof Worker !== 'undefined' ||
           (typeof require !== 'undefined' &&
            typeof require('worker_threads') !== 'undefined');
  }
}

/**
 * Browser WebWorker implementation
 */
class BrowserWorkerAdapter extends WorkerAdapter {
  constructor(workerScript) {
    super(workerScript);
    this.worker = new Worker(workerScript);
  }

  postMessage(message, transferList = []) {
    this.worker.postMessage(message, transferList);
  }

  onMessage(callback) {
    this.worker.onmessage = (e) => callback(e.data);
  }

  onError(callback) {
    this.worker.onerror = callback;
  }

  terminate() {
    this.worker.terminate();
  }
}

/**
 * Node.js Worker Threads implementation
 */
class NodeWorkerAdapter extends WorkerAdapter {
  constructor(workerScript) {
    super(workerScript);
    const { Worker } = require('worker_threads');
    this.worker = new Worker(workerScript);
  }

  postMessage(message, transferList = []) {
    this.worker.postMessage(message, transferList);
  }

  onMessage(callback) {
    this.worker.on('message', callback);
  }

  onError(callback) {
    this.worker.on('error', callback);
  }

  terminate() {
    this.worker.terminate();
  }
}
```

---

### 2. WorkerPool (Worker Management)

**Purpose:** Manages worker lifecycle, task queue, and distribution

**File:** `src/compute/WorkerPool.js`

```javascript
/**
 * Pool of workers for parallel computation
 */
class WorkerPool {
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || this.detectCPUCount();
    this.workerScript = options.workerScript || this.getDefaultWorkerScript();
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTasks = new Map(); // taskId -> { resolve, reject, onProgress }
    this.taskIdCounter = 0;
  }

  /**
   * Detect number of CPU cores
   */
  detectCPUCount() {
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      return navigator.hardwareConcurrency;
    } else if (typeof require !== 'undefined') {
      const os = require('os');
      return os.cpus().length;
    }
    return 4; // default fallback
  }

  /**
   * Get default worker script path
   */
  getDefaultWorkerScript() {
    // In browser: bundled worker script
    // In Node: path to worker file
    if (typeof window !== 'undefined') {
      return './network-worker.js'; // Will be bundled by Vite/Webpack
    } else {
      return require('path').join(__dirname, 'network-worker.js');
    }
  }

  /**
   * Initialize worker pool
   */
  async initialize() {
    if (!WorkerAdapter.isSupported()) {
      throw new Error('Workers not supported in this environment');
    }

    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = WorkerAdapter.create(this.workerScript);

      worker.onMessage((message) => {
        this.handleWorkerMessage(worker, message);
      });

      worker.onError((error) => {
        this.handleWorkerError(worker, error);
      });

      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Execute task on worker
   */
  async execute(task, options = {}) {
    return new Promise((resolve, reject) => {
      const taskId = `task_${this.taskIdCounter++}`;
      const taskWithId = { id: taskId, ...task };

      this.activeTasks.set(taskId, {
        resolve,
        reject,
        onProgress: options.onProgress
      });

      // If worker available, assign immediately
      if (this.availableWorkers.length > 0) {
        const worker = this.availableWorkers.pop();
        this.assignTask(worker, taskWithId);
      } else {
        // Otherwise queue for next available worker
        this.taskQueue.push(taskWithId);
      }
    });
  }

  /**
   * Assign task to worker
   */
  assignTask(worker, task) {
    worker.currentTask = task.id;
    worker.postMessage(task);
  }

  /**
   * Handle message from worker
   */
  handleWorkerMessage(worker, message) {
    const { id, status, result, progress, error } = message;
    const taskInfo = this.activeTasks.get(id);

    if (!taskInfo) {
      console.warn(`Received message for unknown task: ${id}`);
      return;
    }

    if (status === 'progress' && taskInfo.onProgress) {
      taskInfo.onProgress(progress);
    } else if (status === 'complete') {
      taskInfo.resolve(result);
      this.activeTasks.delete(id);
      this.freeWorker(worker);
    } else if (status === 'error') {
      taskInfo.reject(new Error(error));
      this.activeTasks.delete(id);
      this.freeWorker(worker);
    }
  }

  /**
   * Handle worker error
   */
  handleWorkerError(worker, error) {
    console.error('Worker error:', error);

    // Reject current task if any
    if (worker.currentTask) {
      const taskInfo = this.activeTasks.get(worker.currentTask);
      if (taskInfo) {
        taskInfo.reject(error);
        this.activeTasks.delete(worker.currentTask);
      }
    }

    // Restart worker
    this.restartWorker(worker);
  }

  /**
   * Free worker and assign next queued task
   */
  freeWorker(worker) {
    worker.currentTask = null;

    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift();
      this.assignTask(worker, nextTask);
    } else {
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Restart failed worker
   */
  restartWorker(oldWorker) {
    const index = this.workers.indexOf(oldWorker);
    if (index === -1) return;

    oldWorker.terminate();

    const newWorker = WorkerAdapter.create(this.workerScript);
    newWorker.onMessage((message) => {
      this.handleWorkerMessage(newWorker, message);
    });
    newWorker.onError((error) => {
      this.handleWorkerError(newWorker, error);
    });

    this.workers[index] = newWorker;
    this.availableWorkers.push(newWorker);
  }

  /**
   * Terminate all workers
   */
  async terminate() {
    // Wait for active tasks to complete (optional timeout)
    await this.waitForActiveTasks(5000);

    // Terminate all workers
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.activeTasks.clear();
    this.taskQueue = [];
  }

  /**
   * Wait for active tasks to complete
   */
  async waitForActiveTasks(timeout = 5000) {
    if (this.activeTasks.size === 0) return;

    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.activeTasks.size === 0 || Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length
    };
  }
}
```

---

### 3. ParallelAlgorithms (Partitioning Strategies)

**Purpose:** Split algorithms across workers intelligently

**File:** `src/compute/ParallelAlgorithms.js`

```javascript
/**
 * Strategies for parallelizing graph algorithms
 */
class ParallelAlgorithms {
  /**
   * Determine if algorithm should use workers
   */
  static shouldUseWorkers(graph, algorithm, options = {}) {
    const { useWorkers = 'auto', workerThreshold = 1000 } = options;

    if (useWorkers === false) return false;
    if (useWorkers === true) return true;

    // Auto mode: use workers for large graphs
    const nodeCount = graph.nodes.size;
    return nodeCount >= workerThreshold;
  }

  /**
   * Partition nodes for parallel processing
   */
  static partitionNodes(graph, numPartitions) {
    const nodes = Array.from(graph.nodes.keys());
    const partitionSize = Math.ceil(nodes.length / numPartitions);
    const partitions = [];

    for (let i = 0; i < numPartitions; i++) {
      const start = i * partitionSize;
      const end = Math.min(start + partitionSize, nodes.length);
      partitions.push(nodes.slice(start, end));
    }

    return partitions;
  }

  /**
   * Degree centrality - embarrassingly parallel
   */
  static async degreeParallel(graph, workerPool, options = {}) {
    const numWorkers = workerPool.maxWorkers;
    const partitions = this.partitionNodes(graph, numWorkers);

    const tasks = partitions.map(nodeIds => {
      return workerPool.execute({
        type: 'degree',
        graphData: this.serializeGraph(graph),
        nodeIds,
        options
      });
    });

    const results = await Promise.all(tasks);
    return this.mergeResults(results);
  }

  /**
   * Betweenness centrality - partition by source nodes
   */
  static async betweennessParallel(graph, workerPool, options = {}) {
    const numWorkers = workerPool.maxWorkers;
    const partitions = this.partitionNodes(graph, numWorkers);

    // Each worker calculates betweenness for paths starting from its nodes
    const tasks = partitions.map((nodeIds, index) => {
      return workerPool.execute({
        type: 'betweenness',
        graphData: this.serializeGraph(graph),
        sourceNodes: nodeIds,
        options
      }, {
        onProgress: (progress) => {
          if (options.onProgress) {
            const totalProgress = (index + progress) / numWorkers;
            options.onProgress(totalProgress);
          }
        }
      });
    });

    const results = await Promise.all(tasks);
    return this.mergeBetweennessResults(results);
  }

  /**
   * Clustering coefficient - embarrassingly parallel
   */
  static async clusteringParallel(graph, workerPool, options = {}) {
    const numWorkers = workerPool.maxWorkers;
    const partitions = this.partitionNodes(graph, numWorkers);

    const tasks = partitions.map(nodeIds => {
      return workerPool.execute({
        type: 'clustering',
        graphData: this.serializeGraph(graph),
        nodeIds,
        options
      });
    });

    const results = await Promise.all(tasks);
    return this.mergeResults(results);
  }

  /**
   * Eigenvector centrality - iterative with coordination
   * Strategy: Run iterations in workers, sync after each iteration
   */
  static async eigenvectorParallel(graph, workerPool, options = {}) {
    const maxIterations = options.maxIterations || 100;
    const tolerance = options.tolerance || 1e-6;

    let scores = this.initializeScores(graph);

    for (let iter = 0; iter < maxIterations; iter++) {
      const numWorkers = workerPool.maxWorkers;
      const partitions = this.partitionNodes(graph, numWorkers);

      // Each worker updates scores for its partition
      const tasks = partitions.map(nodeIds => {
        return workerPool.execute({
          type: 'eigenvector_iteration',
          graphData: this.serializeGraph(graph),
          nodeIds,
          currentScores: scores,
          options
        });
      });

      const results = await Promise.all(tasks);
      const newScores = this.mergeResults(results);

      // Check convergence
      const diff = this.calculateDifference(scores, newScores);
      scores = newScores;

      if (options.onProgress) {
        options.onProgress(iter / maxIterations);
      }

      if (diff < tolerance) {
        break;
      }
    }

    return scores;
  }

  /**
   * Community detection - iterative with coordination
   * Strategy: Each iteration coordinated by main thread
   */
  static async louvainParallel(graph, workerPool, options = {}) {
    // Louvain is inherently sequential in its phases
    // But we can parallelize within each phase

    let communities = this.initializeCommunities(graph);
    let improved = true;
    let iteration = 0;

    while (improved && iteration < 100) {
      improved = false;

      // Phase 1: Local optimization (parallelizable)
      const numWorkers = workerPool.maxWorkers;
      const partitions = this.partitionNodes(graph, numWorkers);

      const tasks = partitions.map(nodeIds => {
        return workerPool.execute({
          type: 'louvain_local_move',
          graphData: this.serializeGraph(graph),
          nodeIds,
          communities,
          options
        });
      });

      const results = await Promise.all(tasks);
      const moveResults = this.mergeLouvainResults(results);

      if (moveResults.improved) {
        improved = true;
        communities = moveResults.communities;
      }

      // Phase 2: Aggregation (needs to be in main thread or single worker)
      // This creates the meta-graph for next iteration

      if (options.onProgress) {
        options.onProgress(Math.min(iteration / 10, 0.99));
      }

      iteration++;
    }

    return communities;
  }

  /**
   * Layout algorithms - require coordination
   * Strategy: Parallel force calculations, sequential position updates
   */
  static async forceDirectedParallel(graph, workerPool, options = {}) {
    const iterations = options.iterations || 100;
    let positions = this.initializePositions(graph);

    for (let iter = 0; iter < iterations; iter++) {
      const numWorkers = workerPool.maxWorkers;
      const partitions = this.partitionNodes(graph, numWorkers);

      // Each worker calculates forces for its nodes
      const tasks = partitions.map(nodeIds => {
        return workerPool.execute({
          type: 'force_calculation',
          graphData: this.serializeGraph(graph),
          nodeIds,
          positions,
          iteration: iter,
          options
        });
      });

      const results = await Promise.all(tasks);
      positions = this.mergePositions(results);

      if (options.onProgress) {
        options.onProgress(iter / iterations);
      }
    }

    return positions;
  }

  /**
   * Serialize graph for worker transfer
   * Minimize data transfer by only sending necessary data
   */
  static serializeGraph(graph) {
    return {
      nodes: Array.from(graph.nodes.keys()),
      edges: Array.from(graph.connections.entries()).flatMap(([source, targets]) =>
        Array.from(targets.entries()).map(([target, weight]) => ({
          source,
          target,
          weight: weight.weight
        }))
      )
    };
  }

  /**
   * Initialize scores for iterative algorithms
   */
  static initializeScores(graph) {
    const scores = {};
    graph.nodes.forEach((_, nodeId) => {
      scores[nodeId] = 1.0 / graph.nodes.size;
    });
    return scores;
  }

  /**
   * Initialize positions for layout algorithms
   */
  static initializePositions(graph) {
    const positions = {};
    const nodes = Array.from(graph.nodes.keys());
    nodes.forEach((nodeId, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      positions[nodeId] = {
        x: Math.cos(angle) * 100,
        y: Math.sin(angle) * 100
      };
    });
    return positions;
  }

  /**
   * Initialize communities (each node in its own community)
   */
  static initializeCommunities(graph) {
    const communities = {};
    Array.from(graph.nodes.keys()).forEach((nodeId, i) => {
      communities[nodeId] = i;
    });
    return communities;
  }

  /**
   * Merge results from multiple workers
   */
  static mergeResults(results) {
    return Object.assign({}, ...results);
  }

  /**
   * Merge betweenness results (sum contributions)
   */
  static mergeBetweennessResults(results) {
    const merged = {};
    results.forEach(result => {
      Object.entries(result).forEach(([nodeId, value]) => {
        merged[nodeId] = (merged[nodeId] || 0) + value;
      });
    });
    return merged;
  }

  /**
   * Merge Louvain results
   */
  static mergeLouvainResults(results) {
    // Combine community assignments and check if any improved
    const communities = Object.assign({}, ...results.map(r => r.communities));
    const improved = results.some(r => r.improved);
    return { communities, improved };
  }

  /**
   * Merge position results
   */
  static mergePositions(results) {
    return Object.assign({}, ...results);
  }

  /**
   * Calculate difference between two score sets
   */
  static calculateDifference(scores1, scores2) {
    let maxDiff = 0;
    Object.keys(scores1).forEach(nodeId => {
      const diff = Math.abs(scores1[nodeId] - scores2[nodeId]);
      maxDiff = Math.max(maxDiff, diff);
    });
    return maxDiff;
  }
}
```

---

### 4. Worker Script Template

**Purpose:** Template for worker that executes algorithms

**File:** `src/compute/network-worker.js`

```javascript
/**
 * Network Worker - Executes graph algorithms in parallel
 * Works in both WebWorker (browser) and Worker Threads (Node.js)
 */

// Import graph algorithms
// In browser: will be bundled
// In Node: use require
let Graph, Network;

if (typeof importScripts !== 'undefined') {
  // Browser WebWorker
  importScripts('./graph.js', './network.js');
  Graph = self.Graph;
  Network = self.Network;
} else {
  // Node.js Worker Thread
  const { parentPort } = require('worker_threads');
  Graph = require('../graph').Graph;
  Network = require('../network').Network;

  // Adapt Node.js Worker Thread API to WebWorker-like API
  self = {
    postMessage: (msg) => parentPort.postMessage(msg),
    onmessage: null
  };
  parentPort.on('message', (msg) => {
    if (self.onmessage) self.onmessage({ data: msg });
  });
}

/**
 * Main message handler
 */
self.onmessage = async function(e) {
  const { id, type, graphData, options, nodeIds, sourceNodes } = e.data;

  try {
    // Build graph from serialized data
    const graph = deserializeGraph(graphData);

    let result;

    switch (type) {
      case 'degree':
        result = calculateDegree(graph, nodeIds, options);
        break;

      case 'betweenness':
        result = calculateBetweenness(graph, sourceNodes, options, id);
        break;

      case 'clustering':
        result = calculateClustering(graph, nodeIds, options);
        break;

      case 'eigenvector_iteration':
        result = eigenvectorIteration(graph, nodeIds, e.data.currentScores, options);
        break;

      case 'louvain_local_move':
        result = louvainLocalMove(graph, nodeIds, e.data.communities, options);
        break;

      case 'force_calculation':
        result = calculateForces(graph, nodeIds, e.data.positions, e.data.iteration, options);
        break;

      default:
        throw new Error(`Unknown algorithm type: ${type}`);
    }

    // Send result back to main thread
    self.postMessage({
      id,
      status: 'complete',
      result
    });

  } catch (error) {
    self.postMessage({
      id,
      status: 'error',
      error: error.message
    });
  }
};

/**
 * Deserialize graph data
 */
function deserializeGraph(graphData) {
  const graph = new Graph();

  graphData.nodes.forEach(nodeId => {
    graph.addNode(nodeId);
  });

  graphData.edges.forEach(({ source, target, weight }) => {
    graph.addEdge(source, target, weight);
  });

  return graph;
}

/**
 * Calculate degree for subset of nodes
 */
function calculateDegree(graph, nodeIds, options) {
  const result = {};
  nodeIds.forEach(nodeId => {
    result[nodeId] = graph.degree(nodeId);
  });
  return result;
}

/**
 * Calculate betweenness for paths starting from sourceNodes
 */
function calculateBetweenness(graph, sourceNodes, options, taskId) {
  const betweenness = {};
  graph.nodes.forEach((_, nodeId) => {
    betweenness[nodeId] = 0;
  });

  sourceNodes.forEach((source, index) => {
    // BFS from source to calculate shortest paths
    const paths = Network.shortestPathsFrom(graph, source);

    // Accumulate betweenness scores
    Network.accumulateBetweenness(betweenness, paths);

    // Report progress
    if (index % 10 === 0) {
      self.postMessage({
        id: taskId,
        status: 'progress',
        progress: index / sourceNodes.length
      });
    }
  });

  return betweenness;
}

/**
 * Calculate clustering coefficient for subset of nodes
 */
function calculateClustering(graph, nodeIds, options) {
  const result = {};
  nodeIds.forEach(nodeId => {
    result[nodeId] = Network.clusteringCoefficientNode(graph, nodeId);
  });
  return result;
}

/**
 * Perform one iteration of eigenvector centrality
 */
function eigenvectorIteration(graph, nodeIds, currentScores, options) {
  const newScores = {};

  nodeIds.forEach(nodeId => {
    let score = 0;
    const neighbors = graph.neighbors(nodeId);
    neighbors.forEach(neighbor => {
      score += currentScores[neighbor];
    });
    newScores[nodeId] = score;
  });

  return newScores;
}

/**
 * Louvain local move phase
 */
function louvainLocalMove(graph, nodeIds, communities, options) {
  let improved = false;
  const newCommunities = { ...communities };

  nodeIds.forEach(nodeId => {
    // Try moving node to neighbor's community
    const bestCommunity = Network.findBestCommunity(graph, nodeId, newCommunities);
    if (bestCommunity !== newCommunities[nodeId]) {
      newCommunities[nodeId] = bestCommunity;
      improved = true;
    }
  });

  return { communities: newCommunities, improved };
}

/**
 * Calculate forces for layout algorithm
 */
function calculateForces(graph, nodeIds, positions, iteration, options) {
  const newPositions = {};
  const { repulsion = 1000, attraction = 0.1, damping = 0.9 } = options;

  nodeIds.forEach(nodeId => {
    const pos = positions[nodeId];
    let fx = 0, fy = 0;

    // Repulsive forces from all nodes
    Object.entries(positions).forEach(([otherId, otherPos]) => {
      if (otherId !== nodeId) {
        const dx = pos.x - otherPos.x;
        const dy = pos.y - otherPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }
    });

    // Attractive forces from neighbors
    const neighbors = graph.neighbors(nodeId);
    neighbors.forEach(neighborId => {
      const neighborPos = positions[neighborId];
      const dx = neighborPos.x - pos.x;
      const dy = neighborPos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      fx += dx * attraction;
      fy += dy * attraction;
    });

    // Update position
    newPositions[nodeId] = {
      x: pos.x + fx * damping,
      y: pos.y + fy * damping
    };
  });

  return newPositions;
}
```

---

### 5. NetworkStats Integration

**Purpose:** Update NetworkStats to use workers automatically

**File:** `src/index.js` (modifications)

```javascript
import { WorkerPool } from './compute/WorkerPool.js';
import { ParallelAlgorithms } from './compute/ParallelAlgorithms.js';
import { WorkerAdapter } from './compute/WorkerAdapter.js';

class NetworkStats {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.useWorkers = options.useWorkers !== undefined ? options.useWorkers : 'auto';
    this.workerThreshold = options.workerThreshold || 1000;
    this.maxWorkers = options.maxWorkers;
    this.workerPool = null;
  }

  /**
   * Initialize worker pool if needed
   */
  async initializeWorkers() {
    if (this.workerPool) return;

    if (!WorkerAdapter.isSupported()) {
      if (this.verbose) {
        console.log('Workers not supported, using single-threaded mode');
      }
      return;
    }

    try {
      this.workerPool = new WorkerPool({
        maxWorkers: this.maxWorkers
      });
      await this.workerPool.initialize();

      if (this.verbose) {
        console.log(`Worker pool initialized with ${this.workerPool.maxWorkers} workers`);
      }
    } catch (error) {
      console.warn('Failed to initialize worker pool:', error);
      this.workerPool = null;
    }
  }

  /**
   * Analyze network with automatic worker selection
   */
  async analyze(network, features = [], options = {}) {
    const graph = this.buildGraph(network);
    const shouldUseWorkers = this.workerPool &&
                            ParallelAlgorithms.shouldUseWorkers(graph, null, {
                              useWorkers: this.useWorkers,
                              workerThreshold: this.workerThreshold
                            });

    if (shouldUseWorkers) {
      if (this.verbose) {
        console.log(`Using parallel computation for ${graph.nodes.size} nodes`);
      }
      return this.analyzeParallel(graph, features, options);
    } else {
      if (this.verbose) {
        console.log(`Using single-threaded computation for ${graph.nodes.size} nodes`);
      }
      return this.analyzeSingleThreaded(graph, features, options);
    }
  }

  /**
   * Single-threaded analysis (original implementation)
   */
  analyzeSingleThreaded(graph, features, options) {
    const results = [];
    // ... existing implementation ...
    return results;
  }

  /**
   * Parallel analysis using workers
   */
  async analyzeParallel(graph, features, options) {
    const results = {};
    const tasks = [];

    // Map features to parallel algorithms
    if (features.includes('degree')) {
      tasks.push(
        ParallelAlgorithms.degreeParallel(graph, this.workerPool, options)
          .then(res => { results.degree = res; })
      );
    }

    if (features.includes('betweenness')) {
      tasks.push(
        ParallelAlgorithms.betweennessParallel(graph, this.workerPool, options)
          .then(res => { results.betweenness = res; })
      );
    }

    if (features.includes('clustering')) {
      tasks.push(
        ParallelAlgorithms.clusteringParallel(graph, this.workerPool, options)
          .then(res => { results.clustering = res; })
      );
    }

    if (features.includes('eigenvector')) {
      tasks.push(
        ParallelAlgorithms.eigenvectorParallel(graph, this.workerPool, options)
          .then(res => { results.eigenvector = res; })
      );
    }

    await Promise.all(tasks);

    // Combine results into node objects
    return this.combineResults(graph, results);
  }

  /**
   * Combine parallel results into node objects
   */
  combineResults(graph, results) {
    const combined = [];
    graph.nodes.forEach((_, nodeId) => {
      const nodeResult = { id: nodeId };
      Object.entries(results).forEach(([feature, values]) => {
        nodeResult[feature] = values[nodeId];
      });
      combined.push(nodeResult);
    });
    return combined;
  }

  /**
   * Clean up worker pool
   */
  async dispose() {
    if (this.workerPool) {
      await this.workerPool.terminate();
      this.workerPool = null;
    }
  }
}
```

---

## Message Protocol

### Request Format
```javascript
{
  id: string,              // Unique task ID
  type: string,            // Algorithm type: 'degree', 'betweenness', etc.
  graphData: {             // Serialized graph
    nodes: string[],
    edges: Array<{source, target, weight}>
  },
  nodeIds?: string[],      // Subset of nodes to process
  sourceNodes?: string[],  // For betweenness partitioning
  options: object,         // Algorithm-specific options
  currentScores?: object,  // For iterative algorithms
  communities?: object,    // For community detection
  positions?: object,      // For layout algorithms
  iteration?: number       // Current iteration number
}
```

### Response Format
```javascript
{
  id: string,              // Matching task ID
  status: 'progress' | 'complete' | 'error',
  result?: object,         // Algorithm results
  progress?: number,       // 0-1 for progress updates
  error?: string          // Error message if failed
}
```

---

## Memory Optimization

### Strategies
1. **Transfer ownership** - Use Transferable objects where possible (ArrayBuffers)
2. **Minimize serialization** - Only send essential graph data
3. **Chunked processing** - Process large graphs in batches
4. **Result streaming** - Send partial results back early
5. **Worker reuse** - Keep workers alive between tasks

### Example: Transferable ArrayBuffers
```javascript
// Instead of sending object
const graphData = { nodes: [...], edges: [...] };

// Send as typed arrays (transferable)
const nodesBuffer = new Float64Array(nodes);
const edgesBuffer = new Float64Array(edges.flat());

worker.postMessage({
  nodesBuffer,
  edgesBuffer
}, [nodesBuffer.buffer, edgesBuffer.buffer]); // Transfer ownership
```

---

## Error Handling

### Worker Crashes
- Automatically restart failed workers
- Reassign task to new worker
- Reject promise with error

### Timeouts
```javascript
async execute(task, options = {}) {
  const timeout = options.timeout || 60000; // 60s default

  return Promise.race([
    this.executeTask(task),
    this.timeoutPromise(timeout)
  ]);
}
```

### Graceful Degradation
- Detect worker support before attempting
- Fall back to single-threaded if initialization fails
- Provide clear error messages

---

## Performance Considerations

### When to Use Workers
- **Use workers:** Large graphs (>1000 nodes), expensive algorithms
- **Don't use:** Small graphs, simple calculations (overhead > benefit)

### Algorithm Complexity
| Algorithm | Single-thread | Multi-thread (4 cores) | Speedup |
|-----------|---------------|------------------------|---------|
| Degree | O(n) | O(n/4) | ~4x |
| Betweenness | O(n³) | O(n³/4) | ~4x |
| Clustering | O(n*k²) | O(n*k²/4) | ~4x |
| Eigenvector | O(k*n*m) | O(k*n*m) + sync | ~2-3x |
| Louvain | O(n*log(n)) | O(n*log(n)) + sync | ~2x |

### Benchmarking
```javascript
// benchmark/worker-benchmark.js
async function benchmarkWorkers() {
  const graphs = [
    generateGraph(100),
    generateGraph(1000),
    generateGraph(10000),
    generateGraph(100000)
  ];

  for (const graph of graphs) {
    const single = await timeSingleThreaded(graph);
    const parallel = await timeParallel(graph);
    console.log(`Nodes: ${graph.nodes.size}, Single: ${single}ms, Parallel: ${parallel}ms, Speedup: ${single/parallel}x`);
  }
}
```

---

## Testing Strategy

### Unit Tests
- Test WorkerAdapter on both platforms
- Test WorkerPool task distribution
- Test partitioning strategies
- Mock workers for deterministic testing

### Integration Tests
- End-to-end with real algorithms
- Verify results match single-threaded
- Test error handling and recovery
- Memory leak detection

### Platform Tests
- Chrome, Firefox, Safari
- Node.js 18, 20, 22
- Mobile browsers

---

## Documentation

### User Guide
- When workers are used (auto mode)
- How to enable/disable workers
- How to configure worker count
- Progress callbacks
- Performance tips

### API Documentation
```javascript
/**
 * Analyze network with automatic parallel computation
 *
 * @param {Array} network - Edge list
 * @param {Array} features - Features to calculate
 * @param {Object} options - Options
 * @param {Function} options.onProgress - Progress callback (0-1)
 * @param {boolean|'auto'} options.useWorkers - Worker control
 * @param {number} options.workerThreshold - Min nodes for workers
 * @returns {Promise<Array>} Node statistics
 *
 * @example
 * const stats = await analyzer.analyze(network, ['betweenness'], {
 *   onProgress: (p) => console.log(`${Math.round(p*100)}%`),
 *   useWorkers: 'auto'
 * });
 */
```

---

## Next Steps

1. ✅ Design complete
2. ⏳ Implement WorkerAdapter
3. ⏳ Implement WorkerPool
4. ⏳ Implement ParallelAlgorithms
5. ⏳ Create worker script
6. ⏳ Update NetworkStats
7. ⏳ Write tests
8. ⏳ Benchmark
9. ⏳ Document

---

**Status:** Design phase complete, ready for implementation
**Estimated effort:** 2-3 weeks
**Risk level:** Medium (worker compatibility across platforms)
