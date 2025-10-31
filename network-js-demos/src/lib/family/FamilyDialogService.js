/**
 * FamilyDialogService - Dialog configuration and action mapping for family tree
 *
 * Handles dialog field configuration and maps dialog actions to controller methods
 *
 * @class
 */

import { FAMILY_GROUPS } from './FamilyConstants.js';

/**
 * FamilyDialogService - Service for managing family tree dialogs
 *
 * @class
 */
export class FamilyDialogService {
  /**
   * Creates a new FamilyDialogService instance
   *
   * @param {Function} getGraphInstance - Function that returns the graph instance
   * @param {FamilyValidation} validation - Validation instance
   */
  constructor(getGraphInstance, validation) {
    this.getGraphInstance = getGraphInstance;
    this.validation = validation;
  }

  /**
   * Get dialog configuration for adding parents
   *
   * @returns {Object} {title: string, fields: Array}
   */
  getAddParentsDialog() {
    return {
      title: 'Add Parents',
      fields: [
        { label: 'Parent 1 Name', type: 'text', required: true },
        { label: 'Parent 2 Name', type: 'text', required: false }
      ],
      action: 'addParents'
    };
  }

  /**
   * Get dialog configuration for adding sibling
   *
   * @returns {Object} {title: string, fields: Array}
   */
  getAddSiblingDialog() {
    return {
      title: 'Add Sibling',
      fields: [
        { label: 'Sibling Name', type: 'text', required: true }
      ],
      action: 'addSibling'
    };
  }

  /**
   * Get dialog configuration for adding grandparents
   *
   * @returns {Object} {title: string, fields: Array}
   */
  getAddGrandparentsDialog() {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return null;
    }

    const parents = graphInstance.data.nodes.filter(n => n.group === FAMILY_GROUPS.PARENT);
    if (parents.length === 0) {
      return null; // Will be handled by validation
    }

    const parentOptions = parents.map(p => ({ value: p.id, text: p.id }));

    return {
      title: 'Add Grandparents',
      fields: [
        { label: "Parent's Side", type: 'select', options: parentOptions, required: true },
        { label: 'Grandparent 1 Name', type: 'text', required: true },
        { label: 'Grandparent 2 Name', type: 'text', required: false }
      ],
      action: 'addGrandparents'
    };
  }

  /**
   * Get dialog configuration for adding uncle/aunt
   *
   * @returns {Object} {title: string, fields: Array}
   */
  getAddUncleAuntDialog() {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return null;
    }

    const parents = graphInstance.data.nodes.filter(n => n.group === FAMILY_GROUPS.PARENT);
    if (parents.length === 0) {
      return null; // Will be handled by validation
    }

    const parentOptions = parents.map(p => ({ value: p.id, text: `${p.id}'s sibling` }));

    return {
      title: 'Add Uncle/Aunt',
      fields: [
        { label: "Parent's Side", type: 'select', options: parentOptions, required: true },
        { label: 'Uncle/Aunt Name', type: 'text', required: true }
      ],
      action: 'addUncleAunt'
    };
  }

  /**
   * Get dialog configuration for adding cousin
   *
   * @returns {Object} {title: string, fields: Array}
   */
  getAddCousinDialog() {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return null;
    }

    const unclesAunts = graphInstance.data.nodes.filter(n => n.group === FAMILY_GROUPS.UNCLE_AUNT);
    if (unclesAunts.length === 0) {
      return null; // Will be handled by validation
    }

    const uncleAuntOptions = unclesAunts.map(u => ({ value: u.id, text: `${u.id}'s child` }));

    return {
      title: 'Add Cousin',
      fields: [
        { label: 'Uncle/Aunt', type: 'select', options: uncleAuntOptions, required: true },
        { label: 'Cousin Name', type: 'text', required: true }
      ],
      action: 'addCousin'
    };
  }

  /**
   * Get dialog configuration for adding child
   *
   * @returns {Object} {title: string, fields: Array}
   */
  getAddChildDialog() {
    const eligibleParents = this.validation.getEligibleParents();
    if (eligibleParents.length === 0) {
      return null; // Will be handled by validation
    }

    const parentOptions = eligibleParents.map(node => {
      let relationship = '';
      switch (node.group) {
        case FAMILY_GROUPS.YOU:
          relationship = 'Your child';
          break;
        case FAMILY_GROUPS.SIBLING:
          relationship = `${node.id}'s child (your niece/nephew)`;
          break;
        case FAMILY_GROUPS.COUSIN:
          relationship = `${node.id}'s child (your cousin's child)`;
          break;
        case FAMILY_GROUPS.CHILD:
          relationship = `${node.id}'s child (your grandchild)`;
          break;
        case FAMILY_GROUPS.NIECE_NEPHEW:
          relationship = `${node.id}'s child`;
          break;
        case FAMILY_GROUPS.PARTNER:
          relationship = `${node.id}'s child`;
          break;
        default:
          relationship = `${node.id}'s child`;
      }
      return { value: node.id, text: relationship };
    });

    return {
      title: 'Add Child',
      fields: [
        { label: 'Parent', type: 'select', options: parentOptions, required: true },
        { label: 'Child Name', type: 'text', required: true }
      ],
      action: 'addChild'
    };
  }

  /**
   * Get dialog configuration for adding niece/nephew
   *
   * @returns {Object} {title: string, fields: Array}
   */
  getAddNieceNephewDialog() {
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return null;
    }

    const siblings = graphInstance.data.nodes.filter(n => n.group === FAMILY_GROUPS.SIBLING);
    if (siblings.length === 0) {
      return null; // Will be handled by validation
    }

    const siblingOptions = siblings.map(s => ({ value: s.id, text: `${s.id}'s child` }));

    return {
      title: 'Add Niece/Nephew',
      fields: [
        { label: 'Sibling', type: 'select', options: siblingOptions, required: true },
        { label: 'Niece/Nephew Name', type: 'text', required: true }
      ],
      action: 'addNieceNephew'
    };
  }

  /**
   * Get dialog configuration for adding partner
   *
   * @returns {Object} {title: string, fields: Array}
   */
  getAddPartnerDialog() {
    const eligibleForPartner = this.validation.getEligibleForPartner();
    if (eligibleForPartner.length === 0) {
      return null; // Will be handled by validation
    }

    const partnerOptions = eligibleForPartner.map(node => {
      let relationship = '';
      switch (node.group) {
        case FAMILY_GROUPS.YOU:
          relationship = `Your partner/spouse`;
          break;
        case FAMILY_GROUPS.SIBLING:
          relationship = `${node.id}'s partner (your sibling-in-law)`;
          break;
        case FAMILY_GROUPS.COUSIN:
          relationship = `${node.id}'s partner`;
          break;
        case FAMILY_GROUPS.UNCLE_AUNT:
          relationship = `${node.id}'s partner (your aunt/uncle)`;
          break;
        case FAMILY_GROUPS.NIECE_NEPHEW:
          relationship = `${node.id}'s partner`;
          break;
        case FAMILY_GROUPS.CHILD:
          relationship = `${node.id}'s partner (your child-in-law)`;
          break;
        default:
          relationship = `${node.id}'s partner`;
      }
      return { value: node.id, text: relationship };
    });

    return {
      title: 'Add Partner/Spouse',
      fields: [
        { label: 'Partner Of', type: 'select', options: partnerOptions, required: true },
        { label: 'Partner Name', type: 'text', required: true }
      ],
      action: 'addPartner'
    };
  }

  /**
   * Execute a dialog action with values
   *
   * @param {string} action - Action name
   * @param {Array} values - Dialog field values
   * @param {FamilyOperations} operations - Operations instance
   * @returns {Object} {success: boolean, message?: string}
   */
  executeAction(action, values, operations) {
    switch (action) {
      case 'addParents':
        return operations.addParents(values[0], values[1]);
      case 'addSibling':
        return operations.addSibling(values[0]);
      case 'addGrandparents':
        return operations.addGrandparents(values[0], values[1], values[2]);
      case 'addUncleAunt':
        return operations.addUncleAunt(values[0], values[1]);
      case 'addCousin':
        return operations.addCousin(values[0], values[1]);
      case 'addChild':
        return operations.addChild(values[0], values[1]);
      case 'addNieceNephew':
        return operations.addNieceNephew(values[0], values[1]);
      case 'addPartner':
        return operations.addPartner(values[0], values[1]);
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
}

