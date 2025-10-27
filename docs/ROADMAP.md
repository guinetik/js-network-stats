# Network-JS Roadmap

## Philosophy
**Scale First, Features Second** - Build robust compute infrastructure to support large networks (10k+ nodes) before expanding feature set.

---

## Phase 0: Compute Infrastructure 🚀 **[PRIORITY]**

**Goal:** Enable analysis of large networks (10k-100k+ nodes) through parallel computation in both Node.js and browser environments.

### Architecture Design
- **Universal Worker Interface** - Abstract API that works across platforms
  - Browser: WebWorkers
  - Node.js: Worker Threads
  - Unified message protocol for worker communication

### Core Components

#### 1. Worker Pool Manager
```javascript
new WorkerPool({
  maxWorkers: navigator.hardwareConcurrency || 4,
  workerScript: './network-worker.js'
})
```

**Features:**
- Auto-scaling based on CPU cores
- Task queueing and distribution
- Worker lifecycle management (spawn, reuse, terminate)
- Memory monitoring and cleanup

#### 2. Worker Communication Protocol
```javascript
// Request
{
  id: 'unique-task-id',
  type: 'algorithm',
  algorithm: 'betweenness',
  graph: { nodes, edges },
  options: { ... },
  partition: { start: 0, end: 100 } // for parallel processing
}

// Response
{
  id: 'unique-task-id',
  status: 'complete' | 'error' | 'progress',
  result: { ... },
  progress: 0.45, // 0-1
  error: null
}
```

#### 3. Parallelizable Algorithms
Identify which algorithms can run in parallel:
- ✅ **Embarrassingly parallel:** Degree, local clustering, ego-density
- ✅ **Partition-friendly:** Betweenness (per source node)
- ✅ **Map-reduce compatible:** Community detection iterations
- ⚠️ **Requires coordination:** Eigenvector centrality (iterative)
- ⚠️ **Global state:** Layout algorithms (need special handling)

#### 4. Progress Callbacks
```javascript
analyzer.analyze(graph, ['betweenness'], {
  onProgress: (progress) => {
    console.log(`${Math.round(progress * 100)}% complete`);
  }
}).then(results => { ... });
```

#### 5. Fallback Strategy
- Detect worker support: `typeof Worker !== 'undefined'`
- Graceful degradation to single-threaded execution
- Configuration flag: `{ useWorkers: 'auto' | true | false }`

### Deliverables
- [ ] `src/compute/WorkerPool.js` - Pool manager
- [ ] `src/compute/network-worker.js` - Worker script template
- [ ] `src/compute/WorkerAdapter.js` - Browser/Node.js abstraction
- [ ] `src/compute/ParallelAlgorithms.js` - Partitioning strategies
- [ ] Update `NetworkStats` to use workers for heavy operations
- [ ] Benchmark suite comparing single vs multi-threaded
- [ ] Documentation: "Computing Large Networks" guide

### Success Criteria
- ✅ Process 10k node graph in <2s (betweenness)
- ✅ Process 100k node graph in <30s (degree, clustering)
- ✅ Works in Chrome, Firefox, Safari, Node.js 18+
- ✅ Memory usage scales linearly (no leaks)
- ✅ Graceful fallback when workers unavailable

---

## Phase 1: Community Detection & Directed Graphs

### 1.1 DirectedGraph Implementation
**Extends:** `Graph` base class

**New Methods:**
```javascript
class DirectedGraph extends Graph {
  addEdge(source, target, weight) // directed only
  getInNeighbors(node)  // incoming edges
  getOutNeighbors(node) // outgoing edges
  inDegree(node)
  outDegree(node)
  reverse() // transpose graph
  toUndirected() // symmetrize
}
```

**Files:**
- `src/models/DirectedGraph.js`
- `src/models/DirectedGraph.test.js`
- Update adapters to support `directed: true` flag

### 1.2 Louvain Method Revision
**Current Issues:**
- Review performance on large graphs (10k+ nodes)
- Add resolution parameter support (already done?)
- Validate against reference implementations

**Improvements:**
- Better modularity calculation caching
- Faster neighbor iteration
- Support weighted graphs properly

### 1.3 Girvan-Newman Algorithm
**Strategy:** `GirvanNewmanAlgorithm extends CommunityAlgorithm`

**Algorithm:**
1. Calculate edge betweenness for all edges
2. Remove edge with highest betweenness
3. Recalculate betweenness
4. Repeat until desired number of communities

**Implementation Notes:**
- Expensive: O(m²n) where m=edges, n=nodes
- Good for small networks (<1000 nodes)
- Produces hierarchical dendrogram
- Stop condition: target number of communities or modularity threshold

**Files:**
- `src/community/algorithms/girvan-newman.js`
- `src/community/algorithms/girvan-newman.test.js`

### 1.4 Leiden Algorithm
**Strategy:** `LeidenAlgorithm extends CommunityAlgorithm`

**Advantages over Louvain:**
- Guarantees well-connected communities
- Faster convergence
- Better quality partitions

**Algorithm:**
1. Local moving of nodes (like Louvain)
2. Refinement phase (NEW - merges poorly connected nodes)
3. Aggregation
4. Repeat until convergence

**References:**
- Traag, V.A., Waltman, L. & van Eck, N.J. (2019)
- "From Louvain to Leiden: guaranteeing well-connected communities"

**Files:**
- `src/community/algorithms/leiden.js`
- `src/community/algorithms/leiden.test.js`

### 1.5 Label Propagation (Bonus)
**Strategy:** `LabelPropagationAlgorithm extends CommunityAlgorithm`

**Algorithm:**
- Fast: O(m + n)
- Non-deterministic (random order matters)
- Each node adopts most frequent label among neighbors
- Iterates until convergence

**Use Case:** Very large networks where speed > quality

**Files:**
- `src/community/algorithms/label-propagation.js`

---

## Phase 2: Directed Graph Features & Advanced Metrics

### 2.1 Luke's Partitioning
**Requires:** DirectedGraph from Phase 1.1

**Algorithm Details:**
- (Need more info - is this Luxburg's spectral clustering?)
- Specifically for directed networks
- Uses eigenvectors of Laplacian matrix

**Files:**
- `src/community/algorithms/lukes-partitioning.js`

### 2.2 Graph-Level Metrics

#### Density
```javascript
Network.density(graph)
// Formula: 2m / (n(n-1)) for undirected
// Formula: m / (n(n-1)) for directed
```

#### Average Clustering Coefficient
```javascript
Network.averageClustering(graph)
// Mean of all node clustering coefficients
```

#### Diameter
```javascript
Network.diameter(graph)
// Longest shortest path in graph
// Requires: BFS/Dijkstra all-pairs
```

#### Average Shortest Path
```javascript
Network.averageShortestPath(graph)
// Mean of all shortest paths
// Uses: Floyd-Warshall or repeated BFS
```

#### Modularity (already exists?)
```javascript
Network.modularity(graph, communities)
// Verify current implementation
```

#### Connected Components
```javascript
Network.connectedComponents(graph)
// Returns: number of disconnected subgraphs
// Uses: BFS/DFS traversal
```

**Files:**
- Update `src/network.js` with new static methods
- `src/network.test.js` - add comprehensive tests

### 2.3 Node-Level Metrics

#### Closeness Centrality
```javascript
Network.closenessCentrality(graph)
// Formula: (n-1) / sum(shortest_path_lengths)
// Requires: BFS from each node
```

#### Local Density / Ego-Network Density
```javascript
Network.egoDensity(graph, node, radius = 1)
// Extract ego network (node + neighbors within radius)
// Calculate density of that subgraph
```

**Implementation Strategy:**
1. Add to `src/network.js` as static methods
2. Integrate into `NetworkStats.analyze()` feature list
3. Add worker support for expensive computations (diameter, closeness)

---

## Phase 3: Advanced Layout Algorithms

### 3.1 Spring Embedder (Refactor Force-Directed)
**Current:** `ForceDirectedLayout`
**New:** `SpringEmbedderLayout`

**Changes:**
- Rename for clarity (force-directed is generic term)
- Keep current Fruchterman-Reingold-inspired approach
- Clean up API
- Better documentation

### 3.2 Dedicated Fruchterman-Reingold
**Strategy:** `FruchtermanReingoldLayout extends Layout`

**Algorithm:**
- Attractive force: f_a(d) = d² / k
- Repulsive force: f_r(d) = -k² / d
- k = C * sqrt(area / n) where C is constant
- Cooling schedule: temperature decay

**Optimizations:**
- Grid-based spatial indexing for O(n log n)
- Barnes-Hut approximation for large graphs

**Files:**
- `src/layouts/fruchterman-reingold.js`
- `src/layouts/fruchterman-reingold.test.js`

### 3.3 Spectral Layout
**Strategy:** `SpectralLayout extends Layout`

**Algorithm:**
1. Compute graph Laplacian: L = D - A
2. Find smallest non-zero eigenvectors
3. Use eigenvector values as coordinates
   - 2nd eigenvector → x coordinates
   - 3rd eigenvector → y coordinates

**Advantages:**
- Fast: O(n²) or O(n log n) with sparse solvers
- Deterministic (no randomness)
- Good for symmetric graphs

**Requirements:**
- Eigenvalue decomposition (use numeric library or implement power iteration)
- Connected graph (handle components separately)

**Libraries to consider:**
- `ml-matrix` (JavaScript matrix operations)
- Or implement custom sparse solver

**Files:**
- `src/layouts/spectral.js`
- `src/layouts/spectral.test.js`

### 3.4 Circular Layout Simplification
**Current Issues:**
- Review current implementation complexity
- Simplify API if overly complex

**Goals:**
- Basic: Arrange nodes in circle by order
- Advanced: Group by community/attribute
- Clean, easy-to-understand code

### 3.5 Kamada-Kawai Layout
**Strategy:** `KamadaKawaiLayout extends Layout`

**Algorithm:**
- Energy minimization based on shortest paths
- Ideal distance: d_ij = l * shortest_path(i, j)
- Spring stiffness: k_ij = K / d_ij²
- Minimize energy using gradient descent

**Advantages:**
- Better than force-directed for small/medium graphs
- Respects graph distances more accurately
- Good for trees and planar graphs

**Disadvantages:**
- Expensive: O(n³) for all-pairs shortest paths
- Slow convergence for large graphs

**Implementation:**
1. Compute all-pairs shortest paths (Floyd-Warshall or BFS)
2. Initialize positions (random or circular)
3. Iteratively move nodes to minimize energy
4. Stop when energy change < threshold

**Files:**
- `src/layouts/kamada-kawai.js`
- `src/layouts/kamada-kawai.test.js`

---

## Implementation Timeline

### Sprint 0 (Weeks 1-3): Compute Infrastructure 🔥
- Week 1: Design architecture, worker protocol, adapter pattern
- Week 2: Implement WorkerPool, browser + Node.js support
- Week 3: Integrate with NetworkStats, benchmarking, docs

### Sprint 1 (Weeks 4-7): Community Detection
- Week 4: DirectedGraph class
- Week 5: Revise Louvain + Girvan-Newman
- Week 6: Leiden algorithm
- Week 7: Label Propagation + testing

### Sprint 2 (Weeks 8-10): Advanced Metrics
- Week 8: Graph metrics (density, diameter, components)
- Week 9: Node metrics (closeness, ego-density)
- Week 10: Luke's Partitioning (if applicable)

### Sprint 3 (Weeks 11-14): Layout Algorithms
- Week 11: Spring embedder refactor + Fruchterman-Reingold
- Week 12: Spectral layout
- Week 13: Kamada-Kawai layout
- Week 14: Circular simplification, polish, docs

---

## Testing Strategy

### Unit Tests
- Every algorithm gets comprehensive test suite
- Use known networks with expected outputs (Karate Club, etc.)
- Edge cases: empty graph, disconnected, single node

### Integration Tests
- End-to-end workflows with NetworkStats
- Worker-based computation vs single-threaded (results match)
- DirectedGraph vs Graph behavior

### Performance Benchmarks
```javascript
// benchmark/run-benchmarks.js
benchmarkSuite({
  algorithms: ['louvain', 'leiden', 'girvan-newman'],
  graphs: [
    { name: 'small', nodes: 100, edges: 500 },
    { name: 'medium', nodes: 1000, edges: 5000 },
    { name: 'large', nodes: 10000, edges: 50000 },
    { name: 'huge', nodes: 100000, edges: 500000 }
  ],
  metrics: ['time', 'memory', 'quality']
})
```

### Visual Regression Tests
- For layouts: snapshot position outputs
- Ensure deterministic algorithms produce same results
- Compare against reference implementations

---

## Documentation Updates

### API Documentation
- JSDoc for all new classes and methods
- Update README with new features
- Migration guides for breaking changes

### Guides
1. "Computing Large Networks" - Worker architecture guide
2. "Community Detection Algorithms" - Comparison & use cases
3. "Choosing a Layout Algorithm" - Decision tree
4. "Directed vs Undirected Graphs" - When to use each

### Examples
- `examples/large-network-analysis.html` - Worker demo
- `examples/community-comparison.html` - Compare algorithms
- `examples/directed-graph.html` - DirectedGraph usage
- `examples/layout-comparison.html` - Side-by-side layouts

---

## Success Metrics

### Performance Targets
- 10k nodes: All metrics in <5s
- 100k nodes: Degree-based metrics in <10s
- 1M nodes: Degree, clustering in <60s

### Quality Metrics
- Test coverage: >85%
- Documentation coverage: 100% of public APIs
- TypeScript types: Full JSDoc coverage

### Community
- npm downloads: Track growth
- GitHub stars: Community engagement
- Issues/PRs: Active maintenance
- Blog posts: 1-2 per major feature

---

## Risk Mitigation

### Technical Risks
1. **Worker overhead** - May be slower for small graphs
   - Mitigation: Threshold-based worker usage (>1000 nodes)

2. **Memory in workers** - Transferring large graphs expensive
   - Mitigation: Use Transferable objects, SharedArrayBuffer where possible

3. **Browser compatibility** - Safari WebWorker quirks
   - Mitigation: Comprehensive browser testing, polyfills

4. **Algorithm complexity** - Some algorithms are inherently slow
   - Mitigation: Document time complexity, add warnings, suggest alternatives

### Organizational Risks
1. **Scope creep** - Too many features at once
   - Mitigation: Stick to roadmap, prioritize Phase 0

2. **Testing burden** - Maintaining large test suite
   - Mitigation: Automate benchmarks, use CI/CD

---

## Future Phases (Beyond Roadmap)

### Phase 4: Advanced Features
- Graph generators (Erdős-Rényi, Barabási-Albert, etc.)
- Temporal networks (dynamic graphs over time)
- Multilayer/multiplex networks
- Hypergraphs

### Phase 5: Ecosystem
- React/Vue/Svelte components
- CLI tool for graph analysis
- VS Code extension
- Jupyter kernel integration

### Phase 6: Scale
- GPU acceleration (WebGL compute shaders)
- Distributed computing (multiple machines)
- Streaming algorithms for massive graphs
- Database integration (Neo4j, ArangoDB)

---

## Questions to Resolve

1. **Luke's Partitioning** - Need reference/paper for this algorithm
2. **Worker thread-count** - Auto-detect or user-configurable?
3. **Breaking changes** - Is DirectedGraph a breaking change or additive?
4. **Numeric libraries** - For spectral layout, use external lib or implement custom?
5. **Version numbering** - Phase 0 = 1.1.0? Phase 1 = 1.2.0? Or 2.0.0 for DirectedGraph?

---

**Last Updated:** 2025-10-26
**Status:** Phase 0 in planning
