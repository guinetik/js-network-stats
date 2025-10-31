/**
 * FamilyStorage - Storage and persistence logic for family tree
 *
 * Handles localStorage operations and auto-save functionality
 *
 * @class
 */

import { STORAGE_KEY, INITIAL_DATA, getRelationshipLabel, FAMILY_GROUPS } from './FamilyConstants.js';

/**
 * Helper function to normalize link source/target to ID
 * @param {string|Object} source - Source node ID or object
 * @returns {string} Normalized source ID
 */
function normalizeLinkId(source) {
  return typeof source === 'string' ? source : (source?.id || String(source));
}

/**
 * FamilyStorage - Storage operations for family tree
 *
 * @class
 */
export class FamilyStorage {
  /**
   * Creates a new FamilyStorage instance
   *
   * @param {Function} getGraphInstance - Function that returns the graph instance
   * @param {Function} onStatusChange - Callback for status updates
   * @param {Object} log - Logger instance
   */
  constructor(getGraphInstance, onStatusChange, log) {
    this.getGraphInstance = getGraphInstance;
    this.onStatusChange = onStatusChange;
    this.log = log;

    // Auto-save interval
    this.autoSaveInterval = null;
    this.autoSaveIntervalMs = 30000; // 30 seconds
  }

  /**
   * Get initial dataset (just YOU node)
   *
   * @returns {Object} Initial dataset with nodes and links
   */
  getInitialDataset() {
    return { ...INITIAL_DATA };
  }

  /**
   * Load family tree from localStorage
   *
   * @returns {Object|null} Family tree data or null if not found
   */
  loadFamily() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const data = JSON.parse(savedData);

        // Ensure links have string IDs (not objects)
        // This handles both old format (with objects) and new format (with IDs)
        if (data.links && Array.isArray(data.links)) {
          data.links = data.links.map(link => ({
            ...link,
            source: normalizeLinkId(link.source),
            target: normalizeLinkId(link.target)
          }));
        }

        // Ensure nodes have valid IDs
        if (data.nodes && Array.isArray(data.nodes)) {
          data.nodes = data.nodes.filter(node => node && node.id);
          // Ensure all nodes have relationship property
          // For partners, try to determine contextual relationship
          data.nodes.forEach(node => {
            if (!node.relationship && node.group !== undefined) {
              if (node.group === FAMILY_GROUPS.PARTNER) {
                // Try to find who this partner belongs to
                const links = data.links || [];
                const partnerLinks = links.filter(link => {
                  const sourceId = normalizeLinkId(link.source);
                  const targetId = normalizeLinkId(link.target);
                  return sourceId === node.id || targetId === node.id;
                });
                
                if (partnerLinks.length > 0) {
                  // Find the person this partner is connected to
                  const partnerLink = partnerLinks[0];
                  const otherId = normalizeLinkId(partnerLink.source) === node.id 
                    ? normalizeLinkId(partnerLink.target) 
                    : normalizeLinkId(partnerLink.source);
                  
                  const person = data.nodes.find(n => n.id === otherId);
                  if (person) {
                    const personRelationship = person.relationship || getRelationshipLabel(person.group);
                    if (personRelationship === 'You') {
                      node.relationship = 'Your Partner/Spouse';
                    } else {
                      node.relationship = `${personRelationship}'s Partner`;
                    }
                  } else {
                    node.relationship = getRelationshipLabel(node.group);
                  }
                } else {
                  node.relationship = getRelationshipLabel(node.group);
                }
              } else {
                node.relationship = getRelationshipLabel(node.group);
              }
            }
          });
        }

        this.log.debug('Loaded family tree from storage', {
          nodeCount: data.nodes?.length || 0,
          linkCount: data.links?.length || 0
        });
        return data;
      }
    } catch (err) {
      this.log.error('Failed to load family tree', { error: err.message });
    }
    return null;
  }

  /**
   * Save family tree to localStorage
   */
  saveFamily() {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      this.log.warn('Cannot save - graph not initialized');
      return;
    }

    try {
      // Normalize links: convert node objects to IDs for JSON serialization
      const normalizedLinks = graphInstance.data.links.map(link => ({
        source: normalizeLinkId(link.source),
        target: normalizeLinkId(link.target)
      }));

      // Clone nodes to remove any D3-added properties (like x, y, fx, fy will be recalculated)
      const normalizedNodes = graphInstance.data.nodes.map(node => {
        const { id, group, relationship, ...rest } = node;
        const cleanNode = { id, group };
        // Preserve relationship property
        if (relationship !== undefined) cleanNode.relationship = relationship;
        // Preserve other properties that might be useful (like centrality, community, etc.)
        if (rest.centrality !== undefined) cleanNode.centrality = rest.centrality;
        if (rest.community !== undefined) cleanNode.community = rest.community;
        if (rest.degree !== undefined) cleanNode.degree = rest.degree;
        if (rest.eigenvector !== undefined) cleanNode.eigenvector = rest.eigenvector;
        if (rest.betweenness !== undefined) cleanNode.betweenness = rest.betweenness;
        return cleanNode;
      });

      const data = {
        nodes: normalizedNodes,
        links: normalizedLinks
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.log.debug('Family tree saved', { nodeCount: data.nodes.length, linkCount: data.links.length });
      this.showStatus('Family tree saved!', 'success');
    } catch (err) {
      this.log.error('Failed to save family tree', { error: err.message });
      this.showStatus('Failed to save family tree', 'error');
    }
  }

  /**
   * Reset family tree to initial state
   *
   * @param {Function} loadData - Function to load data into graph
   */
  resetFamily(loadData) {
    // Temporarily stop auto-save to prevent it from saving during reset
    const wasAutoSaveRunning = !!this.autoSaveInterval;
    if (wasAutoSaveRunning) {
      this.stopAutoSave();
    }

    // Remove from localStorage FIRST before loading new data
    // This prevents auto-save from overwriting the reset
    localStorage.removeItem(STORAGE_KEY);
    
    const initialData = this.getInitialDataset();
    loadData(initialData.nodes, initialData.links);
    
    // Restart auto-save if it was running before
    if (wasAutoSaveRunning) {
      // Use setTimeout to ensure loadData has completed
      setTimeout(() => {
        this.startAutoSave();
        // Save the reset state immediately to ensure it's persisted
        setTimeout(() => {
          this.saveFamily();
        }, 100);
      }, 100);
    } else {
      // If auto-save wasn't running, save the reset state immediately
      setTimeout(() => {
        this.saveFamily();
      }, 100);
    }
    
    this.log.info('Family tree reset');
    this.showStatus('Family tree reset', 'success');
  }

  /**
   * Start auto-save interval
   */
  startAutoSave() {
    if (this.autoSaveInterval) {
      return; // Already started
    }

    this.autoSaveInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.saveFamily();
      }
    }, this.autoSaveIntervalMs);

    this.log.debug('Auto-save started', { intervalMs: this.autoSaveIntervalMs });
  }

  /**
   * Stop auto-save interval
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      this.log.debug('Auto-save stopped');
    }
  }

  /**
   * Show status message
   *
   * @param {string} message - Status message
   * @param {string} type - Status type ('success', 'error', 'info')
   */
  showStatus(message, type = 'info') {
    if (this.onStatusChange) {
      this.onStatusChange(message, type);
    }
  }
}

