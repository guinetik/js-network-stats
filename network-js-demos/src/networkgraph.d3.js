export default class NetworkGraph {
  constructor(containerId, width, height) {
    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    this.container = d3.select(containerId || "body");

    this.data = {
      nodes: [],
      links: [],
    };

    this.nodeColors = d3.scaleOrdinal(d3.schemeCategory10);
    this.nextId = 1;
    this.groups = {};
    this.nodeInfoCallback = null;

    this.initSvg();
    this.initSimulation();
  }

  initSvg() {
    this.svg = this.container
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height);

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
        })
    );

    // Create link and node groups
    this.linkGroup = this.g.append("g").attr("class", "links");
    this.nodeGroup = this.g.append("g").attr("class", "nodes");
    this.labelGroup = this.g.append("g").attr("class", "labels");
  }

  createBoundaryForce() {
    // Creates a stronger custom force to keep nodes within the visible area
    return () => {
      const padding = 80; // Larger padding from the edges
      for (let node of this.data.nodes) {
        // Apply boundary force to all nodes, but stronger for those without fixed positions
        const strength = !node.fx && !node.fy ? 0.3 : 0.05;
        
        // Calculate distance from center
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If node is too close to any edge or too far from center, apply force
        const maxDistance = Math.min(this.width, this.height) * 0.4; // 40% of smaller dimension
        
        if (node.x < padding || 
            node.x > this.width - padding || 
            node.y < padding || 
            node.y > this.height - padding ||
            distance > maxDistance) {
          
          // Calculate direction to center
          const scale = 0.1 * strength; // Scale the force based on strength
          node.vx = (node.vx || 0) + dx * scale;
          node.vy = (node.vy || 0) + dy * scale;
          
          // Apply minimum bounds
          if (node.x < padding) {
            node.x = padding;
            node.vx = Math.abs(node.vx || 0) * 0.5; // Bounce back with reduced velocity
          } 
          if (node.x > this.width - padding) {
            node.x = this.width - padding;
            node.vx = -Math.abs(node.vx || 0) * 0.5;
          }
          
          if (node.y < padding) {
            node.y = padding;
            node.vy = Math.abs(node.vy || 0) * 0.5;
          }
          if (node.y > this.height - padding) {
            node.y = this.height - padding;
            node.vy = -Math.abs(node.vy || 0) * 0.5;
          }
        }
      }
    };
  }

  initSimulation() {
    this.simulation = d3
      .forceSimulation()
      .force(
        "link",
        d3
          .forceLink()
          .id((d) => d.id)
          .distance(100)
          .strength(0.8) // Stronger links for better structural integrity
      )
      .force("charge", d3.forceManyBody().strength(-500).distanceMax(800)) // Stronger repulsion for better spacing
      .force("center", d3.forceCenter(this.width / 2, this.height / 2).strength(0.3)) // Stronger center force
      .force("x", d3.forceX(this.width / 2).strength(0.1)) // Stronger x-centering
      .force("y", d3.forceY(this.height / 2).strength(0.1)) // Stronger y-centering
      .force("collision", d3.forceCollide().radius(d => 20 + d.centrality * 50).strength(0.9)) // Stronger collision detection
      .force("boundary", this.createBoundaryForce())
      .alphaDecay(0.01) // Very slow decay for more persistent movement
      .velocityDecay(0.3) // Less friction for more natural physics
      .on("tick", () => this.updatePositions());
  }

  calculateCentrality() {
    const N = this.data.nodes.length;
    if (N === 0) return [];

    const adjacencyMatrix = Array(N)
      .fill()
      .map(() => Array(N).fill(0));
    const nodeIndices = {};

    this.data.nodes.forEach((node, i) => {
      nodeIndices[node.id] = i;
    });

    this.data.links.forEach((link) => {
      const i = nodeIndices[link.source.id || link.source];
      const j = nodeIndices[link.target.id || link.target];
      if (i !== undefined && j !== undefined) {
        adjacencyMatrix[i][j] = 1;
        adjacencyMatrix[j][i] = 1;
      }
    });

    // Power iteration for eigenvector centrality
    let centralityVector = Array(N).fill(1 / N);
    for (let iter = 0; iter < 50; iter++) {
      const newVector = Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          newVector[i] += adjacencyMatrix[i][j] * centralityVector[j];
        }
      }
      const norm = Math.sqrt(
        newVector.reduce((sum, val) => sum + val * val, 0)
      );
      centralityVector = newVector.map((val) => (norm ? val / norm : 0));
    }

    return this.data.nodes.map((node, i) => ({
      ...node,
      centrality: centralityVector[i] || 0.1,
    }));
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

  updateGraph() {
    // Recalculate centrality
    const nodesWithCentrality = this.calculateCentrality();
    this.data.nodes = nodesWithCentrality;

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
      .attr("r", d => 10 + d.centrality * 30)
      .attr("fill", d => this.nodeColors(d.group))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .call(this.drag())
      .on("mouseover", (event, d) => {
        this.showNodeInfo(d);
        // Add subtle highlight on hover
        d3.select(event.currentTarget)
          .attr("stroke", "#ff9800")
          .attr("stroke-width", 3);
      })
      .on("mouseout", (event, d) => {
        this.hideNodeInfo();
        // Remove highlight unless it's being dragged
        if (!d.isDragging) {
          d3.select(event.currentTarget)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);
        }
      })
      .on("dblclick", (event, d) => {
        d.fx = null; // Release fixed X position
        d.fy = null; // Release fixed Y position
        this.simulation.alpha(0.8).restart(); // Higher alpha for more movement
      });

    // Merge existing and new nodes and update properties
    this.node = nodeEnter.merge(this.node)
      .attr("r", d => 10 + d.centrality * 30);

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
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Merge existing and new links
    this.link = linkEnter.merge(this.link);

    // Update labels
    this.label = this.labelGroup
      .selectAll("text")
      .data(this.data.nodes, d => d.id);

    this.label.exit().remove();

    this.label
      .enter()
      .append("text")
      .text(d => d.id)
      .attr("font-size", "12px")
      .attr("dx", 15)
      .attr("dy", 4)
      .attr("fill", "#333")
      .style("pointer-events", "none")
      .merge(this.label);

    // Update the simulation with the new nodes and links
    this.simulation.nodes(this.data.nodes);
    this.simulation.force("link").links(this.data.links);
    this.simulation.force("collision").initialize(this.data.nodes); // Reinitialize collision detection
    
    // Initially place nodes at their positions to prevent jumps
    this.updatePositions();
    
    // Ensure nodes are centered in the viewport when the graph is first created
    // Only centralize if this is the initial load or we have just a few nodes
    if (this.data.nodes.length <= 3) {
      this.centralizeNodes();
    }
    
    // Warm up the simulation with higher energy
    this.simulation.alpha(0.8).restart();
  }

  updatePositions() {
    // Apply boundary constraints to ensure nodes stay within viewport
    const padding = 50;
    this.data.nodes.forEach(node => {
      if (!node.fx) {
        node.x = Math.max(padding, Math.min(this.width - padding, node.x));
      }
      if (!node.fy) {
        node.y = Math.max(padding, Math.min(this.height - padding, node.y));
      }
    });
    
    // Update link positions - safely handle potentially broken references
    this.linkGroup
      .selectAll("line")
      .attr("x1", d => (d.source && d.source.x) || 0)
      .attr("y1", d => (d.source && d.source.y) || 0)
      .attr("x2", d => (d.target && d.target.x) || 0)
      .attr("y2", d => (d.target && d.target.y) || 0);

    // Update node positions
    this.nodeGroup
      .selectAll("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    // Update label positions
    this.labelGroup
      .selectAll("text")
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  }

  drag() {
    return d3
      .drag()
      .on("start", (event, d) => {
        // When drag starts, add energy to the simulation
        this.simulation.alphaTarget(0.5).restart();
        
        // Store the initial position for reference
        d.fx = d.x;
        d.fy = d.y;
        
        // Highlight this node and its direct connections
        this.highlightConnections(d);
      })
      .on("drag", (event, d) => {
        // Update position during drag
        d.fx = event.x;
        d.fy = event.y;
        
        // Add more energy during drag to keep simulation active
        this.simulation.alpha(0.5);
        
        // Update the highlighting as node moves
        this.highlightConnections(d);
      })
      .on("end", (event, d) => {
        // Optional: uncomment to release node after dragging
        // d.fx = null;
        // d.fy = null;
        
        // Gradually cool down the simulation
        this.simulation.alphaTarget(0.5);
        setTimeout(() => {
          this.simulation.alphaTarget(0);
        }, 1000);
        
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
    
    // Highlight nodes
    this.nodeGroup.selectAll("circle")
      .attr("stroke-width", d => {
        if (d.id === node.id) return 4; // Thicker stroke for the dragged node
        if (connectedNodeIds.has(d.id)) return 3; // Medium stroke for connected nodes
        return 1.5; // Normal stroke for other nodes
      })
      .attr("stroke", d => {
        if (d.id === node.id) return "#ff5722"; // Orange for dragged node
        if (connectedNodeIds.has(d.id)) return "#2196f3"; // Blue for connected nodes
        return "#fff"; // White for other nodes
      });
      
    // Highlight links
    this.linkGroup.selectAll("line")
      .attr("stroke-width", link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === node.id || targetId === node.id) {
          return 3; // Thicker for connected links
        }
        return 1.5; // Normal for other links
      })
      .attr("stroke-opacity", link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === node.id || targetId === node.id) {
          return 1.0; // Fully opaque for connected links
        }
        return 0.4; // Semi-transparent for other links
      })
      .attr("stroke", link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === node.id || targetId === node.id) {
          return "#2196f3"; // Blue for connected links
        }
        return "#999"; // Gray for other links
      });
  }
  
  removeHighlights() {
    // Reset node styling
    this.nodeGroup.selectAll("circle")
      .attr("stroke-width", 2)
      .attr("stroke", "#fff");
      
    // Reset link styling
    this.linkGroup.selectAll("line")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6)
      .attr("stroke", "#999");
  }

  showNodeInfo(node) {
    if (this.nodeInfoCallback) {
      // Use custom callback if provided
      this.nodeInfoCallback(node);
    } else {
      // Default display
      document.getElementById("node-info").innerHTML = `
              <strong>${node.id}</strong> (Group: ${node.group})<br>
              Centrality: ${node.centrality.toFixed(4)}
          `;
    }
  }

  hideNodeInfo() {
    document.getElementById("node-info").innerHTML = "";
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
        // Gently restart simulation
        this.simulation.alpha(0.2).restart();
        
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
    
    // Restart the simulation with high energy
    this.simulation.alpha(1.0).restart();
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
}
