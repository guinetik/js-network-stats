/**
 * Family relationship group constants
 */
export const FAMILY_GROUPS = {
  YOU: 1,
  PARENT: 2,
  SIBLING: 3,
  UNCLE_AUNT: 4,
  COUSIN: 5,
  GRANDPARENT: 6,
  NIECE_NEPHEW: 7,
  CHILD: 8,
  PARTNER: 9
};

/**
 * Group color mapping
 */
export const GROUP_COLORS = {
  [FAMILY_GROUPS.YOU]: '#9333ea',           // Purple
  [FAMILY_GROUPS.PARENT]: '#ec4899',        // Pink
  [FAMILY_GROUPS.SIBLING]: '#3b82f6',       // Blue
  [FAMILY_GROUPS.UNCLE_AUNT]: '#f97316',    // Orange
  [FAMILY_GROUPS.COUSIN]: '#a855f7',        // Purple light
  [FAMILY_GROUPS.GRANDPARENT]: '#b45309',   // Amber dark
  [FAMILY_GROUPS.NIECE_NEPHEW]: '#06b6d4',  // Cyan
  [FAMILY_GROUPS.CHILD]: '#14b8a6',         // Teal
  [FAMILY_GROUPS.PARTNER]: '#f43f5e'        // Rose
};

/**
 * Get relationship label for a group
 * @param {number} group - Family group constant
 * @param {string} [genderHint] - Optional hint for gender-specific terms (e.g., 'father' vs 'mother')
 * @returns {string} Human-readable relationship label
 */
export function getRelationshipLabel(group, genderHint = null) {
  switch (group) {
    case FAMILY_GROUPS.YOU:
      return 'You';
    case FAMILY_GROUPS.PARENT:
      return genderHint === 'male' ? 'Father' : genderHint === 'female' ? 'Mother' : 'Parent';
    case FAMILY_GROUPS.SIBLING:
      return genderHint === 'male' ? 'Brother' : genderHint === 'female' ? 'Sister' : 'Sibling';
    case FAMILY_GROUPS.UNCLE_AUNT:
      return genderHint === 'male' ? 'Uncle' : genderHint === 'female' ? 'Aunt' : 'Uncle/Aunt';
    case FAMILY_GROUPS.COUSIN:
      return 'Cousin';
    case FAMILY_GROUPS.GRANDPARENT:
      return genderHint === 'male' ? 'Grandfather' : genderHint === 'female' ? 'Grandmother' : 'Grandparent';
    case FAMILY_GROUPS.NIECE_NEPHEW:
      return genderHint === 'male' ? 'Nephew' : genderHint === 'female' ? 'Niece' : 'Niece/Nephew';
    case FAMILY_GROUPS.CHILD:
      return genderHint === 'male' ? 'Son' : genderHint === 'female' ? 'Daughter' : 'Child';
    case FAMILY_GROUPS.PARTNER:
      return genderHint === 'male' ? 'Husband' : genderHint === 'female' ? 'Wife' : 'Partner/Spouse';
    default:
      return 'Relative';
  }
}

/**
 * Initial family tree data (just YOU)
 */
export const INITIAL_DATA = {
  nodes: [
    { id: 'YOU', group: FAMILY_GROUPS.YOU, relationship: 'You' }
  ],
  links: []
};

/**
 * Storage key for family tree data
 */
export const STORAGE_KEY = 'familyTree';

