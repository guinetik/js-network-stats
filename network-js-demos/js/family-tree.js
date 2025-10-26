// Alpine.js component for Family Tree controls
export function createFamilyTreeApp(graph, FAMILY_GROUPS, initialData, STORAGE_KEY, DialogForm, saveFamily) {
    return {
        // Action methods
        saveFamily() {
            saveFamily();
            alert('Family tree saved!');
        },

        resetTree() {
            if (confirm('Are you sure you want to reset your family tree?')) {
                localStorage.removeItem(STORAGE_KEY);
                graph.setData(initialData.nodes, initialData.links);
                // Theme automatically applies
            }
        },

        saveImage() {
            graph.saveAsPNG('family-tree.png');
        },

        lockGraph() {
            graph.lockPositions();
        },

        unlockGraph() {
            graph.unlockPositions();
        },

        // Add relatives methods
        async addParents() {
            // Check if parents already exist
            const existingParents = graph.data.nodes.filter(n => n.group === FAMILY_GROUPS.PARENT);
            if (existingParents.length >= 2) {
                alert('You already have 2 parents added. You cannot add more than 2 parents.');
                return;
            }

            const dialog = new DialogForm();
            const names = await dialog.show('Add Parents', [
                { label: 'Parent 1 Name', type: 'text', required: true },
                { label: 'Parent 2 Name', type: 'text', required: false }
            ]);

            if (names && names[0]) {
                // Check how many parents we can add
                const remainingSlots = 2 - existingParents.length;

                if (remainingSlots >= 1) {
                    graph.addNode(['YOU'], names[0], FAMILY_GROUPS.PARENT);
                }
                if (names[1] && remainingSlots >= 2) {
                    graph.addNode(['YOU'], names[1], FAMILY_GROUPS.PARENT);
                } else if (names[1] && remainingSlots < 2) {
                    alert('Only one parent slot available. Added only the first parent.');
                }
                // Theme automatically applies
            }
        },

        async addSibling() {
            const dialog = new DialogForm();
            const names = await dialog.show('Add Sibling', [
                { label: 'Sibling Name', type: 'text', required: true }
            ]);

            if (names && names[0]) {
                graph.addNode(['YOU'], names[0], FAMILY_GROUPS.SIBLING);
                // Theme automatically applies
            }
        },

        async addGrandparents() {
            const parents = graph.data.nodes.filter(n => n.group === FAMILY_GROUPS.PARENT);

            if (parents.length === 0) {
                alert('Please add parents first before adding grandparents.');
                return;
            }

            const parentOptions = parents.map(p => ({ value: p.id, text: p.id }));

            const dialog = new DialogForm();
            const values = await dialog.show('Add Grandparents', [
                { label: "Parent's Side", type: 'select', options: parentOptions, required: true },
                { label: 'Grandparent 1 Name', type: 'text', required: true },
                { label: 'Grandparent 2 Name', type: 'text', required: false }
            ]);

            if (values && values[1]) {
                const parentSide = values[0];

                // Check how many grandparents already exist for this parent
                const existingGrandparents = graph.data.links
                    .filter(link => link.target === parentSide || link.target.id === parentSide)
                    .map(link => typeof link.source === 'object' ? link.source.id : link.source)
                    .map(sourceId => graph.data.nodes.find(n => n.id === sourceId))
                    .filter(node => node && node.group === FAMILY_GROUPS.GRANDPARENT);

                const remainingSlots = 2 - existingGrandparents.length;

                if (remainingSlots === 0) {
                    alert(`${parentSide} already has 2 grandparents. Cannot add more.`);
                    return;
                }

                if (remainingSlots >= 1) {
                    graph.addNode([parentSide], values[1], FAMILY_GROUPS.GRANDPARENT);
                }
                if (values[2] && remainingSlots >= 2) {
                    graph.addNode([parentSide], values[2], FAMILY_GROUPS.GRANDPARENT);
                } else if (values[2] && remainingSlots < 2) {
                    alert('Only one grandparent slot available for this parent. Added only the first grandparent.');
                }
                // Theme automatically applies
            }
        },

        async addUncleAunt() {
            const parents = graph.data.nodes.filter(n => n.group === FAMILY_GROUPS.PARENT);

            if (parents.length === 0) {
                alert('Please add parents first before adding uncles/aunts.');
                return;
            }

            const parentOptions = parents.map(p => ({ value: p.id, text: `${p.id}'s sibling` }));

            const dialog = new DialogForm();
            const values = await dialog.show('Add Uncle/Aunt', [
                { label: "Parent's Side", type: 'select', options: parentOptions, required: true },
                { label: 'Uncle/Aunt Name', type: 'text', required: true }
            ]);

            if (values && values[1]) {
                const parentSide = values[0];
                graph.addNode([parentSide], values[1], FAMILY_GROUPS.UNCLE_AUNT);
                // Theme automatically applies
            }
        },

        async addCousin() {
            const unclesAunts = graph.data.nodes.filter(n => n.group === FAMILY_GROUPS.UNCLE_AUNT);

            if (unclesAunts.length === 0) {
                alert('Please add uncles/aunts first before adding cousins.');
                return;
            }

            const uncleAuntOptions = unclesAunts.map(u => ({ value: u.id, text: `${u.id}'s child` }));

            const dialog = new DialogForm();
            const values = await dialog.show('Add Cousin', [
                { label: 'Uncle/Aunt', type: 'select', options: uncleAuntOptions, required: true },
                { label: 'Cousin Name', type: 'text', required: true }
            ]);

            if (values && values[1]) {
                const uncleAunt = values[0];
                graph.addNode([uncleAunt], values[1], FAMILY_GROUPS.COUSIN);
                // Theme automatically applies
            }
        },

        async addChild() {
            const eligibleParents = graph.data.nodes.filter(n => {
                const group = n.group;
                return group !== FAMILY_GROUPS.GRANDPARENT &&
                       group !== FAMILY_GROUPS.UNCLE_AUNT &&
                       group !== FAMILY_GROUPS.PARENT;
            });

            if (eligibleParents.length === 0) {
                alert('No eligible parents found. Start by adding yourself first!');
                return;
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

            const dialog = new DialogForm();
            const values = await dialog.show('Add Child', [
                { label: 'Parent', type: 'select', options: parentOptions, required: true },
                { label: 'Child Name', type: 'text', required: true }
            ]);

            if (values && values[1]) {
                const parentId = values[0];
                const childName = values[1];

                const parent = graph.data.nodes.find(n => n.id === parentId);
                let childGroup = FAMILY_GROUPS.CHILD;

                if (parent.group === FAMILY_GROUPS.YOU || parent.group === FAMILY_GROUPS.PARTNER) {
                    childGroup = FAMILY_GROUPS.CHILD;
                } else if (parent.group === FAMILY_GROUPS.SIBLING) {
                    childGroup = FAMILY_GROUPS.NIECE_NEPHEW;
                } else {
                    childGroup = FAMILY_GROUPS.CHILD;
                }

                graph.addNode([parentId], childName, childGroup);
                // Theme automatically applies
            }
        },

        async addNieceNephew() {
            const siblings = graph.data.nodes.filter(n => n.group === FAMILY_GROUPS.SIBLING);

            if (siblings.length === 0) {
                alert('Please add siblings first before adding nieces/nephews.');
                return;
            }

            const siblingOptions = siblings.map(s => ({ value: s.id, text: `${s.id}'s child` }));

            const dialog = new DialogForm();
            const values = await dialog.show('Add Niece/Nephew', [
                { label: 'Sibling', type: 'select', options: siblingOptions, required: true },
                { label: 'Niece/Nephew Name', type: 'text', required: true }
            ]);

            if (values && values[1]) {
                const sibling = values[0];
                graph.addNode([sibling], values[1], FAMILY_GROUPS.NIECE_NEPHEW);
                // Theme automatically applies
            }
        },

        async addPartner() {
            // Helper function to check if a person already has a partner
            const hasPartner = (personId) => {
                // Check if this person has any partner connected to them
                const partners = graph.data.links
                    .filter(link => {
                        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                        return (sourceId === personId || targetId === personId);
                    })
                    .map(link => {
                        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                        return sourceId === personId ? targetId : sourceId;
                    })
                    .map(partnerId => graph.data.nodes.find(n => n.id === partnerId))
                    .filter(node => node && node.group === FAMILY_GROUPS.PARTNER);

                return partners.length > 0;
            };

            const eligibleForPartner = graph.data.nodes.filter(n => {
                const group = n.group;
                const isEligibleGroup = group === FAMILY_GROUPS.YOU ||
                       group === FAMILY_GROUPS.SIBLING ||
                       group === FAMILY_GROUPS.COUSIN ||
                       group === FAMILY_GROUPS.UNCLE_AUNT ||
                       group === FAMILY_GROUPS.NIECE_NEPHEW ||
                       group === FAMILY_GROUPS.CHILD;

                // Filter out people who already have a partner
                return isEligibleGroup && !hasPartner(n.id);
            });

            if (eligibleForPartner.length === 0) {
                alert('No eligible people found. Either add family members first, or everyone already has a partner!');
                return;
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

            const dialog = new DialogForm();
            const values = await dialog.show('Add Partner/Spouse', [
                { label: 'Partner Of', type: 'select', options: partnerOptions, required: true },
                { label: 'Partner Name', type: 'text', required: true }
            ]);

            if (values && values[1]) {
                const personId = values[0];
                const partnerName = values[1];

                // Double-check before adding (in case data changed)
                if (hasPartner(personId)) {
                    alert(`${personId} already has a partner!`);
                    return;
                }

                graph.addNode([personId], partnerName, FAMILY_GROUPS.PARTNER);
                // Theme automatically applies
            }
        }
    };
}
