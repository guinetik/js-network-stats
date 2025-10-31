/**
 * FamilyOperations - Operations for adding family members
 *
 * Handles all add operations for family tree
 *
 * @class
 */

import { FAMILY_GROUPS, getRelationshipLabel } from './FamilyConstants.js';

/**
 * Helper function to normalize link source/target to ID
 * @param {string|Object} source - Source node ID or object
 * @returns {string} Normalized source ID
 */
function normalizeLinkId(source) {
  return typeof source === 'string' ? source : (source?.id || String(source));
}

/**
 * FamilyOperations - Operations for adding family members
 *
 * @class
 */
export class FamilyOperations {
  /**
   * Creates a new FamilyOperations instance
   *
   * @param {Object} graphManager - Graph manager instance
   * @param {Function} getGraphInstance - Function that returns the graph instance
   * @param {FamilyValidation} validation - Validation instance
   * @param {Function} saveFamily - Function to save family tree
   */
  constructor(graphManager, getGraphInstance, validation, saveFamily) {
    this.graphManager = graphManager;
    this.getGraphInstance = getGraphInstance;
    this.validation = validation;
    this.saveFamily = saveFamily;
  }

  /**
   * Helper method to add a node with relationship label
   *
   * @param {Array} neighborIds - IDs of nodes to connect to
   * @param {string} nodeId - Node ID
   * @param {number} group - Group number
   * @param {string} [genderHint] - Optional gender hint for relationship label
   * @param {string} [customRelationship] - Optional custom relationship label (overrides default)
   * @returns {Object} The newly created node
   */
  addNodeWithRelationship(neighborIds, nodeId, group, genderHint = null, customRelationship = null) {
    const relationship = customRelationship || getRelationshipLabel(group, genderHint);
    
    // Get graph instance BEFORE adding node so we can access it immediately after
    const graphInstance = this.getGraphInstance();
    
    // Add the node - handle both sync (addNodeIncremental) and async (addNode wrapper) cases
    const addNodeResult = this.graphManager.addNode(neighborIds, nodeId, group, true);
    
    // If it's a Promise (async wrapper), handle it
    if (addNodeResult && typeof addNodeResult.then === 'function') {
      return addNodeResult.then(newNode => {
        this._setRelationshipOnNode(newNode, relationship, graphInstance);
        return newNode;
      });
    }
    
    // Synchronous case (direct call to addNodeIncremental)
    const newNode = addNodeResult;
    this._setRelationshipOnNode(newNode, relationship, graphInstance);
    return newNode;
  }

  /**
   * Set relationship property on a node and ensure it's on the correct object reference
   * @private
   */
  _setRelationshipOnNode(newNode, relationship, graphInstance) {
    if (!newNode) return;
    
    // Set relationship property immediately on the returned node
    newNode.relationship = relationship;
    
    // Also ensure it's set on the node in the graph instance data array
    // This is the actual object D3 uses for rendering and event handlers
    if (graphInstance?.data) {
      // Find the node in the data array - this is what D3 event handlers read from
      let nodeInData = graphInstance.data.nodes.find(n => n.id === newNode.id);
      
      if (nodeInData) {
        // Set on the node in the array (this is what D3 event handlers read from)
        nodeInData.relationship = relationship;
        
        // They should be the same reference, but if not, sync both
        if (nodeInData !== newNode) {
          newNode.relationship = relationship;
        }
      } else {
        // Node not found in array yet - might be a timing issue
        // Wait a microtask and try again
        Promise.resolve().then(() => {
          if (graphInstance?.data) {
            nodeInData = graphInstance.data.nodes.find(n => n.id === newNode.id);
            if (nodeInData) {
              nodeInData.relationship = relationship;
            }
          }
        });
      }
      
      // Also use requestAnimationFrame as a fallback to ensure it's set after D3 renders
      requestAnimationFrame(() => {
        if (graphInstance?.data) {
          const nodeInData = graphInstance.data.nodes.find(n => n.id === newNode.id);
          if (nodeInData && !nodeInData.relationship) {
            nodeInData.relationship = relationship;
          }
        }
      });
    }
  }

  /**
   * Add parents
   *
   * @param {string} parent1Name - First parent name
   * @param {string} [parent2Name] - Second parent name (optional)
   * @returns {Object} {success: boolean, message?: string}
   */
  addParents(parent1Name, parent2Name = null) {
    const validation = this.validation.canAddParents();
    if (!validation.canAdd) {
      return { success: false, message: validation.message };
    }

    if (!parent1Name?.trim()) {
      return { success: false, message: 'Parent 1 name is required' };
    }

    const remainingSlots = validation.remainingSlots;
    const graphInstance = this.getGraphInstance();
    if (!graphInstance) {
      return { success: false, message: 'Graph not initialized' };
    }

    // Add first parent (connected to YOU)
    let parent1Id = null;
    if (remainingSlots >= 1) {
      const parent1 = this.addNodeWithRelationship(['YOU'], parent1Name.trim(), FAMILY_GROUPS.PARENT);
      parent1Id = parent1?.id || parent1Name.trim();
    }

    // Add second parent if provided and slot available
    let parent2Id = null;
    if (parent2Name?.trim() && remainingSlots >= 2) {
      const parent2 = this.addNodeWithRelationship(['YOU'], parent2Name.trim(), FAMILY_GROUPS.PARENT);
      parent2Id = parent2?.id || parent2Name.trim();
    } else if (parent2Name?.trim() && remainingSlots < 2) {
      return {
        success: true,
        message: 'Only one parent slot available. Added only the first parent.'
      };
    }

    // Connect parents to each other (they're partners/spouses)
    // This creates a triangle: Parent1 <-> Parent2, Parent1 -> YOU, Parent2 -> YOU
    if (parent1Id && parent2Id && this.graphManager.addLink) {
      // Use requestAnimationFrame to ensure nodes are fully added first
      requestAnimationFrame(() => {
        const linkAdded = this.graphManager.addLink(parent1Id, parent2Id);
        if (linkAdded) {
          this.saveFamily(); // Save again after adding the link
        }
      });
    } else {
      this.saveFamily();
    }
    return { success: true };
  }

  /**
   * Add sibling
   *
   * @param {string} name - Sibling name
   * @returns {Object} {success: boolean, message?: string}
   */
  addSibling(name) {
    if (!name?.trim()) {
      return { success: false, message: 'Sibling name is required' };
    }

    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return { success: false, message: 'Graph not initialized' };
    }

    // Find parents of 'YOU' - siblings should connect through shared parents
    const links = graphInstance.data.links;
    const parentIds = links
      .filter(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return (sourceId === 'YOU' || targetId === 'YOU');
      })
      .map(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return sourceId === 'YOU' ? targetId : sourceId;
      })
      .map(parentId => {
        const parent = graphInstance.data.nodes.find(n => n.id === parentId);
        return parent && parent.group === FAMILY_GROUPS.PARENT ? parentId : null;
      })
      .filter(id => id !== null);

    // Find all existing siblings (including YOU)
    const existingSiblings = graphInstance.data.nodes.filter(
      n => n.group === FAMILY_GROUPS.SIBLING || n.id === 'YOU'
    ).map(n => n.id);

    // Combine: connect to parents (if any) AND to all existing siblings
    const connectToIds = [];

    // Add parents if they exist
    if (parentIds.length > 0) {
      connectToIds.push(...parentIds);
    } else {
      // If no parents, connect to YOU as fallback
      connectToIds.push('YOU');
    }

    // Add all existing siblings (will include YOU if no parents)
    // This ensures the new sibling connects to all existing siblings
    existingSiblings.forEach(siblingId => {
      if (!connectToIds.includes(siblingId)) {
        connectToIds.push(siblingId);
      }
    });

    // Add the new sibling node - this will create links to parents AND all existing siblings
    const newSibling = this.addNodeWithRelationship(connectToIds, name.trim(), FAMILY_GROUPS.SIBLING);

    if (!newSibling) {
      return { success: false, message: 'Failed to add sibling' };
    }

    // Now ensure all existing siblings are also connected to the new sibling
    // (addNode created links FROM new sibling TO existing siblings, but we need bidirectional)
    // Actually, since links are undirected in D3, we're good - but let's be explicit
    const newSiblingId = newSibling.id || name.trim();

    // Connect all existing siblings to the new sibling (for explicit bidirectional links)
    // Note: addNode already created links to connectToIds, so links exist
    // But we'll add them explicitly to ensure they're there (addLink checks for duplicates)
    if (this.graphManager.addLink) {
      existingSiblings.forEach(siblingId => {
        if (siblingId !== newSiblingId) {
          // Use requestAnimationFrame to ensure node is fully added first
          requestAnimationFrame(() => {
            this.graphManager.addLink(newSiblingId, siblingId, true);
          });
        }
      });
    }

    this.saveFamily();
    return { success: true };
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
    if (!this.graphManager?.hasNode || !this.graphManager.hasNode(parentId)) {
      return { success: false, message: 'Parent not found' };
    }

    const validation = this.validation.canAddGrandparents(parentId);
    if (!validation.canAdd) {
      return { success: false, message: validation.message };
    }

    if (!grandparent1Name?.trim()) {
      return { success: false, message: 'Grandparent 1 name is required' };
    }

    const remainingSlots = validation.remainingSlots;
    const graphInstance = this.getGraphInstance();
    if (!graphInstance) {
      return { success: false, message: 'Graph not initialized' };
    }

    // Add first grandparent (connected to parent)
    let grandparent1Id = null;
    if (remainingSlots >= 1) {
      const grandparent1 = this.addNodeWithRelationship([parentId], grandparent1Name.trim(), FAMILY_GROUPS.GRANDPARENT);
      grandparent1Id = grandparent1?.id || grandparent1Name.trim();
    }

    // Add second grandparent if provided and slot available
    let grandparent2Id = null;
    if (grandparent2Name?.trim() && remainingSlots >= 2) {
      const grandparent2 = this.addNodeWithRelationship([parentId], grandparent2Name.trim(), FAMILY_GROUPS.GRANDPARENT);
      grandparent2Id = grandparent2?.id || grandparent2Name.trim();
    } else if (grandparent2Name?.trim() && remainingSlots < 2) {
      return {
        success: true,
        message: 'Only one grandparent slot available for this parent. Added only the first grandparent.'
      };
    }

    // Connect grandparents to each other (they're partners/spouses)
    // This creates a triangle: Grandparent1 <-> Grandparent2, Grandparent1 -> Parent, Grandparent2 -> Parent
    if (grandparent1Id && grandparent2Id && this.graphManager.addLink) {
      // Use requestAnimationFrame to ensure nodes are fully added first
      requestAnimationFrame(() => {
        const linkAdded = this.graphManager.addLink(grandparent1Id, grandparent2Id);
        if (linkAdded) {
          this.saveFamily(); // Save again after adding the link
        }
      });
    } else {
      this.saveFamily();
    }
    return { success: true };
  }

  /**
   * Add uncle/aunt
   *
   * @param {string} parentId - Parent node ID
   * @param {string} name - Uncle/aunt name
   * @returns {Object} {success: boolean, message?: string}
   */
  addUncleAunt(parentId, name) {
    if (!this.graphManager?.hasNode || !this.graphManager.hasNode(parentId)) {
      return { success: false, message: 'Parent not found' };
    }

    if (!name?.trim()) {
      return { success: false, message: 'Uncle/aunt name is required' };
    }

    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return { success: false, message: 'Graph not initialized' };
    }

    // Find grandparents of the parent (they are also parents of the uncle/aunt)
    const links = graphInstance.data.links;
    const grandparentIds = links
      .filter(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return targetId === parentId;
      })
      .map(link => {
        const sourceId = normalizeLinkId(link.source);
        return graphInstance.data.nodes.find(n => n.id === sourceId);
      })
      .filter(node => node && node.group === FAMILY_GROUPS.GRANDPARENT)
      .map(node => node.id);

    // Connect to parent (sibling relationship) AND grandparents (parent-child relationship)
    const connectToIds = [parentId, ...grandparentIds];

    // Add the uncle/aunt node - connected to parent and grandparents
    const newUncleAunt = this.addNodeWithRelationship(connectToIds, name.trim(), FAMILY_GROUPS.UNCLE_AUNT);

    if (!newUncleAunt) {
      return { success: false, message: 'Failed to add uncle/aunt' };
    }

    this.saveFamily();
    return { success: true };
  }

  /**
   * Add cousin
   *
   * @param {string} uncleAuntId - Uncle/aunt node ID
   * @param {string} name - Cousin name
   * @returns {Object} {success: boolean, message?: string}
   */
  addCousin(uncleAuntId, name) {
    if (!this.graphManager?.hasNode || !this.graphManager.hasNode(uncleAuntId)) {
      return { success: false, message: 'Uncle/aunt not found' };
    }

    if (!name?.trim()) {
      return { success: false, message: 'Cousin name is required' };
    }

    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return { success: false, message: 'Graph not initialized' };
    }

    // Find partner of the uncle/aunt (if any) - cousins should connect to both parents
    const links = graphInstance.data.links;
    const partnerId = links
      .filter(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return (sourceId === uncleAuntId || targetId === uncleAuntId);
      })
      .map(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return sourceId === uncleAuntId ? targetId : sourceId;
      })
      .map(partnerId => {
        return graphInstance.data.nodes.find(n => n.id === partnerId);
      })
      .find(node => node && node.group === FAMILY_GROUPS.PARTNER);

    // Connect to uncle/aunt AND partner (if partner exists)
    const connectToIds = [uncleAuntId];
    if (partnerId) {
      connectToIds.push(partnerId.id);
    }

    this.addNodeWithRelationship(connectToIds, name.trim(), FAMILY_GROUPS.COUSIN);
    this.saveFamily();
    return { success: true };
  }

  /**
   * Add child
   *
   * @param {string} parentId - Parent node ID
   * @param {string} name - Child name
   * @returns {Object} {success: boolean, message?: string}
   */
  addChild(parentId, name) {
    if (!this.graphManager?.hasNode || !this.graphManager.hasNode(parentId)) {
      return { success: false, message: 'Parent not found' };
    }

    if (!name?.trim()) {
      return { success: false, message: 'Child name is required' };
    }

    // Get parent node to determine child group
    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return { success: false, message: 'Graph not initialized' };
    }

    const parent = graphInstance.data.nodes.find(n => n.id === parentId);
    if (!parent) {
      return { success: false, message: 'Parent not found' };
    }

    let childGroup = FAMILY_GROUPS.CHILD;

    // Determine child group based on parent
    if (parent.group === FAMILY_GROUPS.YOU || parent.group === FAMILY_GROUPS.PARTNER) {
      childGroup = FAMILY_GROUPS.CHILD;
    } else if (parent.group === FAMILY_GROUPS.SIBLING) {
      childGroup = FAMILY_GROUPS.NIECE_NEPHEW;
    } else {
      childGroup = FAMILY_GROUPS.CHILD;
    }

    // Find partner of the parent (if any) - children should connect to both parents
    const links = graphInstance.data.links;
    const partnerId = links
      .filter(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return (sourceId === parentId || targetId === parentId);
      })
      .map(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return sourceId === parentId ? targetId : sourceId;
      })
      .map(partnerId => {
        return graphInstance.data.nodes.find(n => n.id === partnerId);
      })
      .find(node => node && node.group === FAMILY_GROUPS.PARTNER);

    // Connect to parent AND partner (if partner exists)
    const connectToIds = [parentId];
    if (partnerId) {
      connectToIds.push(partnerId.id);
    }

    this.addNodeWithRelationship(connectToIds, name.trim(), childGroup);
    this.saveFamily();
    return { success: true };
  }

  /**
   * Add niece/nephew
   *
   * @param {string} siblingId - Sibling node ID
   * @param {string} name - Niece/nephew name
   * @returns {Object} {success: boolean, message?: string}
   */
  addNieceNephew(siblingId, name) {
    if (!this.graphManager?.hasNode || !this.graphManager.hasNode(siblingId)) {
      return { success: false, message: 'Sibling not found' };
    }

    if (!name?.trim()) {
      return { success: false, message: 'Niece/nephew name is required' };
    }

    const graphInstance = this.getGraphInstance();
    if (!graphInstance?.data) {
      return { success: false, message: 'Graph not initialized' };
    }

    // Find partner of the sibling (if any) - nieces/nephews should connect to both parents
    const links = graphInstance.data.links;
    const partnerId = links
      .filter(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return (sourceId === siblingId || targetId === siblingId);
      })
      .map(link => {
        const sourceId = normalizeLinkId(link.source);
        const targetId = normalizeLinkId(link.target);
        return sourceId === siblingId ? targetId : sourceId;
      })
      .map(partnerId => {
        return graphInstance.data.nodes.find(n => n.id === partnerId);
      })
      .find(node => node && node.group === FAMILY_GROUPS.PARTNER);

    // Connect to sibling AND partner (if partner exists)
    const connectToIds = [siblingId];
    if (partnerId) {
      connectToIds.push(partnerId.id);
    }

    this.addNodeWithRelationship(connectToIds, name.trim(), FAMILY_GROUPS.NIECE_NEPHEW);
    this.saveFamily();
    return { success: true };
  }

  /**
   * Add partner/spouse
   *
   * @param {string} personId - Person node ID
   * @param {string} partnerName - Partner name
   * @returns {Object} {success: boolean, message?: string}
   */
  addPartner(personId, partnerName) {
    if (!this.graphManager?.hasNode || !this.graphManager.hasNode(personId)) {
      return { success: false, message: 'Person not found' };
    }

    if (!partnerName?.trim()) {
      return { success: false, message: 'Partner name is required' };
    }

    // Check if person already has a partner
    if (this.validation.hasPartner(personId)) {
      return { success: false, message: `${personId} already has a partner!` };
    }

    // Determine contextual relationship label based on who the partner belongs to
    const graphInstance = this.getGraphInstance();
    let customRelationship = null;
    if (graphInstance?.data) {
      const person = graphInstance.data.nodes.find(n => n.id === personId);
      if (person) {
        const personRelationship = person.relationship || getRelationshipLabel(person.group);
        // Create contextual relationship label
        if (personRelationship === 'You') {
          customRelationship = 'Your Partner/Spouse';
        } else {
          customRelationship = `${personRelationship}'s Partner`;
        }
      }
    }

    this.addNodeWithRelationship([personId], partnerName.trim(), FAMILY_GROUPS.PARTNER, null, customRelationship);
    this.saveFamily();
    return { success: true };
  }
}

