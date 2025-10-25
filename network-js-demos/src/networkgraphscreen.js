export class NetworkGraphScreen {
  constructor(options = {}) {
    this.options = options;
    this.initialData = {
      nodes: [{ id: "Node 1", group: "Group 1" }],
      links: [],
    };
    // Initialize the network graph with just YOU
    this.graph = new NetworkGraph(
      "body",
      window.innerWidth,
      window.innerHeight
    );
  }

  init() {
    if (!this.loadFromLocalStorage()) {
      this.graph.setData(this.initialData.nodes, this.initialData.links);
      // Force centralization and higher initial energy for the default node
      this.graph.centralizeNodes();
      this.graph.simulation.alpha(1.0).restart();
    }
    //
    if (this.options.autoSave) {
      this.autoSaveInterval = setInterval(this.autoSave, 30000);
    }
  }

  loadFromLocalStorage() {
    const savedData =
      this.options.localStorageName || localStorage.getItem("networkData");
    if (!savedData) {
      return false;
    }

    try {
      const networkData = JSON.parse(savedData);
      this.graph.setData(networkData.nodes, networkData.links);
      this.onLoad(networkData);
      this.afterLoad(networkData);
      return true;
    } catch (error) {
      console.error("Error loading family data:", error);
      return false;
    }
  }

  onLoad(networkData) {
    console.log("onLoad", networkData);
  }

  afterLoad(networkData) {
    console.log("afterLoad", networkData);
    this.graph.centralizeNodes();
    this.graph.simulation.alpha(0.3).restart();
  }

  onResize(width, height) {
    this.graph.width = width;
    this.graph.height = height;
    this.graph.svg.attr("width", width).attr("height", height);
    this.graph.simulation.force(
      "center",
      d3.forceCenter(this.graph.width / 2, this.graph.height / 2)
    );
    this.graph.simulation.alpha(0.3).restart();
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
    };
  }

  autoSave() {
    const networkData = this.getSaveData();
    localStorage.setItem(
      this.options.localStorageName || "networkData",
      JSON.stringify(networkData)
    );
    // Optionally show a subtle indicator of auto-save in node-info only if it's empty
    const nodeInfo = this.getNodeInfoTextField();
    if (nodeInfo && nodeInfo.innerHTML === "") {
      nodeInfo.innerHTML = '<small style="color:#999">Auto-saved</small>';
      // Clear the message after 1 second
      setTimeout(() => {
        if (nodeInfo.innerHTML.includes("Auto-saved")) {
          nodeInfo.innerHTML = "";
        }
      }, 1000);
    }
  }

  getNodeInfoTextField() {
    return this.options.nodeInfo || document.getElementById("node-info");
  }

  saveAsImage() {
    const nodeInfo = this.getNodeInfoTextField();

    // First hide the controls and info panels for cleaner capture
    const controls =
      this.options.controls || document.getElementById("controls");
    const legend =
      this.options.legend || document.querySelector(".family-legend");
    const info = this.options.info || document.getElementById("info");

    // Store original display values
    const controlsDisplay = controls.style.display;
    const legendDisplay = legend.style.display;
    const infoDisplay = info.style.display;

    // Temporarily hide UI elements
    controls.style.display = "none";
    legend.style.display = "none";
    info.style.display = "none";

    // Create a temporary div for the title
    const titleDiv = document.createElement("div");
    titleDiv.innerHTML =
      '<h1 style="text-align:center;color:#3f51b5;margin:10px;">My Family Tree</h1>';
    titleDiv.style.position = "absolute";
    titleDiv.style.top = "10px";
    titleDiv.style.left = "0";
    titleDiv.style.right = "0";
    titleDiv.style.zIndex = "1000";
    document.body.appendChild(titleDiv);

    // Use html2canvas to capture the SVG and convert to image
    try {
      // Show a message that we're preparing the image
      if (nodeInfo) {
        nodeInfo.innerHTML = "<strong>Preparing image...</strong>";
      }

      // Wait a bit for any transitions to complete
      setTimeout(() => {
        const svgElement = document.querySelector("svg");

        // Use SVG serialization for better quality
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);

        // Create an image from the SVG
        const img = new Image();
        img.onload = function () {
          // Create a canvas to draw the image
          const canvas = document.createElement("canvas");
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          const ctx = canvas.getContext("2d");

          // Fill with white background
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw the image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to PNG
          const imgURL = canvas.toDataURL("image/png");

          // Create a download link
          const downloadLink = document.createElement("a");
          downloadLink.download = "family-tree.png";
          downloadLink.href = imgURL;
          downloadLink.click();

          // Clean up
          URL.revokeObjectURL(url);

          // Restore UI elements
          controls.style.display = controlsDisplay;
          legend.style.display = legendDisplay;
          info.style.display = infoDisplay;
          document.body.removeChild(titleDiv);

          // Show completion message
          if (nodeInfo) {
            nodeInfo.innerHTML = "<strong>Image saved!</strong>";
            setTimeout(() => {
              if (nodeInfo.innerHTML.includes("Image saved")) {
                nodeInfo.innerHTML = "";
              }
            }, 3000);
          }
        };

        // Handle loading errors
        img.onerror = function () {
          // Restore UI elements
          controls.style.display = controlsDisplay;
          legend.style.display = legendDisplay;
          info.style.display = infoDisplay;
          document.body.removeChild(titleDiv);

          if (nodeInfo) {
            nodeInfo.innerHTML =
              '<strong style="color:red">Error saving image</strong>';
            setTimeout(() => {
              if (nodeInfo.innerHTML.includes("Error saving")) {
                nodeInfo.innerHTML = "";
              }
            }, 3000);
          }
        };

        // Load the SVG as an image
        img.src = url;
      }, 200);
    } catch (error) {
      console.error("Error saving image:", error);

      // Restore UI elements
      controls.style.display = controlsDisplay;
      legend.style.display = legendDisplay;
      info.style.display = infoDisplay;
      if (document.body.contains(titleDiv)) {
        document.body.removeChild(titleDiv);
      }

      if (nodeInfo) {
        nodeInfo.innerHTML =
          '<strong style="color:red">Error saving image</strong>';
        setTimeout(() => {
          if (nodeInfo.innerHTML.includes("Error saving")) {
            nodeInfo.innerHTML = "";
          }
        }, 3000);
      }
    }
  }

  lockGraphPositions() {
    // Update node info to show action in progress
    const nodeInfo = this.getNodeInfoTextField();
    if (nodeInfo) {
      nodeInfo.innerHTML = "<strong>Locking graph positions...</strong>";
    }

    // Use the graph class's lock method
    this.graph.lockPositions();

    // Update the node info after a delay
    setTimeout(() => {
      if (nodeInfo && nodeInfo.innerHTML.includes("Locking graph")) {
        nodeInfo.innerHTML = "<strong>Graph locked!</strong>";

        // Clear the message after 2 seconds
        setTimeout(() => {
          if (nodeInfo.innerHTML.includes("Graph locked")) {
            nodeInfo.innerHTML = "";
          }
        }, 2000);
      }
    }, 500);
  }

  unlockGraphPositions() {
    // Update node info to show action in progress
    const nodeInfo =
      this.options.nodeInfo || document.getElementById("node-info");
    if (nodeInfo) {
      nodeInfo.innerHTML = "<strong>Unlocking graph positions...</strong>";
    }

    // Use the graph class's unlock method
    this.graph.unlockPositions();

    // Update the node info after a delay
    setTimeout(() => {
      if (nodeInfo && nodeInfo.innerHTML.includes("Unlocking graph")) {
        nodeInfo.innerHTML = "<strong>Graph unlocked!</strong>";

        // Clear the message after 2 seconds
        setTimeout(() => {
          if (nodeInfo.innerHTML.includes("Graph unlocked")) {
            nodeInfo.innerHTML = "";
          }
        }, 2000);
      }
    }, 500);
  }
}
