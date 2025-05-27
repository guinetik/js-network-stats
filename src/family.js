import { NetworkGraphScreen } from "./networkgraphscreen";

export class FamilyTreeScreen extends NetworkGraphScreen {
  constructor(initialData, options = {}) {
    if (!initialData) {
      initialData = {
        nodes: [{ id: "YOU", group: FAMILY_GROUPS.YOU }],
        links: [],
      };
    }
    super(initialData, options);
    this.familyRelations = {
      parents: new Map(), // Maps parent name to parent node
      siblings: new Set(), // Set of sibling IDs
      uncles: new Map(), // Maps uncle/aunt name to parent they're related to
      cousins: new Map(), // Maps cousin name to their parent name
    };
    //
    this.graph.setNodeInfoCallback = (node) => {
      const nodeInfo = this.getNodeInfoTextField();
      if (nodeInfo) {
        const groupName = FamilyTreeScreen.GROUP_NAMES[node.group] || "Unknown";
        nodeInfo.innerHTML = `<strong>${
          node.id
        }</strong><br>Relation: ${groupName}<br/>Centrality: ${node.centrality.toFixed(
          4
        )}`;
      }
    };
    //
    // Initialize the dialog system
    this.dialogs = new DialogForm();
  }

  onLoad(familyData) {
    this.familyRelations.parents = new Map(familyData.familyRelations.parents);
    this.familyRelations.siblings = new Set(
      familyData.familyRelations.siblings
    );
    this.familyRelations.uncles = new Map(familyData.familyRelations.uncles);
    this.familyRelations.cousins = new Map(familyData.familyRelations.cousins);
  }

  getSaveData() {
    return {
      nodes: this.graph.data.nodes.map((node) => ({
        id: node.id,
        group: node.group,
        x: node.x,
        y: node.y,
        fx: node.fx,
        fy: node.fy,
      })),
      links: this.graph.data.links.map((link) => ({
        source: typeof link.source === "object" ? link.source.id : link.source,
        target: typeof link.target === "object" ? link.target.id : link.target,
      })),
      familyRelations: {
        parents: Array.from(this.familyRelations.parents.entries()),
        siblings: Array.from(this.familyRelations.siblings),
        uncles: Array.from(this.familyRelations.uncles.entries()),
        cousins: Array.from(this.familyRelations.cousins.entries()),
      },
    };
  }

  addParents() {
    // Check if parents already exist
    if (this.familyRelations.parents.size >= 2) {
      alert("You already have two parents added!");
      return;
    }

    // Create form for parents
    const motherInput = this.dialogs.createInput(
      "Mother's Name:",
      "text",
      "mother-name"
    );
    const fatherInput = this.dialogs.createInput(
      "Father's Name:",
      "text",
      "father-name"
    );

    const content = document.createElement("div");
    content.appendChild(motherInput.container);
    content.appendChild(fatherInput.container);

    this.dialogs.createModal("Add Parents", content, [
      {
        text: "Cancel",
        primary: false,
      },
      {
        text: "Add",
        primary: true,
        onClick: () => {
          const motherName = motherInput.input.value.trim();
          const fatherName = fatherInput.input.value.trim();

          if (!motherName || !fatherName) {
            alert("Please enter both names");
            return;
          }

          // Add mother node connected to YOU
          if (!this.familyRelations.parents.has(motherName)) {
            const motherNode = this.graph.addNode(
              ["YOU"],
              motherName,
              FamilyTreeScreen.FAMILY_GROUPS.PARENT
            );
            this.familyRelations.parents.set(motherName, motherNode);
            console.log(`Added mother: ${motherName}`);
          }

          // Add father node connected to YOU
          if (!this.familyRelations.parents.has(fatherName)) {
            const fatherNode = this.graph.addNode(
              ["YOU"],
              fatherName,
              FamilyTreeScreen.FAMILY_GROUPS.PARENT
            );
            this.familyRelations.parents.set(fatherName, fatherNode);
            console.log(`Added father: ${fatherName}`);
          }

          // Connect parents to each other
          this.graph.addLink(motherName, fatherName);
        },
      },
    ]);
  }

  addSibling() {
    // Check if parents exist
    if (this.familyRelations.parents.size === 0) {
      alert("Please add parents first!");
      return;
    }

    const siblingInput = this.dialogs.createInput(
      "Sibling's Name:",
      "text",
      "sibling-name"
    );
    const spouseInput = this.dialogs.createInput(
      "Spouse's Name (optional):",
      "text",
      "spouse-name"
    );

    const content = document.createElement("div");
    content.appendChild(siblingInput.container);
    content.appendChild(spouseInput.container);

    this.dialogs.createModal("Add Sibling", content, [
      {
        text: "Cancel",
        primary: false,
      },
      {
        text: "Add",
        primary: true,
        onClick: () => {
          const siblingName = siblingInput.input.value.trim();
          const spouseName = spouseInput.input.value.trim();

          if (!siblingName) {
            alert("Please enter a name");
            return;
          }

          if (this.familyRelations.siblings.has(siblingName)) {
            alert(`Sibling ${siblingName} already exists!`);
            return;
          }

          // Connect sibling to both parents
          const parentIds = Array.from(this.familyRelations.parents.keys());
          const siblingNode = this.graph.addNode(
            parentIds,
            siblingName,
            FamilyTreeScreen.FAMILY_GROUPS.SIBLING
          );

          // Store the sibling reference
          this.familyRelations.siblings.add(siblingName);

          console.log(
            `Added sibling: ${siblingName} connected to parents: ${parentIds.join(
              ", "
            )}`
          );

          // If spouse name provided, add spouse and connect to sibling
          if (spouseName) {
            // Check if spouse already exists
            if (!this.graph.hasNode(spouseName)) {
              // Add spouse node (not connected to parents, just to sibling)
              const spouseNode = this.graph.addNode(
                [siblingName],
                spouseName,
                FamilyTreeScreen.FAMILY_GROUPS.SIBLING
              );
              console.log(
                `Added spouse: ${spouseName} connected to ${siblingName}`
              );
            } else {
              // If spouse already exists, just connect them
              this.graph.addLink(siblingName, spouseName);
              console.log(
                `Connected existing person ${spouseName} as spouse to ${siblingName}`
              );
            }
          }
        },
      },
    ]);
  }

  addUncle() {
    // Check if parents exist first
    if (this.familyRelations.parents.size < 2) {
      alert("Please add both parents first!");
      return;
    }

    // Get parent IDs
    const parentIds = Array.from(this.familyRelations.parents.keys());

    // Create grandparent pairs grouped by parent side
    const grandparentPairs = new Map();

    // Find grandparent pairs for each parent
    for (const parentId of parentIds) {
      // Find all grandparents connected to this parent
      const connectedGrandparents = [];

      graph.data.links.forEach((link) => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;

        // If this link connects a parent and a grandparent
        if (sourceId === parentId || targetId === parentId) {
          const otherNode = sourceId === parentId ? targetId : sourceId;

          // Check if the other node is a grandparent
          const isGrandparent = this.graph.data.nodes.some(
            (node) =>
              node.id === otherNode &&
              node.group === FamilyTreeScreen.FAMILY_GROUPS.GRANDPARENT
          );

          if (isGrandparent) {
            connectedGrandparents.push(otherNode);
          }
        }
      });

      // If we found a pair of grandparents for this parent
      if (connectedGrandparents.length === 2) {
        grandparentPairs.set(parentId, connectedGrandparents);
      }
    }

    // Check if we have any grandparent pairs
    if (grandparentPairs.size === 0) {
      alert(
        "Please add complete sets of grandparents first (maternal and/or paternal)!"
      );
      return;
    }

    // Create parent side options
    const sideOptions = [];

    for (const [parentId, grandparents] of grandparentPairs.entries()) {
      sideOptions.push({
        value: parentId,
        text: `${parentId}'s side (${grandparents.join(" & ")})`,
      });
    }

    // Create the dialog
    const parentSideSelect = this.dialogs.createSelect(
      "Which side:",
      sideOptions,
      "parent-side-select"
    );
    const uncleInput = this.dialogs.createInput(
      "Uncle/Aunt's Name:",
      "text",
      "uncle-name"
    );
    const spouseInput = this.dialogs.createInput(
      "Spouse's Name (optional):",
      "text",
      "spouse-name"
    );

    const content = document.createElement("div");
    content.appendChild(parentSideSelect.container);
    content.appendChild(uncleInput.container);
    content.appendChild(spouseInput.container);

    this.dialogs.createModal("Add Uncle/Aunt", content, [
      {
        text: "Cancel",
        primary: false,
      },
      {
        text: "Add",
        primary: true,
        onClick: () => {
          const parentSide = parentSideSelect.select.value;
          const uncleName = uncleInput.input.value.trim();
          const spouseName = spouseInput.input.value.trim();

          if (!uncleName) {
            alert("Please enter uncle/aunt's name");
            return;
          }

          if (familyRelations.uncles.has(uncleName)) {
            alert(`Uncle/Aunt ${uncleName} already exists!`);
            return;
          }

          // Get the grandparents for this parent's side
          const grandparents = grandparentPairs.get(parentSide);

          if (!grandparents || grandparents.length !== 2) {
            alert(
              "Could not find a complete pair of grandparents for this side!"
            );
            return;
          }

          // Add uncle/aunt connected to BOTH grandparents on this side
          const uncleNode = this.graph.addNode(
            grandparents,
            uncleName,
            FamilyTreeScreen.FAMILY_GROUPS.UNCLE_AUNT
          );

          // Store the relationship to the parent
          this.familyRelations.uncles.set(uncleName, parentSide);

          console.log(
            `Added uncle/aunt: ${uncleName} connected to grandparents ${grandparents.join(
              " & "
            )} (${parentSide}'s side)`
          );

          // If spouse name provided, add spouse and connect to uncle/aunt
          if (spouseName) {
            // Check if spouse already exists
            if (!graph.hasNode(spouseName)) {
              // Add spouse node (not connected to grandparents, just to uncle/aunt)
              const spouseNode = this.graph.addNode(
                [uncleName],
                spouseName,
                FamilyTreeScreen.FAMILY_GROUPS.UNCLE_AUNT
              );
              console.log(
                `Added spouse: ${spouseName} connected to ${uncleName}`
              );

              // Store spouse relationship too
              familyRelations.uncles.set(spouseName, parentSide);
            } else {
              // If spouse already exists, just connect them
              graph.addLink(uncleName, spouseName);
              console.log(
                `Connected existing person ${spouseName} as spouse to ${uncleName}`
              );
            }
          }
        },
      },
    ]);
  }

  resetFamily() {
    // Use node-info for confirmation instead of an alert
    const nodeInfo = this.getNodeInfoTextField();

    // Show confirmation request
    if (nodeInfo) {
      nodeInfo.innerHTML = `
            <strong>Reset family tree?</strong><br>
            <button id="confirm-reset" style="background:#f44336;color:white;border:none;padding:5px;margin-right:5px;cursor:pointer;">Yes</button>
            <button id="cancel-reset" style="background:#9e9e9e;color:white;border:none;padding:5px;cursor:pointer;">No</button>
        `;
      // Add event listeners for the confirmation buttons
      document.getElementById("confirm-reset").addEventListener("click", () => {
        localStorage.removeItem(this.options.localStorageName || "networkData");
        // Reset family relations
        this.familyRelations.parents = new Map();
        this.familyRelations.siblings = new Set();
        this.familyRelations.uncles = new Map();
        this.familyRelations.cousins = new Map();
        // Reset graph to initial state
        this.graph.setData(
          FamilyTreeScreen.initialData.nodes,
          FamilyTreeScreen.initialData.links
        );
        // Show reset confirmation
        nodeInfo.innerHTML = "<strong>Family tree reset complete!</strong>";
        // Clear the message after 3 seconds
        setTimeout(() => {
          if (nodeInfo.innerHTML.includes("reset complete")) {
            nodeInfo.innerHTML = "";
          }
        }, 3000);
      });
      document.getElementById("cancel-reset").addEventListener("click", () => {
        // Clear the confirmation
        nodeInfo.innerHTML = "";
      });
    }
  }

  // Define family relationship groups
  static FAMILY_GROUPS = {
    YOU: 1,
    PARENT: 2,
    SIBLING: 3,
    UNCLE_AUNT: 4,
    COUSIN: 5,
    GRANDPARENT: 6,
    NIECE_NEPHEW: 7,
    CHILD: 8,
  };

  // Group names for display
  static GROUP_NAMES = {
    1: "You",
    2: "Parent",
    3: "Sibling",
    4: "Uncle/Aunt",
    5: "Cousin",
    6: "Grandparent",
    7: "Niece/Nephew",
    8: "Child",
  };

  // Color mapping to ensure correct colors
  static GROUP_COLORS = {
    1: "#3f51b5", // You (blue-purple)
    2: "#e91e63", // Parent (pink)
    3: "#2196f3", // Sibling (blue)
    4: "#ff9800", // Uncle/Aunt (orange)
    5: "#9c27b0", // Cousin (purple)
    6: "#795548", // Grandparent (brown)
    7: "#4caf50", // Niece/Nephew (green)
    8: "#00bcd4", // Child (teal)
  };
}
