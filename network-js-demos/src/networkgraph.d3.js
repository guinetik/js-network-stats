import { NetworkAdapter } from './network-adapter.js';
import { d3Theme } from './d3-theme.js';

export default class NetworkGraph {
  constructor(containerId, width, height, options = {}) {
    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    this.container = d3.select(containerId || "body");

    // Get loading indicator element (if it exists)
    this.loadingIndicator = document.getElementById('graph-loading');

    this.data = {
      nodes: [],
      links: [],
    };

    // Use theme system for colors
    this.theme = options.theme || d3Theme;
    this.nextId = 1;
    this.groups = {};
    this.nodeInfoCallback = null;
    this.nodeInfoHideCallback = null;

    // Worker options
    this.useWorker = options.useWorker !== false; // Default true
    this.workerThreshold = options.workerThreshold || 1000; // Use worker for networks > 1000 edges
    this.worker = null;
    this.isUsingWorker = false;

    // Fluid mode for large networks (let network expand naturally, then zoom to fit)
    this.fluidThreshold = options.fluidThreshold || 1000; // Use fluid mode for networks > 1000 edges
    this.isFluidMode = false;

    // Calculation state (hide graph while positions are being calculated for large networks)
    this.isCalculating = false;
    this.calculationThreshold = options.calculationThreshold || 500; // Hide during calculation for networks > 500 edges
    this.onCalculationComplete = null; // Callback when calculation finishes
    this.skipRendering = false; // Skip DOM updates during calculation

    // Custom layout state (prevent D3 simulation from running when custom layout is active)
    this.customLayoutActive = false;

    // Label visibility control
    this.labelsVisible = false;
    this.minZoomForLabels = 0.5; // Show labels only when zoomed in beyond 0.5x

    // Initialize the network adapter (bridge to @guinetik/network-js)
    this.adapter = new NetworkAdapter({
      features: options.features || ['degree', 'eigenvector'],
      verbose: options.verbose || false
    });

    this.initSvg();
    this.initSimulation();
    this.setupThemeListener();
  }

  /**
   * Setup listener for theme changes
   */
  setupThemeListener() {
    this.themeUnsubscribe = this.theme.onChange(() => {
      this.applyTheme();
    });
  }

  /**
   * Apply current theme to all graph elements
   */
  applyTheme() {
    if (this.nodeGroup) {
      this.theme.applyNodeColors(this.nodeGroup.selectAll('circle'));
    }
    if (this.linkGroup) {
      this.theme.applyLinkColors(this.linkGroup.selectAll('line'));
    }
    if (this.labelGroup) {
      this.theme.applyTextColors(this.labelGroup.selectAll('text'));
    }
  }

  /**
   * Cleanup method to remove listeners
   */
  destroy() {
    if (this.themeUnsubscribe) {
      this.themeUnsubscribe();
    }
    if (this.simulation) {
      this.simulation.stop();
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Hide graph during position calculation
   */
  hideGraphDuringCalculation() {
    this.isCalculating = true;
    this.skipRendering = true;

    // Hide the graph AND disable pointer events
    if (this.g) {
      this.g.style('opacity', 0).style('pointer-events', 'none');
    }

    // Show loading indicator
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'flex';
    }

    console.log('Calculating positions... (no rendering, graph hidden)');
  }

  /**
   * Show graph after positions are calculated
   */
  showGraphAfterCalculation() {
    this.isCalculating = false;
    this.skipRendering = false;

    // Do ONE final render now that positions are settled
    this.updatePositions();

    // Show the graph AND re-enable pointer events
    if (this.g) {
      this.g.style('pointer-events', 'all')
        .transition()
        .duration(500)
        .style('opacity', 1);
    }

    // Hide loading indicator
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
    }

    // Enable labels once simulation settles, but respect zoom level
    // If fitToView will be called (fluid mode + pending), don't show labels yet
    // They'll be shown after fitToView completes and respects the zoomed-out state
    if (!this.pendingFitToView) {
      this.labelsVisible = true;
      this.updateLabelVisibility();
    } else {
      // Labels will be shown later by fitToView callback (if zoom is high enough)
      this.labelsVisible = true; // Set flag, but don't update visibility yet
    }

    console.log('Positions calculated! (rendering enabled, showing graph)');

    // Call completion callback if set
    if (this.onCalculationComplete) {
      this.onCalculationComplete();
    }
  }

  /**
   * Update label visibility based on zoom level and simulation state
   */
  updateLabelVisibility() {
    if (this.labelGroup) {
      // Hide labels if:
      // - Still calculating positions
      // - OR zoomed out too far
      const shouldShow = this.labelsVisible && this.currentZoom >= this.minZoomForLabels;
      this.labelGroup.style("display", shouldShow ? "block" : "none");
    }
  }

  /**
   * Initialize worker for large networks
   */
  initWorker() {
    if (this.worker) {
      this.worker.terminate();
    }

    try {
      this.worker = new Worker(new URL('./d3-force-worker.js', import.meta.url), { type: 'module' });

      this.worker.addEventListener('message', (event) => {
        const { type, positions, alpha } = event.data;

        switch (type) {
          case 'ready':
            console.log('D3 Force Worker ready');
            break;
          case 'tick':
            this.applyWorkerPositions(positions);
            // Don't show graph during ticks - wait for 'end' event
            break;
          case 'end':
            console.log('D3 Force simulation complete');
            this.applyWorkerPositions(positions);

            // Show graph NOW that simulation is truly complete
            if (this.isCalculating) {
              this.showGraphAfterCalculation();
            }

            // Fit to view after showing the graph
            if (this.isFluidMode && this.pendingFitToView) {
              this.pendingFitToView = false;
              setTimeout(() => {
                this.fitToView();
                // Update label visibility after fitToView completes (respects new zoom level)
                setTimeout(() => this.updateLabelVisibility(), 800);
              }, 100);
            }
            break;
          case 'stopped':
            console.log('D3 Force worker stopped');
            break;
          default:
            break;
        }
      });

      this.worker.addEventListener('error', (error) => {
        console.error('D3 Force Worker error:', error);
        // Fallback to main thread simulation
        this.isUsingWorker = false;
        this.initSimulation();
        this.updateGraph();
      });

      this.isUsingWorker = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      this.isUsingWorker = false;
      return false;
    }
  }

  /**
   * Apply positions from worker to nodes
   */
  applyWorkerPositions(positions) {
    const posMap = new Map(positions.map(p => [p.id, p]));

    this.data.nodes.forEach(node => {
      const pos = posMap.get(node.id);
      if (pos) {
        node.x = pos.x;
        node.y = pos.y;
        if (pos.vx !== undefined) node.vx = pos.vx;
        if (pos.vy !== undefined) node.vy = pos.vy;
      }
    });

    // Update visualization
    this.updatePositions();
  }

  /**
   * Check if worker should be used based on network size
   */
  shouldUseWorker() {
    return this.useWorker &&
           typeof Worker !== 'undefined' &&
           this.data.links.length > this.workerThreshold;
  }

  /**
   * Calculate bounding box of all nodes and zoom to fit
   */
  fitToView(padding = 50) {
    if (this.data.nodes.length === 0) return;

    // Check if nodes have valid positions
    const hasValidPositions = this.data.nodes.some(node =>
      node.x !== undefined && node.y !== undefined &&
      !isNaN(node.x) && !isNaN(node.y)
    );

    if (!hasValidPositions) {
      console.warn('Cannot fit to view: nodes do not have valid positions yet');
      return;
    }

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.data.nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined && !isNaN(node.x) && !isNaN(node.y)) {
        if (node.x < minX) minX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.x > maxX) maxX = node.x;
        if (node.y > maxY) maxY = node.y;
      }
    });

    // Safety check for valid bounds
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      console.warn('Cannot fit to view: invalid bounds calculated');
      return;
    }

    // Add padding
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    // Calculate scale to fit
    const scaleX = this.width / graphWidth;
    const scaleY = this.height / graphHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x

    // Calculate translation to center
    const translateX = this.width / 2 - graphCenterX * scale;
    const translateY = this.height / 2 - graphCenterY * scale;

    // Safety check for valid transform
    if (!isFinite(translateX) || !isFinite(translateY) || !isFinite(scale)) {
      console.warn('Cannot fit to view: invalid transform calculated');
      return;
    }

    // Apply transform
    const transform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);

    // Update currentZoom immediately (will be used by updateLabelVisibility)
    this.currentZoom = scale;

    // Get the zoom behavior from initSvg
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
        this.currentZoom = event.transform.k;
      });

    this.svg.transition()
      .duration(750)
      .call(zoom.transform, transform);

    console.log(`Fit to view: bounds=(${minX.toFixed(0)}, ${minY.toFixed(0)}) to (${maxX.toFixed(0)}, ${maxY.toFixed(0)}), scale=${scale.toFixed(2)}`);
  }

  initSvg() {
    this.svg = this.container
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height);

    // Track current zoom level for performance optimizations
    this.currentZoom = 1;

    // Add zoom behavior
    this.g = this.svg.append("g");
    this.svg.call(
      d3
        .zoom()
        .extent([
          [0, 0],
          [this.width, this.height],
        ])
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          this.g.attr("transform", event.transform);
          this.currentZoom = event.transform.k;

          // Update label visibility based on zoom level and simulation state
          this.updateLabelVisibility();
        })
    );

    // Create link and node groups
    this.linkGroup = this.g.append("g").attr("class", "links");
    this.nodeGroup = this.g.append("g").attr("class", "nodes");
    this.labelGroup = this.g.append("g").attr("class", "labels");
  }

  createBoundaryForce() {
    // Keeps nodes from escaping viewport - only applies at actual boundaries
    const padding = 80;

    return () => {
      for (let i = 0, n = this.data.nodes.length; i < n; i++) {
        const node = this.data.nodes[i];

        // Skip fixed nodes
        if (node.fx !== undefined && node.fy !== undefined) continue;

        // Only apply force if node is actually near/past boundaries
        // Don't pull nodes toward center if they're safely inside the viewport
        if (node.x < padding) {
          node.x = padding;
          node.vx = Math.abs(node.vx || 0) * 0.5;
        } else if (node.x > this.width - padding) {
          node.x = this.width - padding;
          node.vx = -Math.abs(node.vx || 0) * 0.5;
        }

        if (node.y < padding) {
          node.y = padding;
          node.vy = Math.abs(node.vy || 0) * 0.5;
        } else if (node.y > this.height - padding) {
          node.y = this.height - padding;
          node.vy = -Math.abs(node.vy || 0) * 0.5;
        }
      }
    };
  }

  initSimulation() {
    // PERFORMANCE: Track if update is scheduled to avoid redundant RAF calls
    this.tickScheduled = false;

    this.simulation = d3
      .forceSimulation()
      .force(
        "link",
        d3
          .forceLink()
          .id((d) => d.id)
          .distance(100)
          .strength(0.5) // Moderate link strength
      )
      .force("charge", d3.forceManyBody().strength(-800).distanceMax(800)) // Strong repulsion to prevent collapse
      .force("center", d3.forceCenter(this.width / 2, this.height / 2).strength(0.05)) // Weak center force (just to keep graph visible)
      .force("x", d3.forceX(this.width / 2).strength(0.03)) // Very weak x-centering
      .force("y", d3.forceY(this.height / 2).strength(0.03)) // Very weak y-centering
      .force("collision", d3.forceCollide().radius(d => 6 + (d.centrality || 0) * 14).strength(0.7)) // Collision detection
      .force("boundary", this.createBoundaryForce())
      .alphaDecay(0.0228) // Default decay - simulation settles in reasonable time
      .velocityDecay(0.4) // Default friction - prevents excessive movement
      .on("tick", () => {
        // Don't show graph during ticks - wait for 'end' event

        // PERFORMANCE: Throttle updates using requestAnimationFrame
        // This ensures we only update once per frame, not multiple times
        if (!this.tickScheduled) {
          this.tickScheduled = true;
          requestAnimationFrame(() => {
            this.updatePositions();
            this.tickScheduled = false;
          });
        }
      })
      .on("end", () => {
        console.log('D3 Force simulation complete (main thread)');
        // Show graph when simulation completes (if still hidden)
        if (this.isCalculating) {
          this.showGraphAfterCalculation();
        }

        // For small/medium networks, fit to view after simulation settles
        // This ensures proper zoom regardless of previous network size
        if (!this.isUsingWorker) {
          setTimeout(() => {
            this.fitToView();
            // Update label visibility after fitToView completes
            setTimeout(() => this.updateLabelVisibility(), 800);
          }, 100);
        }
      });
  }

  /**
   * Use the adapter to enrich nodes with network metrics
   * This replaces the old manual centrality calculation
   * @returns {Promise<Array>} Nodes enriched with centrality and other metrics
   */
  async calculateCentrality() {
    if (this.data.nodes.length === 0) return [];

    // Use the adapter to compute metrics using @guinetik/network-js
    const enrichedData = await this.adapter.setData(this.data.nodes, this.data.links);

    return enrichedData.nodes;
  }

  resolveLinkNodeRefs() {
    // Create a node lookup map by ID - this is crucial for proper link references
    const nodeById = new Map(this.data.nodes.map(n => [n.id, n]));
    
    // Convert string IDs to actual node object references
    this.data.links = this.data.links.map(link => {
      // Handle both string IDs and object references properly
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      // Look up actual node objects
      const sourceNode = nodeById.get(sourceId);
      const targetNode = nodeById.get(targetId);
      
      // Return a new link with proper references
      return {
        source: sourceNode,
        target: targetNode,
        // Preserve any other link properties
        ...Object.keys(link)
          .filter(key => !['source', 'target'].includes(key))
          .reduce((obj, key) => {
            obj[key] = link[key];
            return obj;
          }, {})
      };
    }).filter(link => link.source && link.target); // Filter out any links with missing nodes
  }

  async updateGraph(calculateMetrics = false) {
    // Hide labels during calculation/simulation
    this.labelsVisible = false;
    this.updateLabelVisibility();

    // Hide graph EARLY if we know it will need calculation
    // This prevents any flicker of DOM elements at random positions
    if (this.data.links && this.data.links.length > this.calculationThreshold) {
      this.hideGraphDuringCalculation();
    }

    // Optionally recalculate centrality (skip on initial load, calculate on analysis)
    if (calculateMetrics) {
      const nodesWithCentrality = await this.calculateCentrality();
      this.data.nodes = nodesWithCentrality;
    } else {
      // Just ensure nodes have default centrality for sizing
      this.data.nodes = this.data.nodes.map(n => ({
        ...n,
        centrality: n.centrality || 0.5,  // Default moderate size
        group: n.group || 1  // Default group
      }));
    }

    // Re-resolve references for links to point to actual node objects
    this.resolveLinkNodeRefs();

    // Rebind nodes first to ensure they exist in the DOM
    this.node = this.nodeGroup
      .selectAll("circle")
      .data(this.data.nodes, d => d.id);

    this.node.exit().remove();

    const nodeEnter = this.node
      .enter()
      .append("circle")
      .attr("r", d => 4 + d.centrality * 12)
      .attr("cx", 0)  // Set origin at 0,0 since we're using transform
      .attr("cy", 0)
      .call(this.drag())
      .on("mouseover", (event, d) => {
        this.showNodeInfo(d);
        // Add subtle highlight on hover
        this.theme.applyNodeHover(d3.select(event.currentTarget));
      })
      .on("mouseout", (event, d) => {
        this.hideNodeInfo();
        // Remove highlight unless it's being dragged
        if (!d.isDragging) {
          this.theme.resetNode(d3.select(event.currentTarget));
        }
      })
      .on("dblclick", (event, d) => {
        d.fx = null; // Release fixed X position
        d.fy = null; // Release fixed Y position
        // Only restart simulation if custom layout is not active
        if (!this.customLayoutActive) {
          this.simulation.alpha(0.8).restart(); // Higher alpha for more movement
        }
      });

    // Apply theme colors to newly created nodes
    this.theme.applyNodeColors(nodeEnter);

    // Merge existing and new nodes and update properties
    this.node = nodeEnter.merge(this.node)
      .attr("r", d => 4 + d.centrality * 12);

    // Invalidate cached selections when graph structure changes
    this.cachedNode = null;
    this.cachedLink = null;
    this.cachedLabel = null;

    // Now handle links after nodes are properly set up
    this.link = this.linkGroup
      .selectAll("line")
      .data(this.data.links, d => {
        // Create a stable identifier for each link, handling both object and string references
        const sourceId = d.source.id || d.source;
        const targetId = d.target.id || d.target;
        return `${sourceId}-${targetId}`;
      });

    this.link.exit().remove();

    // Enter new links
    const linkEnter = this.link
      .enter()
      .append("line");

    // Apply theme colors to newly created links
    this.theme.applyLinkColors(linkEnter); // Use default width from theme

    // Merge existing and new links
    this.link = linkEnter.merge(this.link);

    // Update labels
    this.label = this.labelGroup
      .selectAll("text")
      .data(this.data.nodes, d => d.id);

    this.label.exit().remove();

    const labelEnter = this.label
      .enter()
      .append("text")
      .text(d => d.id)
      .attr("font-size", "12px")
      .attr("dx", 15)
      .attr("dy", 4)
      .style("pointer-events", "none");

    // Apply theme colors to labels
    this.theme.applyTextColors(labelEnter);

    this.label = labelEnter.merge(this.label);

    // Decide whether to use worker or main thread simulation
    if (this.shouldUseWorker()) {
      console.log(`Using Web Worker for layout (${this.data.links.length} edges)`);

      // Stop main thread simulation
      if (this.simulation) {
        this.simulation.stop();
      }

      // Determine if we should use fluid mode
      this.isFluidMode = this.data.links.length > this.fluidThreshold;

      // Initialize worker
      if (this.initWorker()) {
        // Send data to worker
        this.worker.postMessage({
          type: 'init',
          data: {
            nodes: this.data.nodes.map(n => ({
              id: n.id,
              x: n.x,
              y: n.y,
              fx: n.fx,
              fy: n.fy,
              centrality: n.centrality || 0
            })),
            links: this.data.links.map(l => ({
              source: typeof l.source === 'object' ? l.source.id : l.source,
              target: typeof l.target === 'object' ? l.target.id : l.target,
              weight: l.weight || 1
            })),
            width: this.width,
            height: this.height,
            options: {
              linkDistance: 100,
              chargeStrength: -500,
              centerStrength: 0.3,
              collisionRadius: 20,
              fluidMode: this.isFluidMode
            }
          }
        });

        console.log(this.isFluidMode ?
          `Fluid mode enabled: network will expand naturally, then zoom to fit` :
          `Constrained mode: network will fit within viewport`
        );

        // Initially place nodes at their positions to prevent jumps
        this.updatePositions();

        // For fluid mode, fit to view once simulation stabilizes
        if (this.isFluidMode) {
          this.pendingFitToView = true;
        }

        return;
      }
    }

    // Fallback to main thread simulation (for smaller networks or if worker fails)
    console.log(`Using main thread for layout (${this.data.links.length} edges)`);
    this.isUsingWorker = false;

    // For small networks, ensure graph is visible immediately
    // (hideGraphDuringCalculation was already called earlier for large networks)
    if (this.data.links.length <= this.calculationThreshold) {
      this.isCalculating = false;
      this.skipRendering = false;
      if (this.g) {
        this.g.style('opacity', 1).style('pointer-events', 'all');
      }

      // For small networks, call completion callback immediately after first render
      // They don't need the full loading experience
      if (this.onCalculationComplete) {
        // Delay slightly to ensure first render completes
        setTimeout(() => {
          if (this.onCalculationComplete) {
            this.onCalculationComplete();
          }
        }, 100);
      }
    }

    // Update the simulation with the new nodes and links
    this.simulation.nodes(this.data.nodes);

    // Check if link force exists (may be null if layout was applied)
    const linkForce = this.simulation.force("link");
    if (linkForce) {
      linkForce.links(this.data.links);
    } else {
      // Recreate link force if it was disabled by layout
      this.simulation.force("link", d3.forceLink(this.data.links).id(d => d.id).distance(100));
    }

    // Reinitialize collision detection
    const collisionForce = this.simulation.force("collision");
    if (collisionForce) {
      collisionForce.initialize(this.data.nodes);
    }

    // Initially place nodes at their positions to prevent jumps
    this.updatePositions();

    // Ensure nodes are centered in the viewport when the graph is first created
    // Only centralize if this is the initial load or we have just a few nodes
    if (this.data.nodes.length <= 3) {
      this.centralizeNodes();
    }

    // Warm up the simulation with higher energy
    // BUT only if a custom layout is NOT active
    if (!this.customLayoutActive) {
      this.simulation.alpha(0.8).restart();
    }
  }

  updatePositions() {
    // Skip DOM rendering entirely during position calculation
    // Positions are still being updated in the simulation, but we don't touch the DOM
    if (this.skipRendering) {
      return;
    }

    // Apply boundary constraints only in non-fluid mode
    if (!this.isFluidMode) {
      const padding = 50;
      this.data.nodes.forEach(node => {
        if (!node.fx) {
          node.x = Math.max(padding, Math.min(this.width - padding, node.x));
        }
        if (!node.fy) {
          node.y = Math.max(padding, Math.min(this.height - padding, node.y));
        }
      });
    }

    // PERFORMANCE: Cache selections to avoid repeated DOM queries
    // Use cached selections if available, otherwise select and cache
    if (!this.cachedLink || this.cachedLink.size() !== this.data.links.length) {
      this.cachedLink = this.linkGroup.selectAll("line");
    }
    if (!this.cachedNode || this.cachedNode.size() !== this.data.nodes.length) {
      this.cachedNode = this.nodeGroup.selectAll("circle");
    }
    if (!this.cachedLabel || this.cachedLabel.size() !== this.data.nodes.length) {
      this.cachedLabel = this.labelGroup.selectAll("text");
    }

    // PERFORMANCE: Use transform for nodes instead of cx/cy (faster GPU acceleration)
    this.cachedNode.attr("transform", d => `translate(${d.x},${d.y})`);

    // Update link positions - safely handle potentially broken references
    this.cachedLink
      .attr("x1", d => (d.source && d.source.x) || 0)
      .attr("y1", d => (d.source && d.source.y) || 0)
      .attr("x2", d => (d.target && d.target.x) || 0)
      .attr("y2", d => (d.target && d.target.y) || 0);

    // PERFORMANCE: Only update labels if they're visible (zoom >= 0.5x)
    if (this.currentZoom >= 0.5) {
      this.cachedLabel
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    }
  }

  drag() {
    return d3
      .drag()
      .on("start", (event, d) => {
        // Store the initial position for reference
        d.fx = d.x;
        d.fy = d.y;

        // Handle worker vs main thread
        if (this.isUsingWorker && this.worker) {
          this.worker.postMessage({
            type: 'updateNode',
            data: { nodeId: d.id, x: d.x, y: d.y, fx: d.fx, fy: d.fy }
          });
        }
        // For main thread: DON'T restart simulation at all
        // Just let the user drag the node manually without waking up the whole graph

        // Highlight this node and its direct connections
        this.highlightConnections(d);
      })
      .on("drag", (event, d) => {
        // Update position during drag
        d.fx = event.x;
        d.fy = event.y;

        // Handle worker vs main thread
        if (this.isUsingWorker && this.worker) {
          this.worker.postMessage({
            type: 'updateNode',
            data: { nodeId: d.id, x: event.x, y: event.y, fx: event.x, fy: event.y }
          });
        }
        // For main thread: don't touch the simulation
        // The user is just repositioning this one node

        // Manually update position for immediate feedback
        d.x = event.x;
        d.y = event.y;
        this.updatePositions();

        // Update the highlighting as node moves
        this.highlightConnections(d);
      })
      .on("end", (event, d) => {
        // Node stays fixed where the user placed it
        // d.fx and d.fy are already set

        // Handle worker vs main thread
        if (this.isUsingWorker && this.worker) {
          // Keep node fixed after drag in worker mode
        } else if (this.simulation) {
          // Don't need to do anything - simulation was never woken up
          // If user wants to "settle" the graph after repositioning nodes,
          // they can use a layout algorithm
        }

        // Remove any highlighting
        this.removeHighlights();
      });
  }
  
  highlightConnections(node) {
    // Get all connected nodes
    const connectedNodeIds = new Set();
    
    this.data.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === node.id) {
        connectedNodeIds.add(targetId);
      } else if (targetId === node.id) {
        connectedNodeIds.add(sourceId);
      }
    });
    
    // Highlight nodes using theme
    this.nodeGroup.selectAll("circle").each((d, i, nodes) => {
      const selection = d3.select(nodes[i]);
      if (d.id === node.id) {
        // Dragged node
        this.theme.applyNodeDragging(selection);
      } else if (connectedNodeIds.has(d.id)) {
        // Connected nodes
        this.theme.applyNodeConnected(selection);
      } else {
        // Other nodes - dim them
        this.theme.resetNode(selection);
        selection.attr("stroke-width", 1);
      }
    });

    // Highlight links using theme
    this.linkGroup.selectAll("line").each((link, i, lines) => {
      const selection = d3.select(lines[i]);
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (sourceId === node.id || targetId === node.id) {
        // Connected links
        this.theme.applyLinkHighlight(selection);
      } else {
        // Other links - dim them
        this.theme.resetLink(selection);
        selection.attr("stroke-opacity", 0.4);
      }
    });
  }
  
  removeHighlights() {
    // Reset node styling using theme
    this.theme.resetNode(this.nodeGroup.selectAll("circle"));

    // Reset link styling using theme
    this.theme.resetLink(this.linkGroup.selectAll("line"));
  }

  showNodeInfo(node) {
    if (this.nodeInfoCallback) {
      // Use custom callback if provided
      this.nodeInfoCallback(node);
    } else {
      // Default display
      const nodeInfoEl = document.getElementById("node-info");
      if (nodeInfoEl) {
        nodeInfoEl.innerHTML = `
                <strong>${node.id}</strong> (Group: ${node.group})<br>
                Centrality: ${node.centrality.toFixed(4)}
            `;
      }
    }
  }

  hideNodeInfo() {
    if (this.nodeInfoHideCallback) {
      // Use custom hide callback if provided
      this.nodeInfoHideCallback();
    } else {
      // Default behavior - clear the element
      const nodeInfoEl = document.getElementById("node-info");
      if (nodeInfoEl) {
        nodeInfoEl.innerHTML = "";
      }
    }
  }

  // Public API methods

  setData(nodes, links) {
    this.data.nodes = nodes.map((node) => {
      // Set initial positions if not provided
      const newNode = { ...node };
      if (newNode.x === undefined && newNode.y === undefined) {
        // Position near center with some randomness
        newNode.x = this.width / 2 + (Math.random() - 0.5) * 100;
        newNode.y = this.height / 2 + (Math.random() - 0.5) * 100;
      }
      return newNode;
    });
    
    this.data.links = links.map((link) => ({ ...link }));

    // Find the highest group number
    this.data.nodes.forEach((node) => {
      this.groups[node.group] = true;
      if (typeof node.id === "number" && node.id >= this.nextId) {
        this.nextId = node.id + 1;
      }
    });

    // Centralize the graph nodes in the viewport
    this.centralizeNodes();

    this.updateGraph();
    return this;
  }

  centralizeNodes() {
    if (!this.data.nodes.length) return;

    // Find current bounds of nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    this.data.nodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.x > maxX) maxX = node.x;
      if (node.y > maxY) maxY = node.y;
    });
    
    // Calculate center of current nodes
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate translation needed to center in viewport
    const targetX = this.width / 2;
    const targetY = this.height / 2;
    const deltaX = targetX - centerX;
    const deltaY = targetY - centerY;
    
    // Apply translation to all nodes
    this.data.nodes.forEach(node => {
      node.x += deltaX;
      node.y += deltaY;
      
      // If the node has fixed position, update it too
      if (node.fx !== undefined && node.fx !== null) {
        node.fx += deltaX;
      }
      if (node.fy !== undefined && node.fy !== null) {
        node.fy += deltaY;
      }
    });
  }

  addNode(neighborIds = [], id = null, group = null) {
    // Use provided group or generate one
    const nodeGroup = group !== null ? group : (
      // Generate a new group or use existing ones
      (() => {
        const groupKeys = Object.keys(this.groups);
        return groupKeys.length > 0
          ? Math.floor(Math.random() * groupKeys.length) + 1
          : 1;
      })()
    );
    
    // Default position (center) in case there are no connections
    let posX = this.width / 2;
    let posY = this.height / 2;
    
    // Create a node lookup map to use for adding links properly
    const nodeById = new Map(this.data.nodes.map(n => [n.id, n]));
    
    // Find the neighbor nodes by ID
    const neighborNodes = [];
    for (const neighborId of neighborIds) {
      const node = nodeById.get(neighborId);
      if (node) {
        neighborNodes.push(node);
      }
    }
    
    // Calculate position based on neighbor positions if we have neighbors
    if (neighborNodes.length > 0) {
      // Average position of neighbors with a small random offset
      posX = neighborNodes.reduce((sum, node) => sum + node.x, 0) / neighborNodes.length;
      posY = neighborNodes.reduce((sum, node) => sum + node.y, 0) / neighborNodes.length;
      
      // Add small random offset (50-100px) to avoid direct overlap
      const offset = 50 + Math.random() * 50;
      const angle = Math.random() * 2 * Math.PI; // Random direction
      posX += Math.cos(angle) * offset;
      posY += Math.sin(angle) * offset;
      
      // Apply boundary constraints
      const padding = 50;
      posX = Math.max(padding, Math.min(this.width - padding, posX));
      posY = Math.max(padding, Math.min(this.height - padding, posY));
    }
    
    // Mark this group as used
    this.groups[nodeGroup] = true;
    
    // Create the new node at the calculated position
    const newNode = {
      id: id || `Node${this.nextId++}`,
      group: nodeGroup,
      x: posX,
      y: posY,
      // Initially fix the position to prevent immediate drift
      fx: posX,
      fy: posY,
    };

    this.data.nodes.push(newNode);

    // Create the connections to the neighbor nodes
    for (const neighbor of neighborNodes) {
      this.data.links.push({
        source: newNode,
        target: neighbor
      });
    }

    // Update the graph with the new data
    this.updateGraph();
    
    // Release the fixed position after a short delay
    setTimeout(() => {
      if (this.data.nodes.find(n => n.id === newNode.id)) {
        const node = this.data.nodes.find(n => n.id === newNode.id);
        node.fx = null;
        node.fy = null;
        // Gently restart simulation (only if custom layout is not active)
        if (!this.customLayoutActive) {
          this.simulation.alpha(0.2).restart();
        }

        // Then cool it down
        //setTimeout(() => this.coolDownSimulation(), 1000);
      }
    }, 1500);
    
    return newNode;
  }

  removeNode(nodeId) {
    // If nodeId is not provided, remove a random node
    const idToRemove =
      nodeId ||
      this.data.nodes[Math.floor(Math.random() * this.data.nodes.length)]?.id;

    if (!idToRemove) return null;

    // Find the node to be removed
    const nodeToRemove = this.data.nodes.find(node => node.id === idToRemove);
    if (!nodeToRemove) return null;

    // Remove the node
    this.data.nodes = this.data.nodes.filter(node => node.id !== idToRemove);

    // Remove any links connected to this node
    // Check both source and target against the node object and ID
    this.data.links = this.data.links.filter(link => {
      const sourceIsRemoved = 
        link.source === nodeToRemove || 
        (link.source && link.source.id === idToRemove);
      
      const targetIsRemoved = 
        link.target === nodeToRemove || 
        (link.target && link.target.id === idToRemove);
      
      return !sourceIsRemoved && !targetIsRemoved;
    });

    // Update the graph to reflect changes
    this.updateGraph();
    return idToRemove;
  }

  addLink(sourceId, targetId) {
    if (!sourceId || !targetId) return false;

    // Check if nodes exist
    const sourceExists = this.data.nodes.some((node) => node.id === sourceId);
    const targetExists = this.data.nodes.some((node) => node.id === targetId);

    if (!sourceExists || !targetExists) return false;

    // Check if link already exists
    const linkExists = this.data.links.some(
      (link) =>
        ((link.source.id || link.source) === sourceId &&
          (link.target.id || link.target) === targetId) ||
        ((link.source.id || link.source) === targetId &&
          (link.target.id || link.target) === sourceId)
    );

    if (linkExists) return false;

    // Add new link
    this.data.links.push({
      source: sourceId,
      target: targetId,
    });

    this.updateGraph();
    return true;
  }

  removeLink(sourceId, targetId) {
    const initialLength = this.data.links.length;

    this.data.links = this.data.links.filter(
      (link) =>
        !(
          (link.source.id || link.source) === sourceId &&
          (link.target.id || link.target) === targetId
        ) &&
        !(
          (link.source.id || link.source) === targetId &&
          (link.target.id || link.target) === sourceId
        )
    );

    if (initialLength !== this.data.links.length) {
      this.updateGraph();
      return true;
    }

    return false;
  }

  // Add a method to cool down the simulation
  coolDownSimulation() {
    // Only cool down if custom layout is not active
    if (this.customLayoutActive) return;

    // Gradually reduce alpha to calm the simulation
    this.simulation.alpha(0.1);
    this.simulation.alphaTarget(0).restart();
    
    // Apply central force to all nodes to ensure they stay contained
    this.data.nodes.forEach(node => {
      if (!node.fx && !node.fy) { // Only affect unfixed nodes
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If node is far from center, apply gentle force toward center
        if (distance > Math.min(this.width, this.height) * 0.3) {
          const scale = 0.03; // Gentle push
          node.vx = (node.vx || 0) + dx * scale;
          node.vy = (node.vy || 0) + dy * scale;
        }
        
        // Apply light dampening to velocities to reduce oscillation
        if (node.vx) node.vx *= 0.9;
        if (node.vy) node.vy *= 0.9;
      }
    });
  }

  // Helper method to get all node IDs
  getNodeIds() {
    return this.data.nodes.map(node => node.id);
  }

  // Helper method to check if a node exists
  hasNode(nodeId) {
    return this.data.nodes.some(node => node.id === nodeId);
  }

  // Reset all fixed positions (unlock the graph) and restart simulation
  unlockPositions() {
    // Clear all fixed positions
    this.data.nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });

    // Centralize the nodes
    this.centralizeNodes();

    // Restart the simulation with high energy (only if custom layout is not active)
    if (!this.customLayoutActive) {
      this.simulation.alpha(1.0).restart();
    }
  }
  
  // Fix all nodes at their current positions (lock the graph)
  lockPositions() {
    // Set fixed positions to current positions
    this.data.nodes.forEach(node => {
      node.fx = node.x;
      node.fy = node.y;
    });
    
    // Cool down the simulation to stop movement
    this.simulation.alpha(0).alphaTarget(0);
  }

  // Allow setting a custom node info callback
  set setNodeInfoCallback(callback) {
    this.nodeInfoCallback = callback;
  }

  // Allow setting a custom node info hide callback
  set setNodeInfoHideCallback(callback) {
    this.nodeInfoHideCallback = callback;
  }
}
