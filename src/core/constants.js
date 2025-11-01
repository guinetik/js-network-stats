/**
 * Core constants for network analysis
 * @module core/constants
 */

/**
 * Available features for network analysis
 * @enum {string}
 */
export const FEATURES = {
  DEGREE: 'degree',
  EIGENVECTOR: 'eigenvector',
  BETWEENNESS: 'betweenness',
  CLUSTERING: 'clustering',
  CLIQUES: 'cliques',
  MODULARITY: 'modularity',
  TRANSITIVITY: 'transitivity',
  ALL: [
    'degree',
    'eigenvector',
    'betweenness',
    'clustering',
    'cliques',
    'modularity',
  ],
};

/**
 * Get all valid feature names
 * @returns {Set<string>} Set of valid feature names
 */
export function getValidFeatures() {
  return new Set(
    Object.values(FEATURES).filter(f => typeof f === 'string')
  );
}
