/**
 * Sample graph data for demo pages
 */

export const sampleGraphSmall = {
  nodes: [
    { id: 'A' },
    { id: 'B' },
    { id: 'C' },
    { id: 'D' },
    { id: 'E' },
    { id: 'F' },
    { id: 'G' },
    { id: 'H' }
  ],
  links: [
    { source: 'A', target: 'B', weight: 1 },
    { source: 'A', target: 'C', weight: 1 },
    { source: 'B', target: 'D', weight: 1 },
    { source: 'C', target: 'D', weight: 1 },
    { source: 'D', target: 'E', weight: 1 },
    { source: 'E', target: 'F', weight: 1 },
    { source: 'E', target: 'G', weight: 1 },
    { source: 'F', target: 'H', weight: 1 },
    { source: 'G', target: 'H', weight: 1 },
    { source: 'A', target: 'E', weight: 1 }
  ]
};

export const sampleGraphMedium = {
  nodes: Array.from({ length: 30 }, (_, i) => ({ id: `node_${i}` })),
  links: []
};

// Generate random connections for medium graph
for (let i = 0; i < 30; i++) {
  const numConnections = Math.floor(Math.random() * 4) + 2;
  for (let j = 0; j < numConnections; j++) {
    const target = Math.floor(Math.random() * 30);
    if (target !== i) {
      sampleGraphMedium.links.push({
        source: `node_${i}`,
        target: `node_${target}`,
        weight: Math.random() * 2 + 0.5
      });
    }
  }
}
