# Compute Infrastructure

Parallel computation support for network-js, enabling analysis of large graphs (10k-100k+ nodes) using WebWorkers (browser) and Worker Threads (Node.js).

## Overview

The compute infrastructure provides:

- **Universal API** - Same interface for browser and Node.js
- **Automatic optimization** - Auto-detects when to use workers based on graph size
- **Progress tracking** - Monitor long-running operations
- **Worker pooling** - Efficient reuse of workers
- **Error recovery** - Automatic restart of failed workers

## Architecture

```
┌─────────────────────────────────┐
│      Your Application           │
└───────────┬─────────────────────┘
            │
┌───────────▼─────────────────────┐
│     ParallelAlgorithms          │  ← High-level API
│  (Partitioning & Coordination)  │
└───────────┬─────────────────────┘
            │
┌───────────▼─────────────────────┐
│        WorkerPool               │  ← Worker management
│    (Task queue & distribution)  │
└───────────┬─────────────────────┘
            │
    ┌───────┴───────┐
    │               │
┌───▼────┐    ┌────▼───┐
│Worker 1│    │Worker N│  ← Execute algorithms
└────────┘    └────────┘
```

## Components

### WorkerAdapter

Platform abstraction layer that provides a unified interface for WebWorkers (browser) and Worker Threads (Node.js).

```javascript
import { WorkerAdapter } from './compute/WorkerAdapter.js';

// Check if workers are supported
if (WorkerAdapter.isSupported()) {
  const worker = WorkerAdapter.create('./network-worker.js');

  worker.onMessage((data) => {
    console.log('Result:', data);
  });

  worker.postMessage({ type: 'compute', data: [...] });
}
```

### WorkerPool

Manages a pool of workers with automatic scaling, task queuing, and error recovery.

```javascript
import { WorkerPool } from './compute/WorkerPool.js';

const pool = new WorkerPool({
  maxWorkers: 4,              // Default: CPU core count
  workerScript: './worker.js',
  taskTimeout: 60000,         // 60 seconds
  verbose: true
});

await pool.initialize();

const result = await pool.execute({
  type: 'betweenness',
  graphData: { nodes: [...], edges: [...] }
}, {
  onProgress: (p) => console.log(`${Math.round(p*100)}%`),
  timeout: 120000
});

await pool.terminate();
```

### ParallelAlgorithms

High-level API for running graph algorithms in parallel with intelligent partitioning strategies.

```javascript
import { Graph } from '../graph.js';
import { WorkerPool, ParallelAlgorithms } from './compute/index.js';

const graph = new Graph();
// ... add nodes and edges ...

const pool = new WorkerPool({ maxWorkers: 4 });
await pool.initialize();

// Degree centrality (embarrassingly parallel)
const degrees = await ParallelAlgorithms.degreeParallel(graph, pool, {
  onProgress: (p) => console.log(`${p * 100}%`)
});

// Betweenness centrality (partition by source nodes)
const betweenness = await ParallelAlgorithms.betweennessParallel(graph, pool);

// Clustering coefficient
const clustering = await ParallelAlgorithms.clusteringParallel(graph, pool);

await pool.terminate();
```

## Usage Patterns

### Pattern 1: Auto-detection

Let the library decide when to use workers based on graph size:

```javascript
const result = await ParallelAlgorithms.execute('betweenness', graph, pool, {
  useWorkers: 'auto',      // 'auto', true, or false
  workerThreshold: 1000    // Minimum nodes for workers
});
```

### Pattern 2: Manual control

Explicitly control worker usage:

```javascript
// Always use workers
const result = await ParallelAlgorithms.degreeParallel(graph, pool, {
  useWorkers: true
});

// Never use workers
const result = await ParallelAlgorithms.degreeParallel(graph, null, {
  useWorkers: false
});
```

### Pattern 3: Multiple algorithms

Run multiple algorithms concurrently:

```javascript
const [degrees, clustering, betweenness] = await Promise.all([
  ParallelAlgorithms.degreeParallel(graph, pool),
  ParallelAlgorithms.clusteringParallel(graph, pool),
  ParallelAlgorithms.betweennessParallel(graph, pool)
]);
```

### Pattern 4: Progress tracking

Monitor long-running operations:

```javascript
let lastUpdate = Date.now();

const result = await ParallelAlgorithms.betweennessParallel(graph, pool, {
  onProgress: (progress) => {
    const now = Date.now();
    if (now - lastUpdate > 1000) {
      console.log(`Progress: ${Math.round(progress * 100)}%`);
      lastUpdate = now;
    }
  }
});
```

## Supported Algorithms

### Embarrassingly Parallel
These algorithms can be easily split across workers:

- **Degree centrality** - `degreeParallel()`
- **Clustering coefficient** - `clusteringParallel()`
- **Clique counting** - `cliquesParallel()`

### Partition-friendly
These algorithms can be partitioned with some coordination:

- **Betweenness centrality** - `betweennessParallel()` (partition by source nodes)

### Iterative
These algorithms require iteration coordination:

- **Eigenvector centrality** - `eigenvectorParallel()` (runs in single worker)

### Layout Algorithms
Force calculations can be parallelized:

- **Force-directed layout** - `forceDirectedParallel()`

## Performance

### Expected Speedups (4 cores)

| Algorithm | Graph Size | Single-threaded | Multi-threaded | Speedup |
|-----------|-----------|-----------------|----------------|---------|
| Degree | 10k nodes | 50ms | 15ms | ~3.3x |
| Clustering | 10k nodes | 2s | 600ms | ~3.3x |
| Betweenness | 1k nodes | 30s | 10s | ~3x |
| Betweenness | 10k nodes | Very slow | 5min | ~3x |

### When to Use Workers

**Use workers when:**
- Graph has >1000 nodes
- Running expensive algorithms (betweenness, clustering)
- Multiple algorithms can run concurrently
- User needs progress feedback

**Don't use workers when:**
- Graph has <1000 nodes (overhead > benefit)
- Running simple calculations (degree on small graph)
- Workers not supported (will fall back automatically)

## Configuration

### Worker Pool Options

```javascript
const pool = new WorkerPool({
  // Maximum number of workers (default: CPU core count)
  maxWorkers: 4,

  // Path to worker script (default: auto-detected)
  workerScript: './network-worker.js',

  // Task timeout in milliseconds (default: 60000)
  taskTimeout: 60000,

  // Enable verbose logging (default: false)
  verbose: true
});
```

### Execution Options

```javascript
const result = await ParallelAlgorithms.degreeParallel(graph, pool, {
  // Worker usage: 'auto', true, or false (default: 'auto')
  useWorkers: 'auto',

  // Threshold for auto mode (default: 1000 nodes)
  workerThreshold: 1000,

  // Progress callback
  onProgress: (progress) => console.log(`${progress * 100}%`),

  // Task timeout override
  timeout: 120000
});
```

## Error Handling

### Worker Errors

Workers are automatically restarted on error:

```javascript
try {
  const result = await pool.execute(task);
} catch (error) {
  console.error('Task failed:', error.message);
}
```

### Timeouts

Tasks that exceed timeout are automatically cancelled:

```javascript
const pool = new WorkerPool({ taskTimeout: 30000 }); // 30 seconds

try {
  const result = await pool.execute(expensiveTask);
} catch (error) {
  if (error.message.includes('timed out')) {
    console.log('Task took too long, consider using smaller graph');
  }
}
```

### Graceful Degradation

Workers automatically fall back to single-threaded if not supported:

```javascript
const pool = new WorkerPool();

try {
  await pool.initialize();
  console.log('Workers available');
} catch (error) {
  console.log('Workers not available, falling back to single-threaded');
  pool = null; // ParallelAlgorithms will handle this
}
```

## Worker Pool Lifecycle

### Best Practices

```javascript
// Create pool once
const pool = new WorkerPool({ maxWorkers: 4 });
await pool.initialize();

try {
  // Reuse pool for multiple tasks
  const result1 = await ParallelAlgorithms.degreeParallel(graph1, pool);
  const result2 = await ParallelAlgorithms.clusteringParallel(graph2, pool);
  const result3 = await ParallelAlgorithms.betweennessParallel(graph3, pool);
} finally {
  // Clean up when done
  await pool.terminate();
}
```

### Monitoring

```javascript
const status = pool.getStatus();
console.log(status);
// {
//   initialized: true,
//   totalWorkers: 4,
//   availableWorkers: 2,
//   busyWorkers: 2,
//   activeTasks: 2,
//   queuedTasks: 3
// }
```

## Integration with NetworkStats

The compute infrastructure can be integrated with the main `NetworkStats` class:

```javascript
import { NetworkStats } from './index.js';

const analyzer = new NetworkStats({
  useWorkers: 'auto',        // Enable worker support
  workerThreshold: 1000,     // Threshold for auto mode
  maxWorkers: 4              // Worker pool size
});

// Automatically uses workers for large graphs
const results = await analyzer.analyze(largeNetwork, ['betweenness', 'clustering'], {
  onProgress: (p) => console.log(`${p * 100}%`)
});
```

## Browser Bundling

### Vite Configuration

```javascript
// vite.config.js
export default {
  worker: {
    format: 'es'
  },
  build: {
    rollupOptions: {
      output: {
        // Worker files
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.includes('worker')) {
            return 'workers/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        }
      }
    }
  }
};
```

### Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /network-worker\.js$/,
        use: { loader: 'worker-loader' }
      }
    ]
  }
};
```

## Testing

### Unit Tests

```javascript
import { WorkerAdapter, WorkerPool, ParallelAlgorithms } from './compute/index.js';
import { Graph } from '../graph.js';

describe('WorkerPool', () => {
  let pool;

  beforeEach(async () => {
    pool = new WorkerPool({ maxWorkers: 2 });
    await pool.initialize();
  });

  afterEach(async () => {
    await pool.terminate();
  });

  test('executes tasks in parallel', async () => {
    const graph = new Graph();
    // ... setup graph ...

    const result = await ParallelAlgorithms.degreeParallel(graph, pool);
    expect(Object.keys(result).length).toBe(graph.nodes.size);
  });
});
```

## Troubleshooting

### Workers not detected

**Problem:** `WorkerAdapter.isSupported()` returns false

**Solutions:**
- Browser: Check if running in a secure context (HTTPS or localhost)
- Node.js: Ensure Node.js version >= 12 (Worker Threads introduced in v12)
- Check browser compatibility (IE not supported)

### Worker script not loading

**Problem:** Error loading worker script

**Solutions:**
- Browser: Check CORS policy, ensure worker script served from same origin
- Node.js: Verify worker script path is correct
- Bundlers: Configure worker bundling (see "Browser Bundling" section)

### Performance not improved

**Problem:** Workers slower than single-threaded

**Solutions:**
- Graph may be too small (overhead > benefit)
- Increase `workerThreshold` in options
- Check if algorithm is parallelizable (some have limited speedup)
- Verify worker pool size matches CPU core count

### Memory issues

**Problem:** High memory usage with workers

**Solutions:**
- Reduce `maxWorkers` (fewer workers = less memory)
- Process graph in batches
- Use smaller worker threshold to avoid workers on large graphs
- Increase task timeout to avoid accumulating failed tasks

## Examples

See `examples/parallel-computation.js` for comprehensive examples demonstrating:

1. Basic worker pool usage
2. Betweenness centrality on large graphs
3. Auto-detection of worker usage
4. Multiple algorithms in parallel
5. Status monitoring
6. Error handling

Run examples:

```bash
cd network-js
node examples/parallel-computation.js
```

## API Reference

See the JSDoc comments in source files for detailed API documentation:

- `src/compute/WorkerAdapter.js` - Platform abstraction
- `src/compute/WorkerPool.js` - Worker pool management
- `src/compute/ParallelAlgorithms.js` - Parallel algorithm execution
- `src/compute/network-worker.js` - Worker implementation

## Future Enhancements

Potential improvements for future versions:

1. **Transferable objects** - Use ArrayBuffers for faster data transfer
2. **Streaming results** - Send partial results back progressively
3. **GPU acceleration** - WebGL compute shaders for massive graphs
4. **Distributed computing** - Multiple machines for very large graphs
5. **Algorithm-specific optimizations** - Barnes-Hut for force-directed, etc.

## License

MIT - Same as network-js
