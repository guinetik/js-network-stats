# Layout Algorithm Implementations

## Summary

Successfully implemented 4 new graph layout algorithms following the project's worker-first architecture and NetworkX specifications.

### New Layouts Added

1. **Kamada-Kawai Layout** ✅
   - **File**: `network-js/src/layouts/kamada-kawai.js`
   - **Class**: `KamadaKawaiLayout`
   - **Complexity**: O(n³) for all-pairs shortest paths + O(iterations × n²) for optimization
   - **Features**:
     - Energy minimization based on all-pairs shortest paths
     - Positions nodes such that Euclidean distance matches graph-theoretic distance
     - Ideal for small to medium graphs (<1000 nodes), trees, and planar graphs
     - Deterministic and high-quality layouts
   - **Parameters**:
     - `iterations`: Number of optimization iterations (default: 100)
     - `scale`: Scale factor for final positions (default: 1)
     - `center`: Center point for layout (default: {x: 0, y: 0})
     - `initialPositions`: Optional initial node positions
     - `threshold`: Convergence threshold (default: 1e-4)
     - `K`: Scaling factor for spring constant (auto-calculated if null)
   - **Worker Integration**: ✅ Full async/worker support
   - **From Roadmap**: Phase 3.5

2. **Bipartite Layout** ✅
   - **File**: `network-js/src/layouts/bipartite.js`
   - **Class**: `BipartiteLayout`
   - **Complexity**: O(n)
   - **Features**:
     - Positions nodes in two parallel lines (vertical or horizontal)
     - Partitions nodes into two sets on opposite sides
     - Useful for bipartite graphs and two-level hierarchies
     - Flexible partition specification
   - **Parameters**:
     - `partition`: Node IDs for first set (auto-detected if null)
     - `align`: 'vertical' or 'horizontal' (default: 'vertical')
     - `scale`: Scale factor (default: 1)
     - `aspectRatio`: Width to height ratio (default: 4/3)
     - `center`: Center point (default: {x: 0, y: 0})
   - **Worker Integration**: ✅ Full async/worker support
   - **NetworkX Reference**: `bipartite_layout()`

3. **Multipartite Layout** ✅
   - **File**: `network-js/src/layouts/multipartite.js`
   - **Class**: `MultipartiteLayout`
   - **Complexity**: O(n)
   - **Features**:
     - Positions nodes in k parallel layers
     - Partitions nodes into multiple sets for multi-level hierarchies
     - Extends bipartite to support arbitrary number of layers
     - Useful for DAGs and hierarchical structures
   - **Parameters**:
     - `subsets`: Map of subset_id → array of node IDs
     - `align`: 'vertical' or 'horizontal' (default: 'vertical')
     - `scale`: Scale factor (default: 1)
     - `center`: Center point (default: {x: 0, y: 0})
   - **Worker Integration**: ✅ Full async/worker support
   - **NetworkX Reference**: `multipartite_layout()`

4. **BFS Layout** ✅
   - **File**: `network-js/src/layouts/bfs.js`
   - **Class**: `BFSLayout`
   - **Complexity**: O(n + m) for BFS + O(n) for positioning
   - **Features**:
     - Positions nodes in layers based on BFS distance from start node
     - Nodes at same distance are in same layer
     - Excellent for tree-like structures and network exploration
     - Auto-handles unreachable nodes
   - **Parameters**:
     - `startNode`: Starting node for BFS (first node if null)
     - `align`: 'vertical' or 'horizontal' (default: 'vertical')
     - `scale`: Scale factor (default: 1)
     - `center`: Center point (default: {x: 0, y: 0})
   - **Worker Integration**: ✅ Full async/worker support
   - **NetworkX Reference**: `bfs_layout()`

### Existing Layouts (for reference)

- **RandomLayout**: O(n) - Random node positioning
- **CircularLayout**: O(n) - Circular arrangement
- **SpiralLayout**: O(n) - Spiral arrangement
- **ShellLayout**: O(n) - Concentric shells by degree
- **SpectralLayout**: O(n) - Laplacian eigenvector (requires pre-computed stat)
- **ForceDirectedLayout**: O(iterations × n²) - Fruchterman-Reingold algorithm

## Architecture Overview

### Worker-First Pattern

All new layouts follow the project's worker-first architecture:

```javascript
// 1. Class (thin OOP wrapper)
export class KamadaKawaiLayout extends Layout {
  constructor(graph, options = {}) {
    super(graph, options, {
      module: '../layouts/kamada-kawai.js',
      functionName: 'kamadaKawaiCompute'
    });
  }
}

// 2. Compute function (for workers)
export async function kamadaKawaiCompute(graphData, options, progressCallback) {
  // Pure algorithm implementation
  // Uses reportProgress(progressCallback, progress) for updates
}
```

### Usage Example

```javascript
import { Graph } from './graph.js';
import { KamadaKawaiLayout } from './layouts/kamada-kawai.js';

const graph = new Graph();
graph.addNodesFrom(['A', 'B', 'C', 'D']);
graph.addEdge('A', 'B');
graph.addEdge('B', 'C');
graph.addEdge('C', 'D');

const layout = new KamadaKawaiLayout(graph, {
  iterations: 100,
  scale: 200
});

// Asynchronous computation in worker
const positions = await layout.getPositions();
// positions = { 'A': {x: 120, y: 240}, 'B': {x: 310, y: 150}, ... }
```

## Implementation Details

### Kamada-Kawai Algorithm

1. **All-Pairs Shortest Paths**: Uses BFS from each node to compute distance matrix
2. **Energy Minimization**: Iteratively adjusts node positions to minimize spring energy
3. **Spring Model**:
   - Ideal distance: d_ij = K × shortest_path(i, j)
   - Spring stiffness: k_ij = K / d_ij²
4. **Convergence**: Stops when delta < threshold or iterations exhausted

### Bipartite Algorithm

1. **Partition Detection**: Uses provided partition or alternates nodes
2. **Two-Line Layout**: Places sets on opposite sides of a line
3. **Vertical/Horizontal**: Swappable axis for desired orientation
4. **Aspect Ratio**: Maintains configurable width-to-height ratio

### Multipartite Algorithm

1. **Multi-Set Support**: Accepts map of subset_id → node array
2. **Layer Stacking**: Arranges subsets as parallel vertical/horizontal lines
3. **Balanced Distribution**: Spreads nodes evenly within each layer
4. **Sorting**: Sorts layers by key if numeric IDs provided

### BFS Layout

1. **Breadth-First Search**: Traverses from start node level-by-level
2. **Distance Tracking**: Groups nodes by BFS distance
3. **Unreachable Handling**: Places disconnected nodes in extra layer
4. **Layer Distribution**: Evenly spaces nodes within each layer

## Integration with Codebase

### Exports Updated

Updated `/network-js/src/layouts/index.js`:
```javascript
export { KamadaKawaiLayout } from './kamada-kawai.js';
export { BipartiteLayout } from './bipartite.js';
export { MultipartiteLayout } from './multipartite.js';
export { BFSLayout } from './bfs.js';
```

### Documentation

All layouts include:
- Comprehensive JSDoc comments
- Usage examples in docstrings
- Parameter documentation
- Complexity analysis
- Use case guidance

## Testing

### Syntax Verification ✅
- ✅ `kamada-kawai.js` - OK
- ✅ `bipartite.js` - OK
- ✅ `multipartite.js` - OK
- ✅ `bfs.js` - OK

### Unit Tests (TODO - follow existing pattern in `layout.test.js`)

Suggested test coverage:
- Edge cases: empty graphs, single node, two nodes
- Basic functionality: node positioning, dimension handling
- Options: custom parameters, scale, center
- Algorithm correctness: known graph layouts
- Worker integration: async operation, progress reporting

## Roadmap Alignment

| Phase | Feature | Status |
|-------|---------|--------|
| 3.1 | Spring Embedder (refactor) | - (ForceDirectedLayout is FR-based) |
| 3.2 | Fruchterman-Reingold | ✅ (Implemented as ForceDirectedLayout) |
| 3.3 | Spectral Layout | ✅ (Existing) |
| 3.4 | Circular Layout | ✅ (Existing) |
| 3.5 | Kamada-Kawai Layout | ✅ **NEW** |
| Bonus | Bipartite Layout | ✅ **NEW** |
| Bonus | Multipartite Layout | ✅ **NEW** |
| Bonus | BFS Layout | ✅ **NEW** |

## Future Enhancements

### Potential Additional Layouts from NetworkX

- **Planar Layout**: `planar_layout()` - O(n) deterministic layout for planar graphs
- **ForceAtlas2**: Advanced force-directed with better performance
- **ARF Layout**: Attractive/repulsive forces with self-organization
- **Random Layout**: O(n) already exists, consider optimizations

### Performance Optimizations

1. **Spatial Indexing**: For Kamada-Kawai, use quadtree for neighbor queries
2. **Caching**: Pre-compute all-pairs shortest paths once
3. **Sparse Graphs**: Optimize for graphs with fewer edges
4. **GPU Acceleration**: Future WebGL compute shader support

### Algorithm Enhancements

1. **Incremental Updates**: Support live graph updates
2. **Customizable Forces**: Allow user-defined spring/repulsion models
3. **Community Preservation**: Integrate with community detection stats
4. **Hierarchical Refinement**: Multi-level approach for large graphs

## References

- **Kamada-Kawai**: Kamada, T., & Kawai, S. (1989). "An algorithm for drawing general undirected graphs"
- **NetworkX Documentation**: https://networkx.org/documentation/stable/reference/drawing.html#layout
- **D3.js Force**: https://github.com/d3/d3-force - Similar algorithm inspiration

## Files Modified/Created

```
network-js/src/layouts/
├── kamada-kawai.js       (NEW)
├── bipartite.js          (NEW)
├── multipartite.js       (NEW)
├── bfs.js                (NEW)
└── index.js              (MODIFIED - added exports)
```

## Next Steps

1. Add unit tests for each new layout
2. Add integration tests with real graphs (Karate Club, etc.)
3. Update demo files to showcase new layouts
4. Performance benchmarking against NetworkX implementations
5. Documentation updates for user guide
