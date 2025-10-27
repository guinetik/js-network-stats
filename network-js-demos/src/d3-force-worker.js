// D3 Force Simulation Worker
// Runs D3 force simulation off the main thread to prevent UI blocking

// Import D3 as ES module
import * as d3 from 'd3';

let simulation = null;
let nodes = [];
let links = [];

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      initSimulation(data);
      break;
    case 'stop':
      stopSimulation();
      break;
    case 'reheat':
      reheatSimulation(data);
      break;
    case 'updateNode':
      updateNodePosition(data);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
});

function initSimulation(data) {
  const { nodes: nodeData, links: linkData, width, height, options = {} } = data;

  // Store references
  nodes = nodeData.map(n => ({ ...n }));
  links = linkData.map(l => ({
    source: l.source,
    target: l.target,
    weight: l.weight || 1
  }));

  // Default options
  const {
    linkDistance = 100,
    chargeStrength = -500,
    centerStrength = 0.3,
    collisionRadius = 20,
    alphaDecay = 0.01,
    velocityDecay = 0.3,
    fluidMode = false
  } = options;

  // Adjust parameters for fluid mode (large networks)
  const actualLinkDistance = fluidMode ? linkDistance * 1.5 : linkDistance;
  const actualChargeStrength = fluidMode ? chargeStrength * 0.5 : chargeStrength;

  // Create simulation
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(actualLinkDistance)
      .strength(0.8))
    .force('charge', d3.forceManyBody()
      .strength(actualChargeStrength)
      .distanceMax(fluidMode ? 500 : 800))
    .force('collision', d3.forceCollide()
      .radius(d => collisionRadius + (d.centrality || 0) * 50)
      .strength(0.9))
    .alphaDecay(alphaDecay)
    .velocityDecay(velocityDecay);

  // Only add viewport-based centering forces for non-fluid mode
  if (!fluidMode) {
    sim
      .force('center', d3.forceCenter(width / 2, height / 2).strength(centerStrength))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));
  } else {
    // For fluid mode, use weak center at origin to prevent infinite drift
    sim.force('center', d3.forceCenter(0, 0).strength(0.05));
  }

  simulation = sim;

  // Send position updates every N ticks
  let tickCount = 0;
  const updateInterval = 2; // Send updates every 2 ticks to reduce message overhead

  simulation.on('tick', () => {
    tickCount++;

    // Apply boundary constraints only in non-fluid mode
    if (!fluidMode) {
      const padding = 50;
      nodes.forEach(node => {
        if (!node.fx) {
          node.x = Math.max(padding, Math.min(width - padding, node.x));
        }
        if (!node.fy) {
          node.y = Math.max(padding, Math.min(height - padding, node.y));
        }
      });
    }

    // Send updates at intervals
    if (tickCount % updateInterval === 0) {
      self.postMessage({
        type: 'tick',
        positions: nodes.map(n => ({
          id: n.id,
          x: n.x,
          y: n.y,
          vx: n.vx,
          vy: n.vy
        })),
        alpha: simulation.alpha()
      });
    }
  });

  simulation.on('end', () => {
    self.postMessage({
      type: 'end',
      positions: nodes.map(n => ({
        id: n.id,
        x: n.x,
        y: n.y
      }))
    });
  });

  // Send initial ready message
  self.postMessage({ type: 'ready' });
}

function stopSimulation() {
  if (simulation) {
    simulation.stop();
    self.postMessage({ type: 'stopped' });
  }
}

function reheatSimulation(data) {
  if (simulation) {
    const { alpha = 0.3 } = data || {};
    simulation.alpha(alpha).restart();
    self.postMessage({ type: 'reheated' });
  }
}

function updateNodePosition(data) {
  const { nodeId, x, y, fx, fy } = data;

  const node = nodes.find(n => n.id === nodeId);
  if (node) {
    if (x !== undefined) node.x = x;
    if (y !== undefined) node.y = y;
    if (fx !== undefined) node.fx = fx;
    if (fy !== undefined) node.fy = fy;

    if (simulation) {
      simulation.alpha(0.3).restart();
    }

    self.postMessage({ type: 'nodeUpdated', nodeId });
  }
}
