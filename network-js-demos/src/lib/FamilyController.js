/**
 * FamilyController - Business logic controller for Family Tree page
 *
 * Handles all family tree operations, validation, and data management
 * independent of the UI framework (Vue, React, etc.)
 *
 * @class
 */

import { createLogger } from '@guinetik/logger';
import { FAMILY_GROUPS, GROUP_COLORS } from './family/FamilyConstants.js';
import { FamilyValidation } from './family/FamilyValidation.js';
import { FamilyOperations } from './family/FamilyOperations.js';
import { FamilyStorage } from './family/FamilyStorage.js';
import { FamilyDialogService, DIALOG_ACTIONS } from './family/FamilyDialogService.js';

// Re-export constants for backward compatibility
export { FAMILY_GROUPS, GROUP_COLORS, DIALOG_ACTIONS };

/**
 * FamilyController - Manages family tree business logic
 *
 * @class
 */
export class FamilyController {
  /**
   * Creates a new FamilyController instance
   *
   * @param {Object} dependencies - Required dependencies
   * @param {Object} dependencies.graphManager - The graph manager (e.g., from useNetworkGraph)
   * @param {Function} dependencies.onStatusChange - Callback for status updates (message, type)
   */
  constructor({ graphManager, onStatusChange = null }) {
    this.graphManager = graphManager;
    this.onStatusChange = onStatusChange;
    this.log = createLogger({
      prefix: 'FamilyController',
      level: import.meta.env.DEV ? 'debug' : 'info'
    });

    // Get graph instance helper
    const getGraphInstance = () => this.getGraphInstance();

    // Initialize modules
    this.validation = new FamilyValidation(getGraphInstance);
    this.storage = new FamilyStorage(getGraphInstance, onStatusChange, this.log);
    this.operations = new FamilyOperations(
      graphManager,
      getGraphInstance,
      this.validation,
      () => this.storage.saveFamily()
    );
    this.dialogService = new FamilyDialogService(getGraphInstance, this.validation);

    // Setup auto-save
    this.storage.startAutoSave();
  }

  /**
   * Get initial dataset (just YOU node)
   *
   * @returns {Object} Initial dataset with nodes and links
   */
  getInitialDataset() {
    return this.storage.getInitialDataset();
  }

  /**
   * Load family tree from localStorage
   *
   * @returns {Object|null} Family tree data or null if not found
   */
  loadFamily() {
    return this.storage.loadFamily();
  }

  /**
   * Get the graph instance (handles Vue ref)
   * @returns {Object|null} NetworkGraphD3 instance or null
   */
  getGraphInstance() {
    if (!this.graphManager?.graphInstance) {
      return null;
    }
    // Handle Vue ref
    return this.graphManager.graphInstance.value || this.graphManager.graphInstance;
  }

  /**
   * Save family tree to localStorage
   */
  saveFamily() {
    this.storage.saveFamily();
  }

  /**
   * Reset family tree to initial state
   */
  resetFamily() {
    this.storage.resetFamily(this.graphManager.loadData);
  }

  /**
   * Lock graph positions
   */
  lockGraph() {
    if (!this.graphManager?.lockPositions) {
      this.log.warn('lockPositions not available');
      return;
    }
    this.graphManager.lockPositions();
    this.showStatus('Graph locked', 'success');
  }

  /**
   * Unlock graph positions
   */
  unlockGraph() {
    if (!this.graphManager?.unlockPositions) {
      this.log.warn('unlockPositions not available');
      return;
    }
    this.graphManager.unlockPositions();
    this.showStatus('Graph unlocked', 'success');
  }

  /**
   * Save graph as PNG image
   *
   * @param {string} filename - Filename for download
   */
  saveAsPNG(filename = 'family-tree.png') {
    if (!this.graphManager?.saveAsPNG) {
      this.log.warn('saveAsPNG not available');
      return;
    }
    this.graphManager.saveAsPNG(filename);
    this.showStatus('Image saved!', 'success');
  }

  /**
   * Check if parents can be added (max 2)
   *
   * @returns {Object} {canAdd: boolean, existingCount: number, message?: string}
   */
  canAddParents() {
    return this.validation.canAddParents();
  }

  /**
   * Get nodes that are eligible to have children
   *
   * @returns {Array} Array of eligible node objects
   */
  getEligibleParents() {
    return this.validation.getEligibleParents();
  }

  /**
   * Get nodes that are eligible to have partners
   *
   * @returns {Array} Array of eligible node objects (without partners)
   */
  getEligibleForPartner() {
    return this.validation.getEligibleForPartner();
  }

  /**
   * Add parents
   *
   * @param {string} parent1Name - First parent name
   * @param {string} [parent2Name] - Second parent name (optional)
   * @returns {Object} {success: boolean, message?: string}
   */
  addParents(parent1Name, parent2Name = null) {
    return this.operations.addParents(parent1Name, parent2Name);
  }

  /**
   * Add sibling
   *
   * @param {string} name - Sibling name
   * @returns {Object} {success: boolean, message?: string}
   */
  addSibling(name) {
    return this.operations.addSibling(name);
  }

  /**
   * Add grandparents
   *
   * @param {string} parentId - Parent node ID
   * @param {string} grandparent1Name - First grandparent name
   * @param {string} [grandparent2Name] - Second grandparent name (optional)
   * @returns {Object} {success: boolean, message?: string}
   */
  addGrandparents(parentId, grandparent1Name, grandparent2Name = null) {
    return this.operations.addGrandparents(parentId, grandparent1Name, grandparent2Name);
  }

  /**
   * Add uncle/aunt
   *
   * @param {string} parentId - Parent node ID
   * @param {string} name - Uncle/aunt name
   * @returns {Object} {success: boolean, message?: string}
   */
  addUncleAunt(parentId, name) {
    return this.operations.addUncleAunt(parentId, name);
  }

  /**
   * Add cousin
   *
   * @param {string} uncleAuntId - Uncle/aunt node ID
   * @param {string} name - Cousin name
   * @returns {Object} {success: boolean, message?: string}
   */
  addCousin(uncleAuntId, name) {
    return this.operations.addCousin(uncleAuntId, name);
  }

  /**
   * Add child
   *
   * @param {string} parentId - Parent node ID
   * @param {string} name - Child name
   * @returns {Object} {success: boolean, message?: string}
   */
  addChild(parentId, name) {
    return this.operations.addChild(parentId, name);
  }

  /**
   * Add niece/nephew
   *
   * @param {string} siblingId - Sibling node ID
   * @param {string} name - Niece/nephew name
   * @returns {Object} {success: boolean, message?: string}
   */
  addNieceNephew(siblingId, name) {
    return this.operations.addNieceNephew(siblingId, name);
  }

  /**
   * Add partner/spouse
   *
   * @param {string} personId - Person node ID
   * @param {string} partnerName - Partner name
   * @returns {Object} {success: boolean, message?: string}
   */
  addPartner(personId, partnerName) {
    return this.operations.addPartner(personId, partnerName);
  }

  /**
   * Get dialog service (for Vue component to use)
   *
   * @returns {FamilyDialogService} Dialog service instance
   */
  getDialogService() {
    return this.dialogService;
  }

  /**
   * Get operations instance (for dialog service to use)
   *
   * @returns {FamilyOperations} Operations instance
   */
  getOperations() {
    return this.operations;
  }

  /**
   * Apply a layout algorithm to the family tree
   *
   * @param {string} layoutId - Layout algorithm ID (e.g., 'circular', 'hierarchical', 'kamada-kawai')
   * @returns {Promise<Object>} {success: boolean, layoutId?: string, error?: string}
   */
  async applyLayout(layoutId) {
    if (layoutId === 'none') {
      const message = 'ℹ️ Using D3 physics simulation (no layout algorithm)';
      this.log.debug('Using default D3 physics simulation');
      this.showStatus(message, 'info');

      return {
        success: true,
        layoutId: 'none',
        message: 'Using default D3 physics simulation'
      };
    }

    try {
      this.log.debug('Applying layout algorithm', { layoutId });
      this.showStatus(`Applying ${layoutId} layout...`, 'info');

      if (!this.graphManager?.applyLayout) {
        return { success: false, error: 'Layout functionality not available' };
      }

      const success = await this.graphManager.applyLayout(layoutId);

      if (success) {
        const message = `✅ Applied ${layoutId} layout algorithm`;
        this.log.info('Layout applied successfully', { layoutId });
        this.showStatus(message, 'success');

        return {
          success: true,
          layoutId
        };
      }

      this.log.warn('Layout application failed', { layoutId });
      return { success: false, error: 'Layout application failed' };
    } catch (err) {
      const message = `❌ Layout failed: ${err.message}`;
      this.log.error('Layout application failed', { layoutId, error: err.message, stack: err.stack });
      this.showStatus(message, 'error');

      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Get available layout algorithms
   *
   * @returns {Array} Array of layout objects with id, name, and description
   */
  getAvailableLayouts() {
    if (!this.graphManager?.getAvailableLayouts) {
      return [];
    }
    return this.graphManager.getAvailableLayouts();
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

  /**
   * Cleanup - stop auto-save
   */
  dispose() {
    this.storage.stopAutoSave();
    this.log.info('FamilyController disposed');
  }
}

export default FamilyController;
