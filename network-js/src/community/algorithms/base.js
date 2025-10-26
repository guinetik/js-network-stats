/**
 * Abstract base class for community detection algorithms.
 * All community detection algorithms must extend this class and implement the detect() method.
 *
 * @abstract
 * @class
 * @example
 * class MyAlgorithm extends CommunityAlgorithm {
 *   constructor(options = {}) {
 *     super('my-algorithm', 'My Custom Algorithm');
 *     this.options = options;
 *   }
 *
 *   detect(graph) {
 *     // Implement detection logic
 *     return {
 *       communities: { 'A': 0, 'B': 0, 'C': 1 },
 *       modularity: 0.42,
 *       numCommunities: 2,
 *       algorithm: this.name
 *     };
 *   }
 * }
 */
export class CommunityAlgorithm {
  /**
   * Create a community detection algorithm
   *
   * @param {string} name - Algorithm identifier (e.g., 'louvain', 'label-propagation')
   * @param {string} description - Human-readable description of the algorithm
   */
  constructor(name, description = '') {
    if (new.target === CommunityAlgorithm) {
      throw new Error('CommunityAlgorithm is abstract and cannot be instantiated directly');
    }

    /**
     * Algorithm identifier
     * @type {string}
     */
    this.name = name;

    /**
     * Algorithm description
     * @type {string}
     */
    this.description = description;
  }

  /**
   * Detect communities in a graph.
   * This method must be implemented by subclasses.
   *
   * @abstract
   * @param {Graph} graph - The graph to analyze
   * @returns {import('../types.js').CommunityResult} Community detection results
   * @throws {Error} If not implemented by subclass
   */
  detect(graph) {
    throw new Error(`detect() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Get algorithm metadata
   *
   * @returns {Object} Algorithm information
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description
    };
  }
}

export default CommunityAlgorithm;
