# Statistics Architecture

This document describes the new statistics architecture implemented in `@guinetik/network-js`, following the same design patterns as the community detection module.

## Overview

The statistics module provides a clean, extensible architecture for calculating network metrics using the **Strategy Pattern**. This allows for:

- Easy addition of new statistics
- Consistent API across all metrics
- Clear separation between node-level and graph-level statistics
- Future support for parallel/worker-based computation

## Architecture

```
src/statistics/
├── NetworkStatistics.js          # Main coordinator class
├── algorithms/
│   ├── base.js                   # Abstract StatisticAlgorithm class
│   ├── node-stats.js             # Node-level statistic implementations
│   ├── graph-stats.js            # Graph-level statistic implementations
│   └── index.js                  # Exports all algorithms
└── index.js                      # Module entry point
```

## Core Classes

### 1. StatisticAlgorithm (Base Class)

Abstract base class that all statistics must extend.

```javascript
class StatisticAlgorithm {
  constructor(name, description, scope) {
    // name: 'degree', 'closeness', etc.
    // description: Human-readable description
    // scope: 'node' or 'graph'
  }

  calculate(graph, nodeIds = null) {
    // Must be implemented by subclasses
    // Returns: Object (node-level) or number (graph-level)
  }

  getInfo() {
    return { name, description, scope };
  }

  isNodeLevel() { return this.scope === 'node'; }
  isGraphLevel() { return this.scope === 'graph'; }
}
```

### 2. NetworkStatistics (Coordinator)

Main class for calculating statistics, similar to `CommunityDetection`.

```javascript
import { NetworkStatistics, DegreeStatistic } from '@guinetik/network-js';

const stats = new NetworkStatistics(graph);

// Calculate single statistic
const degrees = stats.calculate(new DegreeStatistic());
// { 'A': 3, 'B': 2, 'C': 1 }

// Calculate multiple statistics
const results = stats.calculateMultiple([
  new DegreeStatistic(),
  new ClosenessStatistic(),
  new DensityStatistic()
]);
// {
//   node: { degree: {...}, closeness: {...} },
//   graph: { density: 0.42 }
// }
```

## Available Statistics

### Node-Level Statistics

Statistics calculated per-node, returning `{ nodeId: value }`:

| Statistic | Class | Description | Complexity |
|-----------|-------|-------------|------------|
| **Degree** | `DegreeStatistic` | Number of connections | O(V) |
| **Closeness** | `ClosenessStatistic` | Average distance to all others | O(V² + VE) |
| **Ego Density** | `EgoDensityStatistic` | Density among neighbors | O(V * k²) |
| **Betweenness** | `BetweennessStatistic` | Frequency on shortest paths | O(V³) |
| **Clustering** | `ClusteringStatistic` | Local clustering coefficient | O(V * k²) |
| **Eigenvector** | `EigenvectorStatistic` | Importance based on neighbors | O(k * (V + E)) |
| **Cliques** | `CliquesStatistic` | Number of maximal cliques | O(3^(V/3)) |

### Graph-Level Statistics

Statistics calculated for the entire graph, returning a single value:

| Statistic | Class | Description | Complexity |
|-----------|-------|-------------|------------|
| **Density** | `DensityStatistic` | Ratio of actual/possible edges | O(1) |
| **Diameter** | `DiameterStatistic` | Longest shortest path | O(V³) |
| **Avg Clustering** | `AverageClusteringStatistic` | Mean local clustering | O(V * k²) |
| **Avg Path Length** | `AverageShortestPathStatistic` | Mean shortest path | O(V² + VE) |
| **Components** | `ConnectedComponentsStatistic` | Number of disconnected parts | O(V + E) |
| **Avg Degree** | `AverageDegreeStatistic` | Mean connections per node | O(V) |

## Usage Examples

### Basic Usage

```javascript
import {
  NetworkStatistics,
  DegreeStatistic,
  ClosenessStat
istic,
  DensityStatistic
} from '@guinetik/network-js';

// Create graph
const graph = new Graph();
graph.addNodesFrom(['A', 'B', 'C', 'D']);
graph.addEdge('A', 'B', 1);
graph.addEdge('B', 'C', 1);
graph.addEdge('C', 'D', 1);

// Initialize statistics calculator
const stats = new NetworkStatistics(graph);

// Calculate node-level statistic
const degree = stats.calculate(new DegreeStatistic());
console.log(degree);
// { 'A': 1, 'B': 2, 'C': 2, 'D': 1 }

// Calculate graph-level statistic
const density = stats.calculate(new DensityStatistic());
console.log(density);
// 0.5

// Calculate for specific nodes only
const closeness = stats.calculate(new ClosenessStatistic(), {
  nodeIds: ['A', 'B']
});
```

### Using with NetworkStats (Main Facade)

The `NetworkStats` class is the main facade for network analysis and has been **fully refactored** to use the new `NetworkStatistics` API internally. It now supports both node-level and graph-level statistics:

```javascript
import { NetworkStats } from '@guinetik/network-js';

const analyzer = new NetworkStats({ verbose: false });

const network = [
  { source: 'A', target: 'B' },
  { source: 'B', target: 'C' },
  { source: 'C', target: 'A' }
];

// Analyze with graph-level stats
const results = analyzer.analyze(network, ['degree', 'betweenness'], {
  includeGraphStats: true,
  graphStats: ['density', 'diameter', 'average-clustering']
});

console.log(results);
// {
//   nodes: [
//     { id: 'A', degree: 2, betweenness: 0 },
//     { id: 'B', degree: 2, betweenness: 0 },
//     { id: 'C', degree: 2, betweenness: 0 }
//   ],
//   graph: {
//     density: 1.0,
//     diameter: 1,
//     averageClustering: 1.0
//   }
// }
```

### String-Based API (Backward Compatibility)

```javascript
// Use string names instead of class instances
const degree = stats.calculate('degree');
const density = stats.calculate('density');
const closeness = stats.calculate('closeness', {
  normalized: true
});
```

### Calculate All Statistics

```javascript
// All node-level stats
const nodeStats = stats.calculateAllNodeStats();
// {
//   degree: {...},
//   closeness: {...},
//   'ego-density': {...},
//   betweenness: {...},
//   clustering: {...},
//   eigenvector: {...},
//   cliques: {...}
// }

// All graph-level stats
const graphStats = stats.calculateAllGraphStats();
// {
//   density: 0.42,
//   diameter: 5,
//   'average-clustering': 0.33,
//   'average-shortest-path': 2.1,
//   'connected-components': 1,
//   'average-degree': 3.2
// }
```

## Creating Custom Statistics

To add a new statistic, extend `StatisticAlgorithm`:

```javascript
import { StatisticAlgorithm } from '@guinetik/network-js';

class PageRankStatistic extends StatisticAlgorithm {
  constructor(options = {}) {
    super('pagerank', 'Google PageRank algorithm', 'node');
    this.dampingFactor = options.dampingFactor || 0.85;
    this.maxIterations = options.maxIterations || 100;
  }

  calculate(graph, nodeIds = null) {
    const nodes = nodeIds || Array.from(graph.nodes.keys());
    const result = {};

    // Implement PageRank algorithm
    // ...

    return result;
  }
}

// Use it
const stats = new NetworkStatistics(graph);
const pagerank = stats.calculate(new PageRankStatistic({
  dampingFactor: 0.90
}));
```

## Integration with Brazilian Networks Demo

The Brazilian Networks demo has been updated to showcase the new statistics:

1. **Graph Stats Box**: Persistent info box showing graph-level statistics (density, diameter, etc.)
2. **Node Hover**: Enhanced to show new node-level stats (closeness, ego-density)
3. **Auto-calculation**: Graph stats calculated automatically when analyzing network

### Demo Flow

1. Load network (Caruaru, RJ, or Niterói)
2. Select metrics to calculate
3. Click "Analyze Network"
   - Calculates selected node metrics
   - **NEW**: Also calculates all graph-level stats
   - Graph stats box appears with results
4. Hover over nodes to see their statistics
   - Shows all calculated metrics
   - **NEW**: Includes closeness and ego-density when available

## Future Enhancements

### 1. Worker Support

The architecture is designed to support parallel computation:

```javascript
// Future API (not yet implemented)
class ClosenessStatistic extends StatisticAlgorithm {
  async calculateParallel(graph, workerPool, options) {
    // Partition nodes across workers
    // Execute in parallel
    // Merge results
  }
}
```

### 2. Additional Statistics

Statistics planned for future implementation:

- **Node-Level**:
  - PageRank
  - HITS (Hubs and Authorities)
  - Core number (k-core decomposition)
  - Load centrality

- **Graph-Level**:
  - Assortativity
  - Transitivity (global clustering)
  - Degree distribution moments
  - Small-world coefficient

### 3. Performance Optimizations

- Lazy evaluation (calculate only when needed)
- Caching of intermediate results
- Incremental updates for dynamic graphs
- GPU acceleration for large graphs

## Internal Architecture

### NetworkStats Refactoring

The `NetworkStats` class (main facade) has been **completely refactored** to use the new statistics architecture:

**Before** (old implementation):
```javascript
#processDegree(graph) {
  return Network.degree(graph)._stringValues;  // Direct static method calls
}
```

**After** (new implementation):
```javascript
#processDegree(graph) {
  return this.statsCalculator.calculate(new DegreeStatistic());  // Uses new API
}
```

All node-level statistics now flow through:
```
NetworkStats.analyze()
  → #processFeatures()
  → NetworkStatistics.calculate()
  → DegreeStatistic.calculate() / BetweennessStatistic.calculate() / etc.
```

This means:
- ✅ **Single source of truth** for all statistics
- ✅ **Consistent behavior** across direct and facade APIs
- ✅ **Easier to maintain** - one implementation per statistic
- ✅ **Ready for workers** - can easily swap in parallel versions

## Comparison with Community Detection

The statistics architecture mirrors the community detection design:

| Community Detection | Statistics |
|---------------------|------------|
| `CommunityAlgorithm` | `StatisticAlgorithm` |
| `CommunityDetection` | `NetworkStatistics` |
| `LouvainAlgorithm` | `DegreeStatistic`, etc. |
| `detect(graph)` | `calculate(graph)` |
| Returns communities | Returns metrics |

## API Reference

### NetworkStatistics Class

```javascript
class NetworkStatistics {
  constructor(graph = null)
  setGraph(graph): NetworkStatistics

  calculate(algorithm, options = {}): Object|number
  calculateMultiple(algorithms, options = {}): Object

  calculateAllNodeStats(options = {}): Object
  calculateAllGraphStats(): Object

  static getAlgorithmInfo(name): Object
  static listNodeStatistics(): Array<Object>
  static listGraphStatistics(): Array<Object>
  static graphFromData(graphData): Graph
  static calculateFromData(graphData, algorithm, options = {}): Object|number
}
```

### StatisticAlgorithm Class

```javascript
class StatisticAlgorithm {
  constructor(name, description, scope)

  calculate(graph, nodeIds = null): Object|number
  getInfo(): { name, description, scope }
  isNodeLevel(): boolean
  isGraphLevel(): boolean
}
```

## Testing

(TODO: Add test examples once tests are implemented)

---

**Last Updated:** 2025-10-26
**Author:** Claude Code with @guinetik
**Status:** Implemented, ready for testing

