# js-network-stats

> **⚠️ Final Stable Release** - This package is in maintenance mode. For new projects with advanced features (worker parallelism, custom layouts, interactive visualizations), check out [@guinetik/graph-js](https://github.com/guinetik/graph-js).

A lightweight, serverless-friendly Node.js package for calculating network graph statistics. Perfect for AWS Lambda, batch jobs, and simple graph analysis.

## Why Use This?

- ✅ **Simple API**: Sync for small graphs, async for large graphs
- ✅ **Async with Workers**: Non-blocking computation with Node.js worker threads
- ✅ **Auto-Detection**: Automatically uses workers for graphs >500 edges
- ✅ **Progress Callbacks**: Real-time progress updates for long operations
- ✅ **Serverless-Friendly**: Sync API perfect for Lambda, async for long-running servers
- ✅ **Batteries Included**: Eigenvector, betweenness, clustering, community detection
- ✅ **TypeScript Support**: Full type definitions included
- ✅ **Minimal Dependencies**: Just jsnetworkx + built-in Louvain algorithm

## Installation

```bash
npm install js-network-stats
```

## Quick Start

### Synchronous API (Simple & Fast)

Perfect for small graphs (<500 edges), serverless functions, and batch jobs:

```javascript
import { getNetworkStats, FEATURES } from 'js-network-stats';

const network = [
  { source: 'Alice', target: 'Bob' },
  { source: 'Bob', target: 'Carol' },
  { source: 'Carol', target: 'Alice' },
  { source: 'David', target: 'Carol' }
];

const stats = getNetworkStats(network, [FEATURES.DEGREE, FEATURES.EIGENVECTOR]);

console.log(stats);
// [
//   { id: 'Alice', degree: 2, eigenvector: 0.577 },
//   { id: 'Bob', degree: 2, eigenvector: 0.577 },
//   { id: 'Carol', degree: 3, eigenvector: 0.707 },
//   { id: 'David', degree: 1, eigenvector: 0.408 }
// ]
```

### Async API (Non-Blocking with Workers)

Perfect for large graphs (>500 edges), long-running servers, and CLI tools:

```javascript
import { getNetworkStatsAsync, cleanup } from 'js-network-stats/async';

const network = [...]; // Your large network

// Automatic worker detection
const stats = await getNetworkStatsAsync(network, ['degree', 'betweenness'], {
  onProgress: (progress) => console.log(`${Math.round(progress * 100)}%`)
});

// Clean up worker threads when done
await cleanup();
```

## API Reference

### Synchronous API

#### `getNetworkStats(network, features?, options?)`

Calculate network statistics for a graph (blocking, single-threaded).

**Parameters:**

- `network` **Array&lt;NetworkEdge&gt;** - Array of edge objects with `source` and `target` properties
- `features` **Array&lt;string&gt; | null** - Features to calculate (defaults to all features)
- `options` **Object** - Configuration options
  - `options.verbose` **boolean** - Enable console output (default: `true`)
  - `options.maxIter` **number** - Max iterations for eigenvector (default: `100000`)

**Returns:** **Array&lt;NodeStats&gt;** - Array of node objects with calculated statistics

**Throws:**
- `TypeError` - If network is not an array or features is invalid
- `Error` - If network is empty or contains invalid edges

### Available Features

Import the `FEATURES` constant for easy access to feature names:

```javascript
import { FEATURES } from 'js-network-stats';

const stats = getNetworkStats(network, [
  FEATURES.DEGREE,        // Node degree (number of connections)
  FEATURES.EIGENVECTOR,   // Eigenvector centrality
  FEATURES.BETWEENNESS,   // Betweenness centrality
  FEATURES.CLOSENESS,     // Closeness centrality
  FEATURES.HARMONIC,      // Harmonic centrality
  FEATURES.PAGERANK,      // PageRank
  FEATURES.CLUSTERING,    // Clustering coefficient
  FEATURES.CLIQUES,       // Number of cliques
  FEATURES.MODULARITY     // Community detection (Louvain)
]);
```

Or use `null` to calculate all features:

```javascript
const allStats = getNetworkStats(network, null);
```

## Feature Descriptions

### `eigenvector`
**Eigenvector Centrality** - Measures node influence based on connections to other high-scoring nodes. Computed using the Perron-Frobenius theorem on the adjacency matrix.

**Range:** 0-1 (higher = more influential)

### `betweenness`
**Betweenness Centrality** - Measures how often a node lies on shortest paths between other nodes. Useful for identifying "bridge" nodes in a network.

**Formula:**
$$c_B(v) =\sum_{s,t \in V} \frac{\sigma(s, t|v)}{\sigma(s, t)}$$

**Range:** 0-1 (higher = more critical for connectivity)

### `closeness`
**Closeness Centrality** - Measures how close a node is to all other nodes in the network. Nodes with high closeness can quickly reach all other nodes.

**Formula:**
$$C(u) = \frac{n - 1}{\sum_{v=1}^{n-1} d(v, u)}$$

where $d(v, u)$ is the shortest-path distance between vertices $v$ and $u$, and $n$ is the number of nodes.

**Range:** 0-1 (higher = more central/accessible)

**Use cases:** Finding optimal warehouse locations, identifying central hubs in transportation networks

### `harmonic`
**Harmonic Centrality** - A variant of closeness centrality that uses the harmonic mean of distances. Better suited for disconnected graphs as it handles infinite distances gracefully.

**Formula:**
$$H(u) = \sum_{v \neq u} \frac{1}{d(v, u)}$$

**Range:** 0 to n-1 (higher = more central)

**Use cases:** Analyzing social networks with disconnected communities, real-world networks with unreachable nodes

### `pagerank`
**PageRank** - Google's algorithm for ranking web pages. Computes node importance based on the structure and weight of incoming connections. A node is important if it's linked to by other important nodes.

**Range:** 0-1 (sum of all scores = 1)

**Parameters:**
- `alpha`: Damping factor (default: 0.85) - probability of continuing random walk
- `maxIter`: Maximum iterations (default: 100)

**Use cases:** Finding influencers in social networks, identifying authoritative nodes, ranking importance

### `clustering`
**Clustering Coefficient** - Measures how densely connected a node's neighbors are. Indicates local community structure.

**Formula (unweighted):**
$$c_u = \frac{2 T(u)}{deg(u)(deg(u)-1)}$$

**Range:** 0-1 (1 = all neighbors are connected)

### `cliques`
**Maximal Cliques** - The largest complete subgraph containing a given node. All nodes in a clique are directly connected.

**Returns:** Integer (number of cliques)

### `degree`
**Node Degree** - The number of edges connected to a node. For weighted graphs, this is the sum of edge weights.

**Returns:** Integer or float (for weighted graphs)

### `modularity`
**Community Detection (Louvain)** - Assigns nodes to communities using modularity optimization. Nodes in the same community are more densely connected.

**Returns:** Integer (community ID)

### Async API

#### `getNetworkStatsAsync(network, features?, options?)`

Calculate network statistics asynchronously with optional worker thread support (non-blocking).

**Import:**
```javascript
import { getNetworkStatsAsync, cleanup } from 'js-network-stats/async';
```

**Parameters:**

- `network` **Array&lt;NetworkEdge&gt;** - Array of edge objects
- `features` **Array&lt;string&gt; | null** - Features to calculate
- `options` **Object** - Configuration options
  - `options.verbose` **boolean** - Enable console output (default: `true`)
  - `options.maxIter` **number** - Max iterations for eigenvector (default: `100000`)
  - `options.workers` **boolean | 'auto'** - Worker mode (default: `'auto'`)
    - `true` - Force use of worker threads
    - `false` - Force synchronous computation
    - `'auto'` - Smart detection based on graph size
  - `options.workerThreshold` **number** - Edge count threshold for auto mode (default: `500`)
  - `options.maxWorkers` **number** - Maximum worker threads (default: CPU count - 1)
  - `options.taskTimeout` **number** - Task timeout in ms (default: `60000`)
  - `options.onProgress` **Function** - Progress callback receiving 0-1 progress value

**Returns:** **Promise&lt;Array&lt;NodeStats&gt;&gt;** - Promise resolving to node statistics

**Examples:**

```javascript
// Simple async usage (auto worker detection)
const stats = await getNetworkStatsAsync(network, ['degree']);

// With progress callback
const stats = await getNetworkStatsAsync(network, ['betweenness'], {
  onProgress: (p) => console.log(`Progress: ${Math.round(p * 100)}%`)
});

// Force workers on
const stats = await getNetworkStatsAsync(network, ['degree'], {
  workers: true
});

// Force sync mode (no workers)
const stats = await getNetworkStatsAsync(network, ['degree'], {
  workers: false
});

// Custom worker threshold
const stats = await getNetworkStatsAsync(network, ['degree'], {
  workers: 'auto',
  workerThreshold: 1000 // Use workers for graphs > 1000 edges
});

// Don't forget to cleanup when done!
await cleanup();
```

**When to use async API:**
- ✅ Large graphs (>500 edges)
- ✅ Long-running servers
- ✅ CLI tools with progress feedback
- ✅ When you need non-blocking computation
- ❌ AWS Lambda (use sync API - workers add overhead)
- ❌ Very small graphs (<100 edges)

#### `cleanup()`

Terminates worker threads and frees resources. Call this when you're done with async operations.

```javascript
import { cleanup } from 'js-network-stats/async';

// After all async work is complete
await cleanup();
```

## Examples

### TypeScript Usage

```typescript
import { getNetworkStats, FEATURES, NodeStats, NetworkEdge } from 'js-network-stats';

const network: NetworkEdge[] = [
  { source: 'A', target: 'B', weight: 1.5 },
  { source: 'B', target: 'C', weight: 2.0 }
];

const stats: NodeStats[] = getNetworkStats(network, [FEATURES.DEGREE]);
```

### Serverless (AWS Lambda)

```javascript
import { getNetworkStats, FEATURES } from 'js-network-stats';

export const handler = async (event) => {
  const network = JSON.parse(event.body);

  try {
    const stats = getNetworkStats(
      network,
      [FEATURES.DEGREE, FEATURES.BETWEENNESS],
      { verbose: false } // Disable console logs in Lambda
    );

    return {
      statusCode: 200,
      body: JSON.stringify(stats)
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

### Error Handling

```javascript
import { getNetworkStats, FEATURES } from 'js-network-stats';

try {
  const stats = getNetworkStats(network, [FEATURES.DEGREE]);
} catch (error) {
  if (error instanceof TypeError) {
    console.error('Invalid input type:', error.message);
  } else {
    console.error('Analysis failed:', error.message);
  }
}
```

### Selective Feature Calculation

Calculate only what you need for better performance:

```javascript
// Fast: Only degree calculation
const degreeOnly = getNetworkStats(network, [FEATURES.DEGREE]);

// Medium: Degree + clustering
const localMetrics = getNetworkStats(network, [FEATURES.DEGREE, FEATURES.CLUSTERING]);

// Slow: Betweenness (O(n³) complexity)
const centrality = getNetworkStats(network, [FEATURES.BETWEENNESS]);
```

## Performance Notes

- **Degree**: O(V) - Very fast
- **Clustering**: O(V·d²) - Fast for sparse graphs
- **Eigenvector**: O(V²) - Medium, depends on maxIter
- **Betweenness**: O(V³) - Slow for large graphs (>1000 nodes)
- **Louvain**: O(n log n) - Medium, depends on graph density

For large graphs (>10,000 nodes), consider using [@guinetik/graph-js](https://github.com/guinetik/graph-js) which provides worker-based parallelism.

## Migration to @guinetik/graph-js

If you need advanced features, migrate to the new package:

**js-network-stats** (this package):
```javascript
import { getNetworkStats } from 'js-network-stats';
const stats = getNetworkStats(network, ['degree']);
```

**@guinetik/graph-js** (new package):
```javascript
import NetworkStats from '@guinetik/graph-js';

const analyzer = new NetworkStats();
const stats = await analyzer.analyze(network, ['degree']); // Async with workers!
```

**Key Differences:**

| Feature | js-network-stats | @guinetik/graph-js |
|---------|------------------|---------------------|
| API Style | Synchronous | Async/await |
| Workers | ❌ No | ✅ Yes (parallel computation) |
| Progress Callbacks | ❌ No | ✅ Yes |
| Graph Layouts | ❌ No | ✅ 11 algorithms |
| Custom Graph Class | ❌ No | ✅ Yes |
| Browser Support | ❌ No | ✅ Yes |
| Best For | Serverless, simple batch jobs | Large graphs, interactive apps |

## Contributing

This package is in maintenance mode. Bug fixes are welcome, but new features should go to [@guinetik/graph-js](https://github.com/guinetik/graph-js).

## License

MIT © [guinetik](https://github.com/guinetik)

## Links

- [GitHub Repository](https://github.com/guinetik/js-network-stats)
- [npm Package](https://www.npmjs.com/package/js-network-stats)
- [Advanced Features → @guinetik/graph-js](https://github.com/guinetik/graph-js)
