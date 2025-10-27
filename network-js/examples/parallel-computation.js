/**
 * Network Analysis Example
 *
 * Demonstrates the new worker-first architecture for analyzing graphs.
 * All computation happens in web workers with dynamic imports.
 */

import NetworkStats from '../src/index.js';
import Graph from '../src/graph.js';

/**
 * Generate a random graph for testing
 */
function generateRandomGraph(numNodes, edgeProbability = 0.1) {
  const graph = new Graph();

  // Add nodes
  for (let i = 0; i < numNodes; i++) {
    graph.addNode(`node_${i}`);
  }

  // Add random edges
  const nodes = Array.from(graph.nodes);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.random() < edgeProbability) {
        graph.addEdge(nodes[i], nodes[j], 1);
      }
    }
  }

  return graph;
}

/**
 * Convert graph to edge list format
 */
function graphToEdgeList(graph) {
  return graph.edges.map(edge => ({
    source: edge.u,
    target: edge.v,
    weight: edge.weight
  }));
}

/**
 * Example 1: Basic network analysis
 */
async function example1_BasicAnalysis() {
  console.log('\n=== Example 1: Basic Network Analysis ===\n');

  // Create graph
  const graph = generateRandomGraph(100, 0.2);
  const edgeList = graphToEdgeList(graph);
  console.log(`Generated network: ${graph.nodes.size} nodes, ${edgeList.length} edges`);

  // Create analyzer
  const analyzer = new NetworkStats({ verbose: true });

  try {
    // Calculate degree centrality
    console.log('\nCalculating degree centrality...');
    const startTime = Date.now();

    const results = await analyzer.analyze(edgeList, ['degree'], {
      onProgress: (progress) => {
        process.stdout.write(`\rProgress: ${Math.round(progress * 100)}%`);
      }
    });

    const duration = Date.now() - startTime;
    console.log(`\n\nCompleted in ${duration}ms`);
    console.log(`Sample results:`, results.slice(0, 5));

  } finally {
    await analyzer.dispose();
    console.log('\nCleanup complete');
  }
}

/**
 * Example 2: Multiple metrics
 */
async function example2_MultipleMetrics() {
  console.log('\n=== Example 2: Multiple Metrics ===\n');

  const graph = generateRandomGraph(200, 0.1);
  const edgeList = graphToEdgeList(graph);
  console.log(`Generated network: ${graph.nodes.size} nodes, ${edgeList.length} edges`);

  const analyzer = new NetworkStats({ verbose: false });

  try {
    console.log('\nCalculating multiple metrics...');
    const startTime = Date.now();

    const results = await analyzer.analyze(edgeList, ['degree', 'clustering', 'eigenvector'], {
      onProgress: (progress) => {
        const percent = Math.round(progress * 100);
        const bar = '='.repeat(percent / 2) + ' '.repeat(50 - percent / 2);
        process.stdout.write(`\r[${bar}] ${percent}%`);
      }
    });

    const duration = Date.now() - startTime;
    console.log(`\n\nCompleted in ${duration}ms`);

    // Show sample results
    console.log('\nSample node results:');
    console.table(results.slice(0, 5));

  } finally {
    await analyzer.dispose();
  }
}

/**
 * Example 3: Graph-level statistics
 */
async function example3_GraphStats() {
  console.log('\n=== Example 3: Graph-Level Statistics ===\n');

  const graph = generateRandomGraph(150, 0.15);
  const edgeList = graphToEdgeList(graph);
  console.log(`Generated network: ${graph.nodes.size} nodes, ${edgeList.length} edges`);

  const analyzer = new NetworkStats({ verbose: false });

  try {
    console.log('\nCalculating node and graph-level statistics...');
    const startTime = Date.now();

    const results = await analyzer.analyze(edgeList, ['degree'], {
      includeGraphStats: true,
      graphStats: ['density', 'diameter', 'average_clustering', 'average_degree']
    });

    const duration = Date.now() - startTime;
    console.log(`\nCompleted in ${duration}ms`);

    console.log('\nGraph-level statistics:');
    console.log(results.graph);

    console.log('\nSample node results:');
    console.table(results.nodes.slice(0, 5));

  } finally {
    await analyzer.dispose();
  }
}

/**
 * Example 4: Betweenness centrality (expensive algorithm)
 */
async function example4_Betweenness() {
  console.log('\n=== Example 4: Betweenness Centrality ===\n');

  // Create medium-sized graph
  const graph = generateRandomGraph(300, 0.05);
  const edgeList = graphToEdgeList(graph);
  console.log(`Generated network: ${graph.nodes.size} nodes, ${edgeList.length} edges`);

  const analyzer = new NetworkStats({ verbose: false });

  try {
    console.log('\nCalculating betweenness centrality (this may take a while)...');
    const startTime = Date.now();

    const results = await analyzer.analyze(edgeList, ['betweenness'], {
      onProgress: (progress) => {
        const percent = Math.round(progress * 100);
        const bar = '='.repeat(percent / 2) + ' '.repeat(50 - percent / 2);
        process.stdout.write(`\r[${bar}] ${percent}%`);
      }
    });

    const duration = Date.now() - startTime;
    console.log(`\n\nCompleted in ${duration}ms`);

    // Find top 5 nodes by betweenness
    const sorted = results
      .filter(node => node.betweenness !== undefined)
      .sort((a, b) => b.betweenness - a.betweenness)
      .slice(0, 5);

    console.log('\nTop 5 nodes by betweenness:');
    sorted.forEach(node => {
      console.log(`  ${node.id}: ${node.betweenness.toFixed(4)}`);
    });

  } finally {
    await analyzer.dispose();
  }
}

/**
 * Example 5: Community detection
 */
async function example5_Communities() {
  console.log('\n=== Example 5: Community Detection ===\n');

  const graph = generateRandomGraph(200, 0.1);
  const edgeList = graphToEdgeList(graph);
  console.log(`Generated network: ${graph.nodes.size} nodes, ${edgeList.length} edges`);

  const analyzer = new NetworkStats({ verbose: false });

  try {
    console.log('\nDetecting communities using Louvain...');
    const startTime = Date.now();

    const results = await analyzer.analyze(edgeList, ['modularity'], {
      onProgress: (progress) => {
        process.stdout.write(`\rProgress: ${Math.round(progress * 100)}%`);
      }
    });

    const duration = Date.now() - startTime;
    console.log(`\n\nCompleted in ${duration}ms`);

    // Count communities
    const communities = new Set();
    results.forEach(node => {
      if (node.modularity !== undefined) {
        communities.add(node.modularity);
      }
    });

    console.log(`\nFound ${communities.size} communities`);
    console.log('\nSample node assignments:');
    console.table(results.slice(0, 10).map(n => ({
      id: n.id,
      community: n.modularity
    })));

  } finally {
    await analyzer.dispose();
  }
}

/**
 * Example 6: Using layouts
 */
async function example6_Layouts() {
  console.log('\n=== Example 6: Graph Layouts ===\n');

  const { ForceDirectedLayout, CircularLayout } = await import('../src/index.js');

  const graph = generateRandomGraph(50, 0.15);
  console.log(`Generated network: ${graph.nodes.size} nodes, ${graph.edges.length} edges`);

  try {
    // Force-directed layout
    console.log('\nComputing force-directed layout...');
    const forceLayout = new ForceDirectedLayout(graph, {
      iterations: 50,
      repulsion: 1000,
      attraction: 0.1
    });

    const forcePositions = await forceLayout.getPositions();
    console.log('Force-directed layout complete');
    console.log('Sample positions:', Object.entries(forcePositions).slice(0, 3));

    // Circular layout
    console.log('\nComputing circular layout...');
    const circularLayout = new CircularLayout(graph, {
      radius: 200
    });

    const circularPositions = await circularLayout.getPositions();
    console.log('Circular layout complete');
    console.log('Sample positions:', Object.entries(circularPositions).slice(0, 3));

  } catch (error) {
    console.error('Layout error:', error);
  }
}

/**
 * Run all examples
 */
async function runAll() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Network Analysis Examples                ║');
  console.log('║   Worker-First Architecture                ║');
  console.log('╚════════════════════════════════════════════╝');

  try {
    await example1_BasicAnalysis();
    await example2_MultipleMetrics();
    await example3_GraphStats();
    await example4_Betweenness();
    await example5_Communities();
    await example6_Layouts();

    console.log('\n✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAll();
}

export {
  example1_BasicAnalysis,
  example2_MultipleMetrics,
  example3_GraphStats,
  example4_Betweenness,
  example5_Communities,
  example6_Layouts,
  runAll
};
