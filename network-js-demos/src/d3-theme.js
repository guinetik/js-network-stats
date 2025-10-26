import * as d3 from 'd3';

/**
 * D3Theme - Centralized dark mode and color management for D3 visualizations
 *
 * Provides:
 * - Dark mode detection and tracking
 * - Color schemes for light/dark modes
 * - Methods to apply theme colors to D3 selections
 * - Event handling for theme changes
 *
 * @example
 * import { d3Theme } from './d3-theme.js';
 *
 * // Apply theme to nodes
 * d3Theme.applyNodeColors(nodeSelection);
 *
 * // Listen for theme changes
 * d3Theme.onChange(() => {
 *   d3Theme.applyAll(container);
 * });
 */
export class D3Theme {
  constructor() {
    this.isDark = this._detectDarkMode();
    this.listeners = new Set();

    // Define color schemes
    this.colors = {
      light: {
        // Node colors
        nodeScheme: d3.schemeCategory10,
        nodeStroke: '#ffffff',
        nodeStrokeHover: '#ff9800',
        nodeStrokeDragging: '#ff5722',
        nodeStrokeConnected: '#2196f3',

        // Link colors
        linkStroke: '#6b7280',
        linkStrokeOpacity: 0.6,
        linkStrokeHighlight: '#2196f3',

        // Text colors
        textFill: '#1f2937',

        // Background
        background: 'transparent'
      },
      dark: {
        // Node colors (slightly adjusted for dark mode)
        nodeScheme: d3.schemeCategory10,
        nodeStroke: '#1f2937',
        nodeStrokeHover: '#ffb74d',
        nodeStrokeDragging: '#ff7043',
        nodeStrokeConnected: '#42a5f5',

        // Link colors
        linkStroke: '#9ca3af',
        linkStrokeOpacity: 0.8,
        linkStrokeHighlight: '#42a5f5',

        // Text colors
        textFill: '#e5e7eb',

        // Background
        background: 'transparent'
      }
    };

    // Create D3 color scale
    this._updateColorScale();

    // Setup listeners
    this._setupListeners();
  }

  /**
   * Detect if dark mode is currently active
   */
  _detectDarkMode() {
    // Check localStorage first
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      return stored === 'true';
    }

    // Check document class
    if (document.documentElement.classList.contains('dark')) {
      return true;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }

    return false;
  }

  /**
   * Update the D3 color scale based on current theme
   */
  _updateColorScale() {
    const scheme = this.currentColors.nodeScheme;
    this.nodeColorScale = d3.scaleOrdinal(scheme);
  }

  /**
   * Setup event listeners for dark mode changes
   */
  _setupListeners() {
    // Listen for localStorage changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'darkMode') {
        this.setDarkMode(e.newValue === 'true');
      }
    });

    // Listen for postMessage (iframe support)
    window.addEventListener('message', (e) => {
      if (e.data.type === 'darkModeChange') {
        this.setDarkMode(e.data.darkMode);
      }
    });

    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only update if localStorage doesn't have a preference
        if (localStorage.getItem('darkMode') === null) {
          this.setDarkMode(e.matches);
        }
      });
    }
  }

  /**
   * Get current color scheme
   */
  get currentColors() {
    return this.isDark ? this.colors.dark : this.colors.light;
  }

  /**
   * Set dark mode state and notify listeners
   */
  setDarkMode(isDark) {
    if (this.isDark === isDark) return;

    this.isDark = isDark;
    this._updateColorScale();

    // Update document class
    document.documentElement.classList.toggle('dark', isDark);

    // Notify listeners
    this.listeners.forEach(listener => listener(isDark));
  }

  /**
   * Register a callback for theme changes
   * @param {Function} callback - Called with isDark boolean when theme changes
   * @returns {Function} Unsubscribe function
   */
  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get color for a node based on its group
   */
  getNodeColor(group) {
    return this.nodeColorScale(group);
  }

  /**
   * Apply theme colors to node circles
   * @param {d3.Selection} selection - D3 selection of node circles
   * @param {Object} options - Optional overrides
   */
  applyNodeColors(selection, options = {}) {
    const colors = this.currentColors;

    selection
      .attr('fill', d => options.fill || this.getNodeColor(d.group))
      .attr('stroke', options.stroke || colors.nodeStroke)
      .attr('stroke-width', options.strokeWidth || 2);

    return selection;
  }

  /**
   * Apply theme colors to links
   * @param {d3.Selection} selection - D3 selection of links
   * @param {Object} options - Optional overrides
   */
  applyLinkColors(selection, options = {}) {
    const colors = this.currentColors;

    selection
      .attr('stroke', options.stroke || colors.linkStroke)
      .attr('stroke-opacity', options.opacity ?? colors.linkStrokeOpacity)
      .attr('stroke-width', options.width || 1.5);

    return selection;
  }

  /**
   * Apply theme colors to text labels
   * @param {d3.Selection} selection - D3 selection of text elements
   * @param {Object} options - Optional overrides
   */
  applyTextColors(selection, options = {}) {
    const colors = this.currentColors;

    selection
      .attr('fill', options.fill || colors.textFill);

    return selection;
  }

  /**
   * Apply hover state colors to a node
   */
  applyNodeHover(selection) {
    const colors = this.currentColors;

    selection
      .attr('stroke', colors.nodeStrokeHover)
      .attr('stroke-width', 3);

    return selection;
  }

  /**
   * Apply dragging state colors to a node
   */
  applyNodeDragging(selection) {
    const colors = this.currentColors;

    selection
      .attr('stroke', colors.nodeStrokeDragging)
      .attr('stroke-width', 4);

    return selection;
  }

  /**
   * Apply connected state colors to a node
   */
  applyNodeConnected(selection) {
    const colors = this.currentColors;

    selection
      .attr('stroke', colors.nodeStrokeConnected)
      .attr('stroke-width', 3);

    return selection;
  }

  /**
   * Apply highlight colors to a link
   */
  applyLinkHighlight(selection) {
    const colors = this.currentColors;

    selection
      .attr('stroke', colors.linkStrokeHighlight)
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 1);

    return selection;
  }

  /**
   * Reset node to default colors
   */
  resetNode(selection) {
    return this.applyNodeColors(selection);
  }

  /**
   * Reset link to default colors
   */
  resetLink(selection) {
    return this.applyLinkColors(selection);
  }

  /**
   * Apply theme to all common D3 elements in a container
   * @param {string|HTMLElement} container - Container selector or element
   */
  applyAll(container) {
    const containerSelection = typeof container === 'string'
      ? d3.select(container)
      : d3.select(container);

    // Apply to nodes
    const nodes = containerSelection.selectAll('circle');
    if (!nodes.empty()) {
      this.applyNodeColors(nodes);
    }

    // Apply to links
    const links = containerSelection.selectAll('line');
    if (!links.empty()) {
      this.applyLinkColors(links);
    }

    // Apply to text
    const text = containerSelection.selectAll('text');
    if (!text.empty()) {
      this.applyTextColors(text);
    }
  }

  /**
   * Create a new color scale with custom scheme
   * @param {Array} scheme - D3 color scheme array
   * @returns {Function} D3 ordinal scale
   */
  createColorScale(scheme) {
    return d3.scaleOrdinal(scheme || this.currentColors.nodeScheme);
  }

  /**
   * Get a specific color value from current theme
   * @param {string} path - Dot-notation path to color (e.g., 'nodeStroke', 'linkStroke')
   * @returns {string} Color value
   */
  getColor(path) {
    return this.currentColors[path];
  }

  /**
   * Check if dark mode is active
   */
  get isDarkMode() {
    return this.isDark;
  }

  /**
   * Toggle dark mode
   */
  toggle() {
    this.setDarkMode(!this.isDark);
  }
}

// Export singleton instance
export const d3Theme = new D3Theme();

// Export class for custom instances
export default D3Theme;
