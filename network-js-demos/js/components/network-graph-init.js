import * as d3 from 'd3';
import NetworkGraph from '../../src/networkgraph.d3.js';
import { createNetworkGraphApp } from '../network-graph.js';

/**
 * Initialize the network-graph component
 * This function is called by Alpine's x-data when the template is loaded
 */
export function initNetworkGraphComponent() {
  // Initial data for the network graph
  const initialData = {
    nodes: [
      { id: 'Alice', group: 1 },
      { id: 'Bob', group: 1 },
      { id: 'Charlie', group: 2 },
      { id: 'David', group: 2 },
      { id: 'Eve', group: 3 },
      { id: 'Frank', group: 3 },
      { id: 'Grace', group: 1 },
      { id: 'Henry', group: 2 },
      { id: 'Isabel', group: 4 },
      { id: 'John', group: 4 },
      { id: 'Kate', group: 5 },
      { id: 'Luke', group: 5 },
      { id: 'Mary', group: 6 },
      { id: 'Nick', group: 6 },
      { id: 'Oliver', group: 7 }
    ],
    links: [
      { source: 'Alice', target: 'Bob' },
      { source: 'Alice', target: 'Charlie' },
      { source: 'Bob', target: 'Charlie' },
      { source: 'Charlie', target: 'David' },
      { source: 'Eve', target: 'Frank' },
      { source: 'Eve', target: 'Alice' },
      { source: 'Grace', target: 'Alice' },
      { source: 'Henry', target: 'Bob' },
      { source: 'Henry', target: 'Eve' },
      { source: 'Isabel', target: 'John' },
      { source: 'Isabel', target: 'Kate' },
      { source: 'John', target: 'Luke' },
      { source: 'Kate', target: 'Mary' },
      { source: 'Luke', target: 'Nick' },
      { source: 'Mary', target: 'Oliver' },
      { source: 'Nick', target: 'Oliver' },
      { source: 'Oliver', target: 'Alice' },
      { source: 'Frank', target: 'Mary' },
      { source: 'David', target: 'Isabel' },
      { source: 'Grace', target: 'Kate' }
    ]
  };

  // Return a factory that will be called by Alpine
  // This allows us to defer initialization until the DOM is ready
  return {
    graph: null,
    containerElement: null,
    initialData: initialData,
    _initialized: false,

    // Override init - don't auto-initialize since template will trigger it
    init() {
      console.log('network-graph component init called (waiting for template to load)');
      // Template will call initializeGraph() via x-init when HTML is loaded
    },

    initializeGraph() {
      if (this._initialized) {
        console.log('Already initialized, skipping...');
        return;
      }

      // Get container dimensions
      const container = document.getElementById('network-graph-container');
      if (!container) {
        console.error('Container #network-graph-container not found');
        return;
      }

      console.log('Container found, dimensions:', container.clientWidth, 'x', container.clientHeight);

      const width = container.clientWidth;
      const height = container.clientHeight;

      // Make D3 available globally for NetworkGraph if not already
      if (!window.d3) {
        window.d3 = d3;
      }

      // Store container reference
      this.containerElement = container;

      // Initialize the network graph
      this.graph = new NetworkGraph('#network-graph-container', width, height);
      this.graph.setData(this.initialData.nodes, this.initialData.links);

      console.log('Network graph initialized successfully');

      // Create the component with proper references
      const component = createNetworkGraphApp(this.graph, this.initialData, this.containerElement);

      // Copy ALL properties from component to this (they all have correct references now)
      // This will overwrite our null placeholders with the real values
      for (const key in component) {
        if (key !== 'init') {  // Skip only init since we'll call it separately
          this[key] = component[key];
        }
      }

      console.log('After copying properties:', {
        hasGraph: !!this.graph,
        hasContainer: !!this.containerElement,
        containerDimensions: this.containerElement ? `${this.containerElement.clientWidth}x${this.containerElement.clientHeight}` : 'null'
      });

      // Now call the component's init to set up event listeners
      // Important: call it AFTER copying properties so this has all the right values
      if (component.init) {
        component.init.call(this);
      }

      console.log('Component initialization complete!');
      this._initialized = true;
    }
  };
}
