/**
 * Community detection algorithms
 *
 * This module exports all available community detection algorithms.
 * Each algorithm implements the CommunityAlgorithm interface.
 *
 * @module community/algorithms
 */

import { CommunityAlgorithm } from './base.js';
import { LouvainAlgorithm } from './louvain.js';

export { CommunityAlgorithm, LouvainAlgorithm };

export default {
  CommunityAlgorithm,
  LouvainAlgorithm
};
