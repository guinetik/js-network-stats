/**
 * ComponentManager - Manages Alpine component lifecycle
 *
 * Handles initialization, cleanup, and transitions between components
 * to prevent memory leaks and ensure proper resource management.
 */
export class ComponentManager {
  constructor() {
    this.currentComponent = null;
    this.currentCleanup = null;
    this.currentGraph = null;
  }

  /**
   * Load a new component and clean up the previous one
   * @param {Function} componentFactory - Function that creates the component
   * @param {Function} initCallback - Optional callback to run after initialization
   */
  async loadComponent(componentFactory, initCallback = null) {
    // Clean up previous component
    await this.cleanup();

    // Create new component
    this.currentComponent = componentFactory();

    // Store cleanup function if provided
    if (this.currentComponent.destroy) {
      this.currentCleanup = () => this.currentComponent.destroy();
    }

    // Store graph reference if provided
    if (this.currentComponent.graph) {
      this.currentGraph = this.currentComponent.graph;
    }

    // Run init callback if provided
    if (initCallback) {
      await initCallback(this.currentComponent);
    }

    return this.currentComponent;
  }

  /**
   * Clean up the current component
   */
  async cleanup() {
    if (this.currentCleanup) {
      await this.currentCleanup();
      this.currentCleanup = null;
    }

    if (this.currentGraph) {
      if (this.currentGraph.destroy) {
        this.currentGraph.destroy();
      }
      this.currentGraph = null;
    }

    this.currentComponent = null;
  }

  /**
   * Get the current component
   */
  getComponent() {
    return this.currentComponent;
  }

  /**
   * Pause the current component (e.g., when navigating away)
   */
  pause() {
    if (this.currentGraph && this.currentGraph.simulation) {
      this.currentGraph.simulation.stop();
    }
  }

  /**
   * Resume the current component (e.g., when navigating back)
   */
  resume() {
    if (this.currentGraph && this.currentGraph.simulation) {
      this.currentGraph.simulation.restart();
    }
  }
}
