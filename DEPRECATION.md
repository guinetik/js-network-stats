# Deprecation Notice

## js-network-stats is in Maintenance Mode

This package is in maintenance mode as of version 2.0.0. While it will continue to receive critical bug fixes and security updates, **no new features will be added**.

## Why Maintenance Mode?

The `js-network-stats` package was designed as a simple, synchronous wrapper around jsnetworkx for serverless and batch processing use cases. While it excels at this purpose, modern applications increasingly need:

- **Async/await APIs** for better integration with modern Node.js
- **Worker thread parallelism** for processing large graphs without blocking
- **Progress callbacks** for long-running computations
- **Browser support** for client-side graph analysis
- **Advanced layouts** for visualization
- **Custom graph data structures** for better performance

## Upgrade Path: @guinetik/graph-js

For new projects or applications requiring advanced features, we recommend **[@guinetik/graph-js](https://github.com/guinetik/graph-js)**:

### Key Advantages

| Feature | js-network-stats | @guinetik/graph-js |
|---------|------------------|---------------------|
| **Architecture** | Synchronous, blocking | Async with Web Workers |
| **Performance** | Single-threaded | Multi-threaded parallelism |
| **API Style** | `const result = fn()` | `const result = await fn()` |
| **Progress Tracking** | ❌ | ✅ Real-time callbacks |
| **Graph Layouts** | ❌ | ✅ 11 algorithms |
| **Custom Graph Class** | Wraps jsnetworkx | Native implementation |
| **Browser Support** | Node.js only | Node.js + Browser |
| **Large Graphs** | Blocks main thread | Non-blocking workers |
| **Community** | Maintenance mode | Active development |

### Migration Example

**Before (js-network-stats):**
```javascript
import { getNetworkStats, FEATURES } from 'js-network-stats';

const network = [
  { source: 'A', target: 'B' },
  { source: 'B', target: 'C' }
];

// Synchronous - blocks until complete
const stats = getNetworkStats(network, [FEATURES.DEGREE, FEATURES.BETWEENNESS]);
console.log(stats);
```

**After (@guinetik/graph-js):**
```javascript
import NetworkStats from '@guinetik/graph-js';

const analyzer = new NetworkStats({ verbose: true });

const network = [
  { source: 'A', target: 'B' },
  { source: 'B', target: 'C' }
];

// Async with workers - non-blocking
const stats = await analyzer.analyze(network, ['degree', 'betweenness'], {
  onProgress: (progress) => {
    console.log(`Progress: ${Math.round(progress * 100)}%`);
  }
});

console.log(stats);
```

## When to Stay with js-network-stats

You should continue using `js-network-stats` if:

- ✅ You need a **simple, synchronous API** for serverless functions
- ✅ Your graphs are **small** (<1000 nodes)
- ✅ You're running **short-lived batch jobs** (AWS Lambda, Cloud Functions)
- ✅ You prefer **minimal dependencies** and bundle size
- ✅ Your existing code works and you don't need new features

## When to Migrate to @guinetik/graph-js

Consider migrating if:

- 🚀 You process **large graphs** (>1000 nodes)
- 🚀 You need **non-blocking computation** in long-running services
- 🚀 You want **progress feedback** for users
- 🚀 You need **graph visualization** with layouts
- 🚀 You're building **browser-based** graph tools
- 🚀 You want **active development** and new features

## Support Timeline

| Version | Status | Support Level | Timeline |
|---------|--------|---------------|----------|
| 2.x.x | **Maintenance** | Bug fixes + security updates | Indefinite |
| 1.x.x | Legacy | Critical security only | Until Dec 2025 |

## Installation

### Current Package (Maintenance Mode)
```bash
npm install js-network-stats@^2.0.0
```

### New Package (Active Development)
```bash
npm install @guinetik/graph-js
```

## Questions?

- **Bug reports**: [js-network-stats/issues](https://github.com/guinetik/js-network-stats/issues)
- **Feature requests**: Please open them in [@guinetik/graph-js](https://github.com/guinetik/graph-js/issues)
- **Migration help**: See the [graph-js documentation](https://github.com/guinetik/graph-js#readme)

## Thank You

Thank you for using js-network-stats! This package served its purpose well as a simple wrapper for graph statistics. The domain-focused approach of `@guinetik/graph-js` (graphs as the core domain, not just statistics) provides a better foundation for future growth.

We're excited about the future of graph analysis in JavaScript, and we hope you'll join us in the next chapter.

— **guinetik**
