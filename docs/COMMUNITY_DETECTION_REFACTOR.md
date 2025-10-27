# Community Detection Refactor - Strategy Pattern Implementation

## Overview

Refactored community detection to use the **Strategy Pattern**, allowing users to pass in custom algorithm implementations instead of being locked into string-based algorithm selection.

## Architecture

### Before (String-based)
```javascript
// Limited to predefined algorithms
const detector = new CommunityDetection(graph);
const result = detector.detectCommunities('louvain');
```

### After (Strategy Pattern)
```javascript
// Can pass custom algorithm instances
const louvain = new LouvainAlgorithm({ resolution: 1.5 });
const detector = new CommunityDetection(graph);
const result = detector.detectCommunities(louvain);

// Backward compatible - string names still work
const result2 = detector.detectCommunities('louvain');
```

## New Structure

```
src/community/
├── index.js                    # CommunityDetection class (orchestrator)
└── algorithms/
    ├── index.js                # Algorithm exports
    ├── base.js                 # CommunityAlgorithm (abstract base class)
    └── louvain.js              # LouvainAlgorithm implementation
```

## Key Components

### 1. `CommunityAlgorithm` (Abstract Base Class)

```javascript
export class CommunityAlgorithm {
  constructor(name, description) {
    if (new.target === CommunityAlgorithm) {
      throw new Error('CommunityAlgorithm is abstract');
    }
    this.name = name;
    this.description = description;
  }

  detect(graph) {
    throw new Error('detect() must be implemented by subclass');
  }

  getInfo() {
    return { name: this.name, description: this.description };
  }
}
```

### 2. `LouvainAlgorithm` (Concrete Implementation)

```javascript
export class LouvainAlgorithm extends CommunityAlgorithm {
  constructor(options = {}) {
    super('louvain', 'Louvain method for community detection');
    this.options = { resolution: 1.0, ...options };
  }

  detect(graph) {
    // Implementation using Louvain class
    // Returns CommunityResult
  }
}
```

### 3. `CommunityDetection` (Strategy Orchestrator)

```javascript
export class CommunityDetection {
  detectCommunities(algorithm = 'louvain', options = {}) {
    let algorithmInstance;

    // Strategy Pattern: Accept algorithm instance or string
    if (algorithm instanceof CommunityAlgorithm) {
      algorithmInstance = algorithm;
    } else if (typeof algorithm === 'string') {
      algorithmInstance = this._createAlgorithmFromName(algorithm, options);
    }

    return algorithmInstance.detect(this.graph);
  }
}
```

## Usage Examples

### Basic Usage (Backward Compatible)
```javascript
import { CommunityDetection } from '@guinetik/network-js';

const detector = new CommunityDetection(graph);
const result = detector.detectCommunities('louvain');
```

### Advanced Usage (Algorithm Instance)
```javascript
import { CommunityDetection, LouvainAlgorithm } from '@guinetik/network-js';

const louvain = new LouvainAlgorithm({ resolution: 1.5 });
const detector = new CommunityDetection(graph);
const result = detector.detectCommunities(louvain);

console.log(result.algorithm);      // 'louvain'
console.log(result.communities);    // { 'A': 0, 'B': 0, 'C': 1 }
console.log(result.modularity);     // 0.42
console.log(result.numCommunities); // 2
```

### Creating Custom Algorithms
```javascript
import { CommunityAlgorithm } from '@guinetik/network-js';

class LabelPropagationAlgorithm extends CommunityAlgorithm {
  constructor(options = {}) {
    super('label-propagation', 'Label Propagation Algorithm');
    this.maxIterations = options.maxIterations || 100;
  }

  detect(graph) {
    // Your implementation here
    const communities = this._propagateLabels(graph);

    return {
      communities,
      modularity: this._calculateModularity(graph, communities),
      numCommunities: new Set(Object.values(communities)).size,
      algorithm: this.name
    };
  }

  _propagateLabels(graph) {
    // Label propagation logic
  }
}

// Use it
const labelProp = new LabelPropagationAlgorithm({ maxIterations: 50 });
const result = detector.detectCommunities(labelProp);
```

## Benefits

### 1. **Extensibility**
- Easy to add new algorithms without modifying `CommunityDetection`
- Users can create custom algorithms by extending `CommunityAlgorithm`

### 2. **Type Safety** (via JSDoc)
- Algorithm interface is clearly defined
- IDE autocomplete and type checking

### 3. **Backward Compatibility**
- String-based API still works
- No breaking changes for existing code

### 4. **Testability**
- Algorithms can be tested independently
- Mock algorithms can be injected for testing

### 5. **Encapsulation**
- Algorithm-specific logic is contained in algorithm classes
- `CommunityDetection` focuses on orchestration

## Exports

```javascript
// From @guinetik/network-js
export {
  CommunityDetection,
  CommunityAlgorithm,
  LouvainAlgorithm
};
```

## Future Algorithms

The new architecture makes it trivial to add new algorithms:

### Potential Additions
- **Label Propagation**
- **Girvan-Newman** (edge betweenness)
- **Walktrap** (random walks)
- **Infomap** (information theory)
- **Leiden** (improvement on Louvain)

### Implementation Template
```javascript
import { CommunityAlgorithm } from './base.js';

export class MyAlgorithm extends CommunityAlgorithm {
  constructor(options = {}) {
    super('my-algorithm', 'Description');
    this.options = options;
  }

  detect(graph) {
    // Implementation
    return {
      communities: { /* ... */ },
      modularity: 0.42,
      numCommunities: 3,
      algorithm: this.name
    };
  }
}
```

## Test Coverage

- ✅ `CommunityAlgorithm` abstract class enforcement
- ✅ `LouvainAlgorithm` community detection
- ✅ Strategy pattern with algorithm instances
- ✅ Backward compatibility with string names
- ✅ Error handling for invalid algorithms
- ✅ Modularity calculation

**Test Results**: 69 passed | 2 skipped (71 total)
**Coverage**: 80.95% overall

## Migration Guide

### No changes needed for existing code:
```javascript
// This still works exactly the same
const result = detector.detectCommunities('louvain');
```

### Opt-in to new pattern when you need it:
```javascript
// Use when you need custom options or custom algorithms
const louvain = new LouvainAlgorithm({ resolution: 2.0 });
const result = detector.detectCommunities(louvain);
```

## Design Patterns Used

1. **Strategy Pattern** - Interchangeable algorithm implementations
2. **Template Method** - Abstract base class defines interface
3. **Factory Pattern** - String-to-algorithm conversion for backward compatibility
4. **Dependency Injection** - Algorithm instance injected into detector

---

**Date**: 2025-10-26
**Impact**: Non-breaking enhancement
**Tests**: All passing ✅
