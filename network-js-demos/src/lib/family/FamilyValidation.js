/**
 * FamilyValidation - Validation logic for family tree operations
 *
 * Handles all validation checks for adding family members
 *
 * @class
 */

import { FAMILY_GROUPS } from './FamilyConstants.js';

/**
 * Helper function to normalize link source/target to ID
 * @param {string|Object} source - Source node ID or object
 * @returns {string} Normalized source ID
 */
function normalizeLinkId(source) {
  return typeof source === 'string' ? source : (source?.id || String(source));
}

/**
 * FamilyValidation - Validation logic for family tree
 *
 * @class
 */
export class FamilyValidation {
  /**
   * Creates a new FamilyValidation instance
   *
   * @param {Function} getGraphInstance - Function that returns the graph instance
   */
  constructor(getGraphInstance) {
    this.getGraphInstance = getGraphInstance;
  }

  /**
   * Check if parents can be added (max 2)
   *
   * @returns {Object} {canAdd: boolean, existingCount: number, message?: string}
   */
  canAddParents() {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return { canAdd: false, existingCount: 0, message: 'Graph not initialized' };
    }

    const existingParents = graphInstance.data.nodes.filter(
      n => n.group === FAMILY_GROUPS.PARENT
    );

    if (existingParents.length >= 2) {
      return {
        canAdd: false,
        existingCount: existingParents.length,
        message: 'You already have 2 parents added. You cannot add more than 2 parents.'
      };
    }

    return {
      canAdd: true,
      existingCount: existingParents.length,
      remainingSlots: 2 - existingParents.length
    };
  }

  /**
   * Check if grandparents can be added for a parent (max 2 per parent)
   *
   * @param {string} parentId - Parent node ID
   * @returns {Object} {canAdd: boolean, existingCount: number, message?: string}
   */
  canAddGrandparents(parentId) {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return { canAdd: false, existingCount: 0, message: 'Graph not initialized' };
    }

    const links = graphInstance.data.links;
    const existingGrandparents = links
      .filter(link => {
        const targetId = normalizeLinkId(link.target);
        return targetId === parentId;
      })
      .map(link => {
        const sourceId = normalizeLinkId(link.source);
        return graphInstance.data.nodes.find(n => n.id === sourceId);
      })
      .filter(node => node && node.group === FAMILY_GROUPS.GRANDPARENT);

    if (existingGrandparents.length >= 2) {
      return {
        canAdd: false,
        existingCount: existingGrandparents.length,
        message: `${parentId} already has 2 grandparents. Cannot add more.`
      };
    }

    return {
      canAdd: true,
      existingCount: existingGrandparents.length,
      remainingSlots: 2 - existingGrandparents.length
    };
  }

  /**
   * Check if a person has a partner
   *
   * @param {string} personId - Person node ID
   * @returns {boolean} True if person has a partner
   */
  hasPartner(personId) {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return false;
    }

    const links = graphInstance.data.links;
    const partners = links
      .filter(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return sourceId === personId || targetId === personId;
      })
      .map(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return sourceId === personId ? targetId : sourceId;
      })
      .map(partnerId => {
        return graphInstance.data.nodes.find(n => n.id === partnerId);
      })
      .filter(node => node && node.group === FAMILY_GROUPS.PARTNER);

    return partners.length > 0;
  }

  /**
   * Get nodes that are eligible to have children
   * (not PARENT, GRANDPARENT, UNCLE_AUNT)
   *
   * @returns {Array} Array of eligible node objects
   */
  getEligibleParents() {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return [];
    }

    return graphInstance.data.nodes.filter(n => {
      const group = n.group;
      return group !== FAMILY_GROUPS.GRANDPARENT &&
             group !== FAMILY_GROUPS.UNCLE_AUNT &&
             group !== FAMILY_GROUPS.PARENT;
    });
  }

  /**
   * Get nodes that are eligible to have partners
   *
   * @returns {Array} Array of eligible node objects (without partners)
   */
  getEligibleForPartner() {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return [];
    }

    return graphInstance.data.nodes.filter(n => {
      const group = n.group;
      const isEligibleGroup = group === FAMILY_GROUPS.YOU ||
                             group === FAMILY_GROUPS.SIBLING ||
                             group === FAMILY_GROUPS.COUSIN ||
                             group === FAMILY_GROUPS.UNCLE_AUNT ||
                             group === FAMILY_GROUPS.NIECE_NEPHEW ||
                             group === FAMILY_GROUPS.CHILD;

      return isEligibleGroup && !this.hasPartner(n.id);
    });
  }
}

