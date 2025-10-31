/**
 * NetworkGraphD3 - Standalone D3 Network Visualization Component
 *
 * A framework-agnostic network visualization component using D3.js.
 * This component can be used with Vue, React, Angular, or vanilla JavaScript.
 *
 * Features:
 * - Force-directed graph layout
 * - Interactive nodes (drag, hover, zoom)
 * - Automatic node sizing based on centrality
 * - Dark mode support
 * - Responsive design
 *
 * Lifecycle:
 * 1. new NetworkGraphD3(container, options) - Initialize
 * 2. setData(nodes, links) - Load data
 * 3. destroy() - Cleanup
 *
 * @example
 * const graph = new NetworkGraphD3('#graph-container', {
 *   width: 800,
 *   height: 600
 * });
 *
 * graph.setData(
 *   [{ id: 'A', group: 1 }, { id: 'B', group: 1 }],
 *   [{ source: 'A', target: 'B' }]
 * );
 *
 * // Later, cleanup
 * graph.destroy();
 */

import * as d3 from 'd3';
import { createLogger } from '@guinetik/logger';

/**
 * Default configuration constants
 * @type {Object}
 */
const DEFAULTS = {
  WIDTH: 800,
  HEIGHT: 600,
  NODE_RADIUS: 8,
  LINK_DISTANCE: 100,
  CHARGE_STRENGTH: -300,
  MIN_RADIUS: 4,
  MAX_RADIUS: 20,
  COLLISION_PADDING: 2,
  COLLISION_STRENGTH: 0.7,
  LINK_STRENGTH: 0.5,
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 4,
  RESIZE_DEBOUNCE_MS: 150,
  TOOLTIP_PADDING: 12,
  TOOLTIP_DURATION: 150,
  TOOLTIP_MAX_WIDTH: 280,
  DRAG_ALPHA_TARGET: 0.3,
  SIMULATION_ALPHA: 1,
  SIMULATION_RESTART_ALPHA: 0.3,
  LABEL_VISIBILITY_THRESHOLD: 0.5 // Hide labels when zoom < 0.5
};

/**
 * Helper function to normalize link source/target to ID
 * @param {string|Object} source - Source node ID or object
 * @returns {string} Normalized source ID
 */
function normalizeLinkId(source) {
  return typeof source === 'string' ? source : (source?.id || String(source));
}

/**
 * Generate a unique key for a link
 * @param {Object} link - Link object with source and target
 * @returns {string} Unique link key
 */
function getLinkKey(link) {
  const sourceId = normalizeLinkId(link.source);
  const targetId = normalizeLinkId(link.target);
  // Always use consistent ordering for undirected links
  return sourceId < targetId ? `${sourceId}-${targetId}` : `${targetId}-${sourceId}`;
}

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * NetworkGraphD3 - Standalone D3 Network Visualization Component
 *
 * A framework-agnostic network visualization component using D3.js.
 * This component can be used with Vue, React, Angular, or vanilla JavaScript.
 *
 * @class
 * @param {HTMLElement|string} container - Container element or CSS selector
 * @param {Object} [options={}] - Configuration options
 * @param {number} [options.width=800] - Graph width in pixels
 * @param {number} [options.height=600] - Graph height in pixels
 * @param {number} [options.nodeRadius=8] - Default node radius
 * @param {number} [options.linkDistance=100] - Default link distance
 * @param {number} [options.chargeStrength=-300] - Charge force strength
 * @param {string|null} [options.sizeBy=null] - Property to size nodes by
 * @param {number} [options.minRadius=4] - Minimum node radius
 * @param {number} [options.maxRadius=20] - Maximum node radius
 * @param {string} [options.colorBy='group'] - Property to color nodes by
 * @param {string} [options.colorScheme='categorical'] - Color scheme ('categorical' or 'sequential')
 * @param {boolean} [options.showLabels=true] - Whether to show node labels
 * @param {Function} [options.tooltipBuilder] - Custom tooltip content builder function
 *
 * @example
 * const graph = new NetworkGraphD3('#graph-container', {
 *   width: 800,
 *   height: 600
 * });
 *
 * graph.setData(
 *   [{ id: 'A', group: 1 }, { id: 'B', group: 1 }],
 *   [{ source: 'A', target: 'B' }]
 * );
 *
 * // Later, cleanup
 * graph.destroy();
 */
export class NetworkGraphD3 {
  /**
   * @param {HTMLElement|string} container - Container element or CSS selector
   * @param {Object} [options={}] - Configuration options
   */
  constructor(container, options = {}) {
    // Container can be a selector string or DOM element
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      throw new Error('NetworkGraphD3: Container not found');
    }

    // Logger
    this.log = createLogger({
      prefix: 'NetworkGraphD3',
      level: import.meta.env.DEV ? 'debug' : 'info'
    });

    // Configuration
    this.options = {
      width: options.width || DEFAULTS.WIDTH,
      height: options.height || DEFAULTS.HEIGHT,
      nodeRadius: options.nodeRadius || DEFAULTS.NODE_RADIUS,
      linkDistance: options.linkDistance || DEFAULTS.LINK_DISTANCE,
      chargeStrength: options.chargeStrength || DEFAULTS.CHARGE_STRENGTH,
      // Visual encoding options
      sizeBy: options.sizeBy || null,
      minRadius: options.minRadius || DEFAULTS.MIN_RADIUS,
      maxRadius: options.maxRadius || DEFAULTS.MAX_RADIUS,
      colorBy: options.colorBy || 'group',
      colorScheme: options.colorScheme || 'categorical',
      showLabels: options.showLabels !== false, // Default to true
      tooltipBuilder: options.tooltipBuilder || null,
      ...options
    };

    // Validate options
    if (this.options.minRadius >= this.options.maxRadius) {
      this.log.warn('minRadius should be less than maxRadius, adjusting...');
      this.options.minRadius = Math.min(this.options.minRadius, this.options.maxRadius - 1);
    }

    // State
    this.data = { nodes: [], links: [] };
    this.svg = null;
    this.simulation = null;
    this.isDestroyed = false;
    this.isReady = false;
    this.isRendering = false; // Track if we're currently rendering

    // Scales (will be computed based on data)
    this.sizeScale = null;
    this.colorScale = null;

    // Event handlers
    this.resizeHandler = null;
    this.darkModeQuery = null;
    this.darkModeHandler = null;

    // Tooltip state
    this.tooltip = null;
    this.currentTooltipNode = null;

    // Performance: cache for link keys
    this.linkKeyCache = new Map();

    // Simulation stabilization tracking (no setTimeout!)
    this.stabilizationCheckFrame = null;
    this.lastAlpha = 1;
    this.stableTickCount = 0;
    this.requiredStableTicks = 10; // Number of consecutive low-alpha ticks to consider stable
    this.stabilizationThreshold = 0.01; // Alpha threshold for stability

    // Initialize SVG and simulation
    this.init();
  }

  /**
   * Initialize SVG container and D3 force simulation
   */
  init() {
    this.log.debug('Initializing graph', { 
      width: this.options.width, 
      height: this.options.height 
    });
    
    // Create SVG with accessibility attributes
    // Initially hidden until graph is ready
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.options.width)
      .attr('height', this.options.height)
      .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', 'Network graph visualization')
      .style('background', 'transparent')
      .style('opacity', 0)
      .style('visibility', 'hidden')
      .attr('class', 'network-graph-svg');

    // Create main group for zoom/pan
    this.g = this.svg.append('g').attr('class', 'main-group');

    // Create groups for links, nodes, and labels (order matters for z-index)
    this.linkGroup = this.g.append('g')
      .attr('class', 'links')
      .attr('aria-label', 'Graph links');
    this.nodeGroup = this.g.append('g')
      .attr('class', 'nodes')
      .attr('aria-label', 'Graph nodes');
    
    if (this.options.showLabels) {
      this.labelGroup = this.g.append('g')
        .attr('class', 'labels')
        .attr('aria-label', 'Node labels');
    }

    // Create tooltip container
    this.createTooltip();

    // Setup zoom behavior
    this.zoomBehavior = d3.zoom()
      .scaleExtent([DEFAULTS.ZOOM_MIN, DEFAULTS.ZOOM_MAX])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
        this.currentZoom = event.transform.k;
        this.updateLabelVisibility();
      });

    this.svg.call(this.zoomBehavior);
    this.currentZoom = 1;

    // Initialize force simulation with dynamic collision radius
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink()
        .id(d => d.id)
        .distance(this.options.linkDistance)
        .strength(DEFAULTS.LINK_STRENGTH))
      .force('charge', d3.forceManyBody()
        .strength(this.options.chargeStrength))
      .force('center', d3.forceCenter(
        this.options.width / 2,
        this.options.height / 2
      ))
      .force('collision', d3.forceCollide()
        .radius(d => this.getNodeRadius(d) + DEFAULTS.COLLISION_PADDING)
        .strength(DEFAULTS.COLLISION_STRENGTH))
      .on('tick', () => this.onTick())
      .on('end', () => this.onSimulationEnd());

    // Setup debounced resize handler
    this.resizeHandler = debounce(() => this.handleResize(), DEFAULTS.RESIZE_DEBOUNCE_MS);
    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * Set or update graph data
   * @param {Array<Object>} nodes - Array of node objects with { id, group? }
   * @param {Array<Object>} links - Array of link objects with { source, target }
   * @throws {Error} If nodes or links are invalid
   *
   * IMPORTANT: Does NOT clone nodes - works directly with provided objects
   * This preserves references to library data structures
   */
  setData(nodes, links) {
    if (this.isDestroyed) {
      this.log.warn('Cannot set data on destroyed instance');
      return;
    }

    // Validate input
    if (!Array.isArray(nodes)) {
      throw new Error('NetworkGraphD3: nodes must be an array');
    }
    if (!Array.isArray(links)) {
      throw new Error('NetworkGraphD3: links must be an array');
    }

    // Validate nodes have required id property
    const invalidNodes = nodes.filter(n => !n || !n.id);
    if (invalidNodes.length > 0) {
      this.log.warn(`Found ${invalidNodes.length} nodes without id property`);
    }

    this.log.debug('Setting graph data', { 
      nodeCount: nodes.length, 
      linkCount: links.length 
    });

    // Store references to original data (no cloning!)
    this.data.nodes = nodes;
    
    // Normalize links: ensure source/target are strings (IDs) not objects
    // D3's forceLink will resolve these IDs to node objects automatically
    this.data.links = links.map(link => ({
      ...link,
      source: normalizeLinkId(link.source),
      target: normalizeLinkId(link.target)
    }));

    // Clear link key cache
    this.linkKeyCache.clear();

    // Compute scales based on data
    this.computeScales();

    // Update visualization
    this.updateGraph();
  }

  /**
   * Compute size and color scales based on current data
   */
  computeScales() {
    if (!this.data.nodes || this.data.nodes.length === 0) return;

    // Compute size scale
    if (this.options.sizeBy) {
      const values = this.data.nodes
        .map(n => n[this.options.sizeBy])
        .filter(v => v !== undefined && v !== null);

      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Square root scale for more balanced size differences
        // This prevents leaf nodes from being too tiny compared to central nodes
        this.sizeScale = d3.scaleSqrt()
          .domain([min, max])
          .range([this.options.minRadius, this.options.maxRadius])
          .clamp(true);
      }
    }

    // Compute color scale
    const colorProperty = this.options.colorBy;
    const values = this.data.nodes
      .map(n => n[colorProperty])
      .filter(v => v !== undefined && v !== null);

    if (values.length > 0) {
      // Check if values are numeric or categorical
      const isNumeric = values.every(v => typeof v === 'number');

      if (this.options.colorScheme === 'sequential' || isNumeric) {
        // Sequential scale for continuous values
        const min = Math.min(...values);
        const max = Math.max(...values);
        this.colorScale = d3.scaleSequential(d3.interpolateViridis)
          .domain([min, max]);
      } else {
        // Categorical scale for discrete values
        const uniqueValues = [...new Set(values)];
        this.colorScale = d3.scaleOrdinal()
          .domain(uniqueValues)
          .range(d3.schemeCategory10);
      }
    }
  }

  /**
   * Update visual encoding (size/color properties)
   * Call this after changing visualization options
   * @param {Object} options - Visual encoding options
   * @param {boolean} options.preserveZoom - If true, preserves current zoom level (default: true)
   */
  updateVisualEncoding(options = {}) {
    if (options.sizeBy !== undefined) this.options.sizeBy = options.sizeBy;
    if (options.minRadius !== undefined) this.options.minRadius = options.minRadius;
    if (options.maxRadius !== undefined) this.options.maxRadius = options.maxRadius;
    if (options.colorBy !== undefined) this.options.colorBy = options.colorBy;
    if (options.colorScheme !== undefined) this.options.colorScheme = options.colorScheme;

    // Preserve current zoom and transform
    const preserveZoom = options.preserveZoom !== false;
    let savedTransform = null;
    if (preserveZoom && this.g) {
      const transform = d3.zoomTransform(this.svg.node());
      savedTransform = transform;
    }

    // Recompute scales
    this.computeScales();

    // Update existing nodes/links without resetting ready state
    if (this.node) {
      this.node
        .attr('r', d => this.getNodeRadius(d))
        .attr('fill', d => this.getNodeColor(d));
    }

    // Update collision detection with dynamic radius
    if (this.simulation) {
      this.simulation.force('collision')
        .radius(d => this.getNodeRadius(d) + DEFAULTS.COLLISION_PADDING);
    }

    // Restore zoom if preserved
    if (preserveZoom && savedTransform && this.zoomBehavior && this.svg) {
      this.svg.call(this.zoomBehavior.transform, savedTransform);
      this.g.attr('transform', savedTransform);
      this.currentZoom = savedTransform.k;
    }
  }

  /**
   * Update node statistics (e.g., eigenvector centrality) and refresh visualization
   * This method updates node properties in-place and refreshes node sizes/colors
   * 
   * @param {Array} enrichedNodes - Array of node objects with updated statistics
   * @param {string} [sizeBy='eigenvector'] - Property to size nodes by (default: 'eigenvector')
   * @param {boolean} [preserveZoom=true] - Whether to preserve current zoom level
   */
  updateNodeStatistics(enrichedNodes, sizeBy = 'eigenvector', preserveZoom = true) {
    if (!enrichedNodes || !Array.isArray(enrichedNodes)) {
      this.log.warn('updateNodeStatistics: enrichedNodes must be an array');
      return;
    }

    // Create a map of enriched nodes by ID for fast lookup
    const enrichedMap = new Map();
    enrichedNodes.forEach(node => {
      enrichedMap.set(node.id, node);
    });

    // Update existing node objects in-place (preserve D3 references)
    let hasEigenvector = false;
    this.data.nodes.forEach(node => {
      const enriched = enrichedMap.get(node.id);
      if (enriched) {
        // Merge statistics into existing node (preserve x, y, vx, vy, fx, fy)
        Object.keys(enriched).forEach(key => {
          // Skip position properties that D3 manages
          if (key !== 'x' && key !== 'y' && key !== 'vx' && key !== 'vy' && key !== 'fx' && key !== 'fy') {
            node[key] = enriched[key];
          }
        });
        
        if (enriched.eigenvector !== undefined) {
          hasEigenvector = true;
        }
      }
    });

    // Enable sizing by eigenvector if available
    if (hasEigenvector && sizeBy === 'eigenvector') {
      this.updateVisualEncoding({
        sizeBy: 'eigenvector',
        preserveZoom
      });
    } else {
      // Just recompute scales and update visualization
      this.computeScales();
      if (this.node) {
        this.node
          .attr('r', d => this.getNodeRadius(d))
          .attr('fill', d => this.getNodeColor(d));
      }
      
      // Update collision detection
      if (this.simulation) {
        this.simulation.force('collision')
          .radius(d => this.getNodeRadius(d) + DEFAULTS.COLLISION_PADDING);
      }
    }

    this.log.debug('Node statistics updated', { 
      nodeCount: enrichedNodes.length,
      sizingBy: hasEigenvector ? sizeBy : 'none'
    });
  }

  /**
   * Update the graph visualization
   */
  updateGraph() {
    if (!this.data.nodes || !this.data.links) return;

    // Reset ready state when updating graph
    this.isReady = false;
    this.isRendering = false;
    this.stableTickCount = 0;
    this.lastAlpha = 1;

    // Hide SVG until ready
    if (this.svg) {
      this.svg
        .style('opacity', 0)
        .style('visibility', 'hidden');
    }

    // Update links with optimized key function
    this.link = this.linkGroup
      .selectAll('line')
      .data(this.data.links, d => getLinkKey(d));

    this.link.exit().remove();

    const linkEnter = this.link.enter()
      .append('line')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('aria-label', d => `Link from ${normalizeLinkId(d.source)} to ${normalizeLinkId(d.target)}`);

    this.link = linkEnter.merge(this.link);

    // Update nodes
    this.node = this.nodeGroup
      .selectAll('circle')
      .data(this.data.nodes, d => d.id);

    this.node.exit().remove();

    const nodeEnter = this.node.enter()
      .append('circle')
      .attr('r', d => this.getNodeRadius(d))
      .attr('fill', d => this.getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('aria-label', d => `Node ${d.id}`)
      .call(this.createDragBehavior())
      .on('mouseover', (event, d) => this.onNodeMouseOver(event, d))
      .on('mouseout', (event, d) => this.onNodeMouseOut(event, d))
      .on('click', (event, d) => this.emit('nodeClick', d))
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.emit('nodeClick', d);
        }
      });

    // Update existing nodes (size and color may have changed)
    this.node = nodeEnter.merge(this.node)
      .attr('r', d => this.getNodeRadius(d))
      .attr('fill', d => this.getNodeColor(d));

    // Update collision detection with dynamic radius
    this.simulation.force('collision')
      .radius(d => this.getNodeRadius(d) + DEFAULTS.COLLISION_PADDING);

    // Update labels if enabled
    if (this.options.showLabels && this.labelGroup) {
      this.label = this.labelGroup
        .selectAll('text')
        .data(this.data.nodes, d => d.id);

      this.label.exit().remove();

      const labelEnter = this.label.enter()
        .append('text')
        .text(d => d.id)
        .attr('font-size', '12px')
        .attr('dx', 12)
        .attr('dy', 4)
        .attr('fill', 'var(--color-text-primary)')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .attr('aria-hidden', 'true');

      this.label = labelEnter.merge(this.label);
      
      // Update label visibility based on current zoom
      this.updateLabelVisibility();
    }

    // Update simulation - start rendering after initial positioning
    this.simulation.nodes(this.data.nodes);
    this.simulation.force('link').links(this.data.links);
    
    // Enable rendering after first positioning
    requestAnimationFrame(() => {
      this.isRendering = true;
      this.simulation.alpha(DEFAULTS.SIMULATION_ALPHA).restart();
    });
  }

  /**
   * Handle simulation tick event
   */
  onTick() {
    if (this.isDestroyed) return;

    // Only render if we're ready (or if rendering is enabled)
    if (!this.isRendering && !this.isReady) {
      return;
    }

    // Update link positions
    if (this.link) {
      this.link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
    }

    // Update node positions
    if (this.node) {
      this.node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    }

    // Update label positions
    if (this.label) {
      this.label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    }

    // Check for stabilization (only if not ready yet)
    if (!this.isReady && this.simulation) {
      this.checkStabilization();
    }
  }

  /**
   * Check if simulation has stabilized
   * Uses requestAnimationFrame for smooth checking without setTimeout
   */
  checkStabilization() {
    if (!this.simulation || this.isDestroyed) return;

    const currentAlpha = this.simulation.alpha();

    // If alpha is very low, increment stable tick count
    if (currentAlpha < this.stabilizationThreshold) {
      this.stableTickCount++;
    } else {
      // Reset if alpha increased (simulation restarted)
      this.stableTickCount = 0;
    }

    // If we've had enough stable ticks, consider it stabilized
    if (this.stableTickCount >= this.requiredStableTicks) {
      this.markAsReady();
    } else {
      // Schedule next check using requestAnimationFrame
      if (!this.stabilizationCheckFrame) {
        this.stabilizationCheckFrame = requestAnimationFrame(() => {
          this.stabilizationCheckFrame = null;
          // Check will happen on next tick
        });
      }
    }

    this.lastAlpha = currentAlpha;
  }

  /**
   * Handle simulation end event
   */
  onSimulationEnd() {
    if (this.isDestroyed) return;
    
    // Simulation ended naturally, mark as ready
    this.markAsReady();
  }

  /**
   * Mark graph as ready and emit ready event
   */
  markAsReady() {
    if (this.isReady || this.isDestroyed) return;

    this.log.debug('Graph marked as ready');
    this.isReady = true;
    this.isRendering = true;

    // Show SVG
    if (this.svg) {
      this.svg
        .style('opacity', 1)
        .style('visibility', 'visible');
    }

    // Cancel any pending stabilization checks
    if (this.stabilizationCheckFrame) {
      cancelAnimationFrame(this.stabilizationCheckFrame);
      this.stabilizationCheckFrame = null;
    }

    // Fit to view after a brief moment (using requestAnimationFrame)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.fitToView();
        this.emit('ready');
      });
    });
  }

  /**
   * Create drag behavior for nodes
   * @returns {Function} D3 drag behavior
   */
  createDragBehavior() {
    return d3.drag()
      .on('start', (event, d) => {
        if (!event.active) {
          this.simulation.alphaTarget(DEFAULTS.DRAG_ALPHA_TARGET).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
        this.emit('nodeDragStart', d);
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
        this.emit('nodeDrag', d);
      })
      .on('end', (event, d) => {
        if (!event.active) {
          this.simulation.alphaTarget(0);
        }
        // Keep node fixed where user dropped it
        // d.fx = null;
        // d.fy = null;
        this.emit('nodeDragEnd', d);
      });
  }

  /**
   * Check if dark mode is enabled
   * @returns {boolean} True if dark mode is active
   */
  isDarkMode() {
    return document.documentElement.classList.contains('dark') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /**
   * Update tooltip styles based on dark mode
   * @param {boolean} isDark - Whether dark mode is active
   */
  updateTooltipStyles(isDark) {
    if (!this.tooltip) return;
    
    this.tooltip
      .style('background', isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(0, 0, 0, 0.9)')
      .style('color', isDark ? '#f9fafb' : '#fff')
      .style('box-shadow', isDark 
        ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
        : '0 4px 12px rgba(0, 0, 0, 0.3)')
      .style('border', isDark 
        ? '1px solid rgba(255, 255, 255, 0.1)' 
        : '1px solid rgba(255, 255, 255, 0.2)');
  }

  /**
   * Create tooltip element
   */
  createTooltip() {
    // Remove existing tooltip if any
    if (this.tooltip) {
      this.tooltip.remove();
    }

    // Remove existing dark mode listener if any
    if (this.darkModeQuery && this.darkModeHandler) {
      this.darkModeQuery.removeEventListener('change', this.darkModeHandler);
    }

    const isDarkMode = this.isDarkMode();

    // Create tooltip div
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'network-graph-tooltip')
      .attr('role', 'tooltip')
      .attr('aria-hidden', 'true')
      .style('position', 'absolute')
      .style('padding', '10px 14px')
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('font-family', 'system-ui, -apple-system, sans-serif')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('visibility', 'hidden')
      .style('z-index', 1000)
      .style('max-width', `${DEFAULTS.TOOLTIP_MAX_WIDTH}px`)
      .style('line-height', '1.6')
      .style('backdrop-filter', 'blur(8px)');

    // Set initial styles
    this.updateTooltipStyles(isDarkMode);

    // Listen for dark mode changes
    if (window.matchMedia) {
      this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.darkModeHandler = (e) => {
        if (!this.isDestroyed && this.tooltip) {
          this.updateTooltipStyles(e.matches);
        }
      };
      this.darkModeQuery.addEventListener('change', this.darkModeHandler);
    }
  }

  /**
   * Show tooltip with node information
   * @param {MouseEvent} event - Mouse event
   * @param {Object} node - Node object
   */
  showTooltip(event, node) {
    if (!this.tooltip || this.isDestroyed) return;

    // Build tooltip content (use custom builder if provided)
    const content = this.options.tooltipBuilder 
      ? this.options.tooltipBuilder(node)
      : this.buildTooltipContent(node);
    
    this.tooltip.html(content);

    // Get mouse position relative to page (not SVG)
    const mouseX = event.clientX || event.pageX;
    const mouseY = event.clientY || event.pageY;

    // Show tooltip first to measure its size
    this.tooltip
      .style('opacity', 0)
      .style('visibility', 'visible')
      .attr('aria-hidden', 'false');
    
    const tooltipNode = this.tooltip.node();
    if (!tooltipNode) return;
    
    const tooltipWidth = tooltipNode.offsetWidth || 200;
    const tooltipHeight = tooltipNode.offsetHeight || 100;
    const padding = DEFAULTS.TOOLTIP_PADDING;

    // Calculate position relative to mouse
    let left = mouseX + padding;
    let top = mouseY - tooltipHeight - padding;

    // Adjust position to keep tooltip in viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // If tooltip would go off right edge, show on left side of cursor
    if (left + tooltipWidth > viewportWidth - padding) {
      left = mouseX - tooltipWidth - padding;
    }

    // If tooltip would go off left edge, show on right side
    if (left < padding) {
      left = mouseX + padding;
    }

    // If tooltip would go off top, show below cursor
    if (top < padding) {
      top = mouseY + padding;
    }

    // If tooltip would go off bottom, show above cursor
    if (top + tooltipHeight > viewportHeight - padding) {
      top = mouseY - tooltipHeight - padding;
    }

    // Position tooltip
    this.tooltip
      .style('left', `${left}px`)
      .style('top', `${top}px`)
      .transition()
      .duration(DEFAULTS.TOOLTIP_DURATION)
      .style('opacity', 1);

    this.currentTooltipNode = node;
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (!this.tooltip) return;

    this.tooltip
      .transition()
      .duration(DEFAULTS.TOOLTIP_DURATION)
      .style('opacity', 0)
      .on('end', function() {
        d3.select(this)
          .style('visibility', 'hidden')
          .attr('aria-hidden', 'true');
      });

    this.currentTooltipNode = null;
  }

  /**
   * Update label visibility based on zoom level
   * Hide labels when zoomed out too far to prevent clutter
   */
  updateLabelVisibility() {
    if (!this.label || !this.options.showLabels) return;

    const shouldShow = this.currentZoom >= DEFAULTS.LABEL_VISIBILITY_THRESHOLD;
    
    this.label
      .style('opacity', shouldShow ? 1 : 0)
      .style('visibility', shouldShow ? 'visible' : 'hidden');
  }

  /**
   * Build tooltip content HTML
   * @param {Object} node - Node object
   * @returns {string} HTML content for tooltip
   */
  buildTooltipContent(node) {
    if (!node) return '';
    
    const parts = [];
    
    // Node ID (always show first)
    parts.push(`<div style="font-weight: 600; margin-bottom: 6px; font-size: 13px;">🔵 ${node.id}</div>`);
    
    // Properties to exclude (D3 internal/positional properties)
    const excludeProps = new Set([
      'id',           // Already shown
      'x', 'y',       // Position (shown separately in dev mode)
      'fx', 'fy',     // Fixed position
      'vx', 'vy',     // Velocity
      'index',        // D3 index
      '__data__',     // D3 data reference
      '__transition__' // D3 transition
    ]);

    // Priority properties (shown first, before others)
    const priorityProps = [
      'relationship',  // Family relationship
      'group',         // Group number
      'community'      // Community detection
    ];

    // Metrics to format specially
    const metricsProps = [
      'degree',
      'eigenvector',
      'betweenness',
      'clustering',
      'closeness',
      'centrality'
    ];

    // Show priority properties first
    priorityProps.forEach(prop => {
      if (node[prop] !== undefined && node[prop] !== null && !excludeProps.has(prop)) {
        const value = node[prop];
        let label = prop.charAt(0).toUpperCase() + prop.slice(1).replace(/_/g, ' ');
        
        // Special formatting for specific properties
        if (prop === 'relationship') {
          parts.push(`<div style="margin-bottom: 3px;"><strong>👤 Relationship:</strong> ${this.escapeHtml(value)}</div>`);
        } else if (prop === 'group') {
          parts.push(`<div style="margin-bottom: 3px;"><strong>Group:</strong> ${value}</div>`);
        } else if (prop === 'community') {
          parts.push(`<div style="margin-bottom: 3px;"><strong>🎨 Community:</strong> ${value}</div>`);
        } else {
          parts.push(`<div style="margin-bottom: 3px;"><strong>${label}:</strong> ${this.escapeHtml(String(value))}</div>`);
        }
      }
    });

    // Show metrics with special formatting
    metricsProps.forEach(prop => {
      if (node[prop] !== undefined && node[prop] !== null && !excludeProps.has(prop)) {
        const value = node[prop];
        const label = prop.charAt(0).toUpperCase() + prop.slice(1).replace(/_/g, ' ');
        
        // Only show centrality if eigenvector isn't shown (to avoid duplication)
        if (prop === 'centrality' && node.eigenvector !== undefined) {
          return; // Skip
        }
        
        if (typeof value === 'number') {
          parts.push(`<div style="margin-bottom: 2px;"><strong>${label}:</strong> ${value.toFixed(4)}</div>`);
        } else {
          parts.push(`<div style="margin-bottom: 2px;"><strong>${label}:</strong> ${this.escapeHtml(String(value))}</div>`);
        }
      }
    });

    // Show all other properties (excluding D3 internals and already shown properties)
    const shownProps = new Set([...priorityProps, ...metricsProps, 'x', 'y']);
    const otherProps = Object.keys(node)
      .filter(key => 
        !excludeProps.has(key) && 
        !shownProps.has(key) &&
        node[key] !== undefined && 
        node[key] !== null &&
        typeof node[key] !== 'function' && // Exclude functions
        !key.startsWith('__') // Exclude any other D3 internals
      )
      .sort();

    if (otherProps.length > 0) {
      parts.push(`<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${this.isDarkMode() ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}; font-size: 11px;">`);
      parts.push(`<div style="margin-bottom: 4px; font-weight: 600; color: ${this.isDarkMode() ? 'rgba(249,250,251,0.8)' : 'rgba(0,0,0,0.7)'};">Other Properties:</div>`);
      
      otherProps.forEach(prop => {
        const value = node[prop];
        let displayValue;
        
        if (typeof value === 'object' && value !== null) {
          // For objects, show a summary
          if (Array.isArray(value)) {
            displayValue = `[${value.length} items]`;
          } else {
            displayValue = `{${Object.keys(value).length} keys}`;
          }
        } else {
          displayValue = String(value);
        }
        
        const label = prop.charAt(0).toUpperCase() + prop.slice(1).replace(/_/g, ' ');
        parts.push(`<div style="margin-bottom: 2px; font-family: monospace; font-size: 10px;"><strong>${label}:</strong> ${this.escapeHtml(displayValue)}</div>`);
      });
      
      parts.push('</div>');
    }

    // Position (debug info in dev mode)
    if (node.x !== undefined && node.y !== undefined && import.meta.env.DEV) {
      const isDarkMode = this.isDarkMode();
      const borderColor = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
      const textColor = isDarkMode ? 'rgba(249,250,251,0.6)' : 'rgba(0,0,0,0.5)';
      
      parts.push(`<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${borderColor}; font-size: 10px; color: ${textColor}; font-family: monospace;">
        Position: (${Math.round(node.x)}, ${Math.round(node.y)})
      </div>`);
    }

    return parts.join('');
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle node mouse over
   */
  onNodeMouseOver(event, node) {
    // Highlight node
    d3.select(event.currentTarget)
      .attr('stroke-width', 4)
      .attr('stroke', '#fbbf24');

    // Show tooltip
    this.showTooltip(event, node);

    // Emit event for external handlers
    this.emit('nodeHover', node);
  }

  /**
   * Handle node mouse out
   */
  onNodeMouseOut(event, node) {
    // Reset node
    d3.select(event.currentTarget)
      .attr('stroke-width', 2)
      .attr('stroke', '#fff');

    // Hide tooltip
    this.hideTooltip();

    // Emit event for external handlers
    this.emit('nodeLeave', node);
  }

  /**
   * Get radius for node based on configured size property
   */
  getNodeRadius(node) {
    // If sizeBy is configured and scale exists, use it
    if (this.options.sizeBy && this.sizeScale) {
      const value = node[this.options.sizeBy];
      if (value !== undefined && value !== null) {
        return this.sizeScale(value);
      }
    }

    // Fallback to default radius
    return this.options.nodeRadius;
  }

  /**
   * Get color for node based on configured color property
   */
  getNodeColor(node) {
    // Check for custom color function first
    if (this.options.customColorFunction) {
      const customColor = this.options.customColorFunction(node);
      if (customColor) {
        return customColor;
      }
    }

    const colorProperty = this.options.colorBy;

    // Use computed color scale if available
    if (this.colorScale) {
      const value = node[colorProperty];
      if (value !== undefined && value !== null) {
        return this.colorScale(value);
      }
    }

    // Fallback to group-based coloring
    const group = node.group || 0;
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316'  // orange
    ];
    return colors[(group - 1) % colors.length];
  }

  /**
   * Handle window resize (debounced)
   */
  handleResize() {
    if (this.isDestroyed || !this.container) return;

    const rect = this.container.getBoundingClientRect();
    const width = rect.width || this.options.width;
    const height = rect.height || this.options.height;

    // Only update if dimensions actually changed
    if (width === this.options.width && height === this.options.height) {
      return;
    }

    this.options.width = width;
    this.options.height = height;

    if (this.svg) {
      this.svg
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);
    }

    if (this.simulation) {
      this.simulation
        .force('center', d3.forceCenter(width / 2, height / 2))
        .alpha(DEFAULTS.SIMULATION_RESTART_ALPHA)
        .restart();
    }

    this.emit('resize', { width, height });
  }

  /**
   * Simple event emitter
   */
  emit(eventName, data) {
    if (this.eventHandlers && this.eventHandlers[eventName]) {
      this.eventHandlers[eventName].forEach(handler => handler(data));
    }
  }

  /**
   * Register event handler
   */
  on(eventName, handler) {
    if (!this.eventHandlers) {
      this.eventHandlers = {};
    }
    if (!this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = [];
    }
    this.eventHandlers[eventName].push(handler);
  }

  /**
   * Remove event handler
   */
  off(eventName, handler) {
    if (this.eventHandlers && this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName]
        .filter(h => h !== handler);
    }
  }

  /**
   * Add a new node to the graph incrementally (without resetting ready state)
   * Use this for interactive additions where you don't want the graph to disappear
   * @param {Array} neighborIds - IDs of nodes to connect to
   * @param {String} nodeId - ID for the new node (optional, auto-generated if not provided)
   * @param {Number} group - Group number for the node (optional)
   * @returns {Object} The newly created node
   */
  addNodeIncremental(neighborIds = [], nodeId = null, group = null) {
    // Generate ID if not provided
    const newId = nodeId || `Node${this.data.nodes.length + 1}`;

    // Determine group
    const nodeGroup = group !== null ? group :
      (this.data.nodes.length > 0 ?
        this.data.nodes[Math.floor(Math.random() * this.data.nodes.length)].group : 1);

    // Calculate position based on neighbors
    let x = this.options.width / 2;
    let y = this.options.height / 2;

    if (neighborIds.length > 0) {
      const neighbors = this.data.nodes.filter(n => neighborIds.includes(n.id));
      if (neighbors.length > 0) {
        x = neighbors.reduce((sum, n) => sum + n.x, 0) / neighbors.length;
        y = neighbors.reduce((sum, n) => sum + n.y, 0) / neighbors.length;

        // Add random offset
        const angle = Math.random() * 2 * Math.PI;
        const distance = 50 + Math.random() * 50;
        x += Math.cos(angle) * distance;
        y += Math.sin(angle) * distance;
      }
    }

    // Create new node
    const newNode = {
      id: newId,
      group: nodeGroup,
      centrality: 0.5,
      x,
      y,
      fx: x, // Fix initially
      fy: y
    };

    // Add to data
    this.data.nodes.push(newNode);

    // Create links to neighbors
    const newLinks = [];
    neighborIds.forEach(neighborId => {
      if (this.data.nodes.find(n => n.id === neighborId)) {
        const newLink = {
          source: newId,
          target: neighborId
        };
        this.data.links.push(newLink);
        newLinks.push(newLink);
      }
    });

    // Update scales if needed (for color/size)
    this.computeScales();

    // Add new node to visualization without resetting ready state
    if (this.nodeGroup) {
      // Update node selection with all nodes including the new one
      this.node = this.nodeGroup
        .selectAll('circle')
        .data(this.data.nodes, d => d.id);

      // Add new node
      const nodeEnter = this.node
        .enter()
        .append('circle')
        .attr('r', d => this.getNodeRadius(d))
        .attr('fill', d => this.getNodeColor(d))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer')
        .attr('role', 'button')
        .attr('tabindex', 0)
        .attr('aria-label', d => `Node ${d.id}`)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .call(this.createDragBehavior())
        .on('mouseover', (event, d) => this.onNodeMouseOver(event, d))
        .on('mouseout', (event, d) => this.onNodeMouseOut(event, d))
        .on('click', (event, d) => this.emit('nodeClick', d))
        .on('keydown', (event, d) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.emit('nodeClick', d);
          }
        });

      // Merge and update all nodes (in case colors changed)
      this.node = nodeEnter.merge(this.node);
      this.node
        .attr('r', d => this.getNodeRadius(d))
        .attr('fill', d => this.getNodeColor(d));
    }

    // Add new links
    if (this.linkGroup && newLinks.length > 0) {
      // Update link selection with all links including new ones
      this.link = this.linkGroup
        .selectAll('line')
        .data(this.data.links, d => getLinkKey(d));

      // Add new links
      const linkEnter = this.link
        .enter()
        .append('line')
        .attr('stroke', 'var(--color-border)')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.6)
        .attr('x1', d => {
          const source = typeof d.source === 'object' ? d.source : this.data.nodes.find(n => n.id === d.source);
          return source?.x || 0;
        })
        .attr('y1', d => {
          const source = typeof d.source === 'object' ? d.source : this.data.nodes.find(n => n.id === d.source);
          return source?.y || 0;
        })
        .attr('x2', d => {
          const target = typeof d.target === 'object' ? d.target : this.data.nodes.find(n => n.id === d.target);
          return target?.x || 0;
        })
        .attr('y2', d => {
          const target = typeof d.target === 'object' ? d.target : this.data.nodes.find(n => n.id === d.target);
          return target?.y || 0;
        })
        .attr('aria-label', d => `Link from ${normalizeLinkId(d.source)} to ${normalizeLinkId(d.target)}`);

      // Merge
      this.link = linkEnter.merge(this.link);
    }

    // Add label if enabled
    if (this.options.showLabels && this.labelGroup) {
      // Update label selection with all nodes including the new one
      this.label = this.labelGroup
        .selectAll('text')
        .data(this.data.nodes, d => d.id);

      // Add new label
      const labelEnter = this.label
        .enter()
        .append('text')
        .text(d => d.id)
        .attr('font-size', '12px')
        .attr('dx', 12)
        .attr('dy', 4)
        .attr('fill', 'var(--color-text-primary)')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .attr('aria-hidden', 'true');

      // Merge
      this.label = labelEnter.merge(this.label);
      
      this.updateLabelVisibility();
    }

    // Update simulation with new node
    this.simulation.nodes(this.data.nodes);
    this.simulation.force('link').links(this.data.links);
    
    // Update collision detection
    this.simulation.force('collision')
      .radius(d => this.getNodeRadius(d) + DEFAULTS.COLLISION_PADDING);

    // Restart simulation gently (don't reset ready state)
    if (this.isReady) {
      // Keep graph visible, just restart simulation with low alpha
      this.simulation.alpha(0.3).restart();
    } else {
      // If not ready yet, enable rendering
      this.isRendering = true;
      requestAnimationFrame(() => {
        this.simulation.alpha(DEFAULTS.SIMULATION_ALPHA).restart();
      });
    }

    // Release fixed position after a moment
    setTimeout(() => {
      const node = this.data.nodes.find(n => n.id === newId);
      if (node) {
        node.fx = null;
        node.fy = null;
        this.simulation.alpha(0.3).restart();
      }
    }, 1000);

    return newNode;
  }

  /**
   * Add a new node to the graph
   * @param {Array} neighborIds - IDs of nodes to connect to
   * @param {String} nodeId - ID for the new node (optional, auto-generated if not provided)
   * @param {Number} group - Group number for the node (optional)
   * @returns {Object} The newly created node
   */
  addNode(neighborIds = [], nodeId = null, group = null) {
    // Generate ID if not provided
    const newId = nodeId || `Node${this.data.nodes.length + 1}`;

    // Determine group
    const nodeGroup = group !== null ? group :
      (this.data.nodes.length > 0 ?
        this.data.nodes[Math.floor(Math.random() * this.data.nodes.length)].group : 1);

    // Calculate position based on neighbors
    let x = this.options.width / 2;
    let y = this.options.height / 2;

    if (neighborIds.length > 0) {
      const neighbors = this.data.nodes.filter(n => neighborIds.includes(n.id));
      if (neighbors.length > 0) {
        x = neighbors.reduce((sum, n) => sum + n.x, 0) / neighbors.length;
        y = neighbors.reduce((sum, n) => sum + n.y, 0) / neighbors.length;

        // Add random offset
        const angle = Math.random() * 2 * Math.PI;
        const distance = 50 + Math.random() * 50;
        x += Math.cos(angle) * distance;
        y += Math.sin(angle) * distance;
      }
    }

    // Create new node
    const newNode = {
      id: newId,
      group: nodeGroup,
      centrality: 0.5,
      x,
      y,
      fx: x, // Fix initially
      fy: y
    };

    // Add to data
    this.data.nodes.push(newNode);

    // Create links to neighbors
    neighborIds.forEach(neighborId => {
      if (this.data.nodes.find(n => n.id === neighborId)) {
        this.data.links.push({
          source: newId,
          target: neighborId
        });
      }
    });

    // Update graph
    this.updateGraph();

    // Release fixed position after a moment
    setTimeout(() => {
      const node = this.data.nodes.find(n => n.id === newId);
      if (node) {
        node.fx = null;
        node.fy = null;
        this.simulation.alpha(0.3).restart();
      }
    }, 1000);

    return newNode;
  }

  /**
   * Remove a node from the graph
   * @param {String} nodeId - ID of the node to remove
   * @returns {Boolean} True if node was removed
   */
  removeNode(nodeId) {
    if (!nodeId) {
      // Remove random node if no ID specified
      if (this.data.nodes.length > 0) {
        nodeId = this.data.nodes[Math.floor(Math.random() * this.data.nodes.length)].id;
      } else {
        return false;
      }
    }

    const nodeIndex = this.data.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return false;

    // Remove node
    this.data.nodes.splice(nodeIndex, 1);

    // Remove all links connected to this node using normalized IDs
    this.data.links = this.data.links.filter(l => {
      const sourceId = normalizeLinkId(l.source);
      const targetId = normalizeLinkId(l.target);
      return sourceId !== nodeId && targetId !== nodeId;
    });

    // Clear link key cache
    this.linkKeyCache.clear();

    // Update graph
    this.updateGraph();

    this.emit('nodeRemoved', nodeId);
    return true;
  }

  /**
   * Add a link between two nodes incrementally (without resetting ready state)
   * Use this for interactive additions where you don't want the graph to disappear
   * @param {String} sourceId - Source node ID
   * @param {String} targetId - Target node ID
   * @returns {Boolean} True if link was added
   */
  addLinkIncremental(sourceId, targetId) {
    if (!sourceId || !targetId) return false;

    // Check if nodes exist
    const sourceNode = this.data.nodes.find(n => n.id === sourceId);
    const targetNode = this.data.nodes.find(n => n.id === targetId);
    if (!sourceNode || !targetNode) {
      this.log.warn(`Cannot add link: nodes ${sourceId} or ${targetId} not found`);
      return false;
    }

    // Prevent self-loops
    if (sourceId === targetId) {
      this.log.warn('Cannot add self-loop');
      return false;
    }

    // Check if link already exists using normalized IDs
    const newLink = { source: sourceId, target: targetId };
    const newLinkKey = getLinkKey(newLink);
    const linkExists = this.data.links.some(l => getLinkKey(l) === newLinkKey);

    if (linkExists) {
      this.log.debug(`Link already exists: ${sourceId} -> ${targetId}`);
      return false;
    }

    // Add link to data
    this.data.links.push(newLink);

    // Add link to visualization without resetting ready state
    if (this.linkGroup) {
      // Update link selection with all links including new one
      this.link = this.linkGroup
        .selectAll('line')
        .data(this.data.links, d => getLinkKey(d));

      // Add new link
      const linkEnter = this.link
        .enter()
        .append('line')
        .attr('stroke', 'var(--color-border)')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.6)
        .attr('x1', d => {
          const source = typeof d.source === 'object' ? d.source : this.data.nodes.find(n => n.id === d.source);
          return source?.x || 0;
        })
        .attr('y1', d => {
          const source = typeof d.source === 'object' ? d.source : this.data.nodes.find(n => n.id === d.source);
          return source?.y || 0;
        })
        .attr('x2', d => {
          const target = typeof d.target === 'object' ? d.target : this.data.nodes.find(n => n.id === d.target);
          return target?.x || 0;
        })
        .attr('y2', d => {
          const target = typeof d.target === 'object' ? d.target : this.data.nodes.find(n => n.id === d.target);
          return target?.y || 0;
        })
        .attr('aria-label', d => `Link from ${normalizeLinkId(d.source)} to ${normalizeLinkId(d.target)}`);

      // Merge
      this.link = linkEnter.merge(this.link);
    }

    // Update simulation with new link
    this.simulation.force('link').links(this.data.links);

    // Restart simulation gently (don't reset ready state)
    if (this.isReady) {
      // Keep graph visible, just restart simulation with low alpha
      this.simulation.alpha(0.3).restart();
    } else {
      // If not ready yet, enable rendering
      this.isRendering = true;
      requestAnimationFrame(() => {
        this.simulation.alpha(DEFAULTS.SIMULATION_ALPHA).restart();
      });
    }

    this.emit('linkAdded', { source: sourceId, target: targetId });
    return true;
  }

  /**
   * Add a link between two nodes
   * @param {String} sourceId - Source node ID
   * @param {String} targetId - Target node ID
   * @returns {Boolean} True if link was added
   */
  addLink(sourceId, targetId) {
    if (!sourceId || !targetId) return false;

    // Check if nodes exist
    const sourceExists = this.data.nodes.some(n => n.id === sourceId);
    const targetExists = this.data.nodes.some(n => n.id === targetId);
    if (!sourceExists || !targetExists) {
      this.log.warn(`Cannot add link: nodes ${sourceId} or ${targetId} not found`);
      return false;
    }

    // Prevent self-loops
    if (sourceId === targetId) {
      this.log.warn('Cannot add self-loop');
      return false;
    }

    // Check if link already exists using normalized IDs
    const newLink = { source: sourceId, target: targetId };
    const newLinkKey = getLinkKey(newLink);
    const linkExists = this.data.links.some(l => getLinkKey(l) === newLinkKey);

    if (linkExists) {
      this.log.debug(`Link already exists: ${sourceId} -> ${targetId}`);
      return false;
    }

    // Add link
    this.data.links.push(newLink);

    // Update graph
    this.updateGraph();

    this.emit('linkAdded', { source: sourceId, target: targetId });
    return true;
  }

  /**
   * Get all node IDs
   * @returns {Array} Array of node IDs
   */
  getNodeIds() {
    return this.data.nodes.map(n => n.id);
  }

  /**
   * Check if a node exists
   * @param {String} nodeId - Node ID to check
   * @returns {Boolean} True if node exists
   */
  hasNode(nodeId) {
    return this.data.nodes.some(n => n.id === nodeId);
  }

  /**
   * Fit graph to view - zoom out to show entire network
   */
  fitToView() {
    if (!this.data.nodes || this.data.nodes.length === 0 || !this.svg) {
      return;
    }

    // Calculate bounds of all nodes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    this.data.nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        const radius = this.getNodeRadius(node);
        minX = Math.min(minX, node.x - radius);
        minY = Math.min(minY, node.y - radius);
        maxX = Math.max(maxX, node.x + radius);
        maxY = Math.max(maxY, node.y + radius);
      }
    });

    // If no valid bounds, return
    if (minX === Infinity || minY === Infinity) {
      return;
    }

    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Get SVG dimensions
    const svgWidth = this.options.width;
    const svgHeight = this.options.height;

    // Calculate scale to fit
    const scaleX = svgWidth / graphWidth;
    const scaleY = svgHeight / graphHeight;
    const scale = Math.min(scaleX, scaleY, DEFAULTS.ZOOM_MAX) * 0.9; // 90% to add some margin

    // Calculate translation to center
    const translateX = svgWidth / 2 - centerX * scale;
    const translateY = svgHeight / 2 - centerY * scale;

    // Apply transform using zoom behavior
    const zoom = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);

    if (this.zoomBehavior && this.svg) {
      this.svg.call(this.zoomBehavior.transform, zoom);
    }

    // Update internal state
    this.g.attr('transform', zoom);
    this.currentZoom = scale;

    // Update label visibility after fitting to view
    this.updateLabelVisibility();

    this.log.debug('Fitted graph to view', { scale, translateX, translateY });
  }

  /**
   * Lock all node positions at their current locations
   * Fixes nodes in place and stops simulation movement
   */
  lockPositions() {
    if (!this.data.nodes || this.data.nodes.length === 0) {
      this.log.warn('No nodes to lock');
      return;
    }

    // Set fixed positions to current positions
    this.data.nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        node.fx = node.x;
        node.fy = node.y;
      }
    });

    // Stop simulation movement
    if (this.simulation) {
      this.simulation.alpha(0).alphaTarget(0);
    }

    this.log.debug('Node positions locked');
    this.emit('positionsLocked');
  }

  /**
   * Unlock all node positions
   * Releases fixed positions and restarts simulation
   */
  unlockPositions() {
    if (!this.data.nodes || this.data.nodes.length === 0) {
      this.log.warn('No nodes to unlock');
      return;
    }

    // Clear all fixed positions
    this.data.nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });

    // Restart simulation with high energy
    if (this.simulation) {
      this.simulation.alpha(0.3).alphaTarget(0).restart();
    }

    this.log.debug('Node positions unlocked');
    this.emit('positionsUnlocked');
  }

  /**
   * Export graph as PNG image
   * @param {string} filename - Filename for download (default: 'network-graph.png')
   */
  saveAsPNG(filename = 'network-graph.png') {
    if (!this.svg || this.isDestroyed) {
      this.log.warn('Cannot save PNG - graph not available');
      return;
    }

    try {
      // Get SVG element
      const svgElement = this.svg.node();
      if (!svgElement) {
        this.log.warn('SVG element not found');
        return;
      }

      // Get SVG data as string
      const svgData = new XMLSerializer().serializeToString(svgElement);
      
      // Create image
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = this.options.width;
        canvas.height = this.options.height;
        const ctx = canvas.getContext('2d');

        // Fill background (white or transparent)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw SVG image
        ctx.drawImage(img, 0, 0);

        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            this.log.info('PNG exported successfully', { filename });
          }
        }, 'image/png');

        URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        this.log.error('Failed to load SVG for PNG export');
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (err) {
      this.log.error('Failed to export PNG', { error: err.message, stack: err.stack });
    }
  }

  /**
   * Cleanup and destroy the graph
   */
  destroy() {
    if (this.isDestroyed) return;

    this.log.debug('Destroying graph instance');
    this.isDestroyed = true;

    // Cancel any pending animation frames
    if (this.stabilizationCheckFrame) {
      cancelAnimationFrame(this.stabilizationCheckFrame);
      this.stabilizationCheckFrame = null;
    }

    // Stop simulation
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }

    // Remove resize handler
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    // Remove dark mode listener
    if (this.darkModeQuery && this.darkModeHandler) {
      this.darkModeQuery.removeEventListener('change', this.darkModeHandler);
      this.darkModeQuery = null;
      this.darkModeHandler = null;
    }

    // Remove SVG
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }

    // Remove tooltip
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }

    // Clear data
    this.data = { nodes: [], links: [] };

    // Clear caches
    this.linkKeyCache.clear();

    // Clear event handlers
    this.eventHandlers = {};

    this.log.info('Graph destroyed');
  }
}

export default NetworkGraphD3;
