import { Connection } from "./connection.js";

export class Louvain {
  constructor() {
    // Constants
    this.PASS_MAX = -1;
    this.MIN = 0.0000001;

    // Local vars
    this.originalGraphNodes = [];
    this.originalGraphEdges = [];
    this.originalGraph = {};
    this.partitionInit = undefined;
  }

  // Set nodes
  setNodes(nodes) {
    this.originalGraphNodes = nodes;
    return this;
  }

  // Set edges
  setEdges(edges) {
    if (!this.originalGraphNodes.length && edges.length > 0) {
      throw new Error("Please provide the graph nodes first!");
    }

    // Ensure all edges are Connection instances
    this.originalGraphEdges = edges.map((edge) =>
      edge instanceof Connection
        ? edge
        : new Connection(edge.source, edge.target, edge.weight || 1)
    );

    // Only proceed with creating the association matrix if there are edges
    if (edges.length > 0) {
      const assocMat = this.#makeAssocMat(this.originalGraphEdges);
      this.originalGraph = {
        nodes: this.originalGraphNodes,
        edges: this.originalGraphEdges,
        _assoc_mat: assocMat,
      };
    } else {
      // Handle empty edges case
      this.originalGraph = {
        nodes: this.originalGraphNodes,
        edges: [],
        _assoc_mat: {},
      };
    }

    return this;
  }

  // Set initial partition
  setPartitionInit(partition) {
    this.partitionInit = partition;
    return this;
  }

  // Execute the algorithm and return community partition
  execute() {
    // Handle special case: empty graph or no edges
    if (!this.originalGraphEdges || this.originalGraphEdges.length === 0) {
      const communities = {};
      this.originalGraphNodes.forEach((node) => {
        communities[node] = node;
      });
      return communities;
    }

    const dendogram = this.#generateDendogram(
      this.originalGraph,
      this.partitionInit
    );
    return this.#partitionAtLevel(dendogram, dendogram.length - 1);
  }

  // Helper methods
  #makeSet(array) {
    const set = new Set(array);
    return [...set];
  }

  #objValues(obj) {
    return Object.values(obj);
  }

  #getDegreeForNode(graph, node) {
    const neighbours = graph._assoc_mat[node]
      ? Object.keys(graph._assoc_mat[node])
      : [];

    return neighbours.reduce((weight, neighbour) => {
      let value = graph._assoc_mat[node][neighbour] || 1;
      if (node === neighbour) {
        value *= 2;
      }
      return weight + value;
    }, 0);
  }

  #getNeighboursOfNode(graph, node) {
    return graph._assoc_mat[node] ? Object.keys(graph._assoc_mat[node]) : [];
  }

  #getEdgeWeight(graph, node1, node2) {
    return graph._assoc_mat[node1] ? graph._assoc_mat[node1][node2] : undefined;
  }

  #getGraphSize(graph) {
    return graph.edges.reduce((size, edge) => size + edge.weight, 0);
  }

  #addEdgeToGraph(graph, connection) {
    // Create a Connection object if needed
    const edge =
      connection instanceof Connection
        ? connection
        : new Connection(
            connection.source,
            connection.target,
            connection.weight || 1
          );

    this.#updateAssocMat(graph, edge);

    // Use the Connection's id method to find existing edges
    const edgeIndex = graph.edges.findIndex((e) =>
      e instanceof Connection
        ? e.id === edge.id
        : `${e.source}_${e.target}` === `${edge.source}_${edge.target}`
    );

    if (edgeIndex !== -1) {
      graph.edges[edgeIndex].weight = edge.weight;
    } else {
      graph.edges.push(edge);
    }
  }

  #makeAssocMat(edgeList) {
    return edgeList.reduce((mat, edge) => {
      // Initialize if not exists
      mat[edge.source] = mat[edge.source] || {};
      mat[edge.target] = mat[edge.target] || {};

      // Set weights in both directions
      mat[edge.source][edge.target] = edge.weight;
      mat[edge.target][edge.source] = edge.weight;

      return mat;
    }, {});
  }

  #updateAssocMat(graph, edge) {
    graph._assoc_mat[edge.source] = graph._assoc_mat[edge.source] || {};
    graph._assoc_mat[edge.target] = graph._assoc_mat[edge.target] || {};

    graph._assoc_mat[edge.source][edge.target] = edge.weight;
    graph._assoc_mat[edge.target][edge.source] = edge.weight;
  }

  #clone(obj) {
    if (obj === null || typeof obj !== "object") return obj;

    // Special handling for Connection objects
    if (obj instanceof Connection) {
      return obj.clone();
    }

    return structuredClone(obj); // ES2022 method for deep cloning
  }

  // Core algorithm methods
  #initStatus(graph, status, part) {
    status.nodes_to_com = {};
    status.total_weight = 0;
    status.internals = {};
    status.degrees = {};
    status.gdegrees = {};
    status.loops = {};
    status.total_weight = this.#getGraphSize(graph);

    if (part === undefined) {
      graph.nodes.forEach((node, i) => {
        status.nodes_to_com[node] = i;
        const deg = this.#getDegreeForNode(graph, node);

        if (deg < 0) throw new Error("Bad graph type, use positive weights!");

        status.degrees[i] = deg;
        status.gdegrees[node] = deg;
        status.loops[node] = this.#getEdgeWeight(graph, node, node) || 0;
        status.internals[i] = status.loops[node];
      });
    } else {
      graph.nodes.forEach((node) => {
        const com = part[node];
        status.nodes_to_com[node] = com;
        const deg = this.#getDegreeForNode(graph, node);
        status.degrees[com] = (status.degrees[com] || 0) + deg;
        status.gdegrees[node] = deg;

        let inc = 0.0;
        const neighbours = this.#getNeighboursOfNode(graph, node);

        neighbours.forEach((neighbour) => {
          const weight = graph._assoc_mat[node][neighbour];

          if (weight <= 0) {
            throw new Error("Bad graph type, use positive weights");
          }

          if (part[neighbour] === com) {
            if (neighbour === node) {
              inc += weight;
            } else {
              inc += weight / 2.0;
            }
          }
        });

        status.internals[com] = (status.internals[com] || 0) + inc;
      });
    }
  }

  #modularity(status) {
    const links = status.total_weight;
    let result = 0.0;

    const communities = this.#makeSet(this.#objValues(status.nodes_to_com));

    communities.forEach((com) => {
      const inDegree = status.internals[com] || 0;
      const degree = status.degrees[com] || 0;

      if (links > 0) {
        result += inDegree / links - Math.pow(degree / (2.0 * links), 2);
      }
    });

    return result;
  }

  #neighcom(node, graph, status) {
    const weights = {};
    const neighbourhood = this.#getNeighboursOfNode(graph, node);

    neighbourhood.forEach((neighbour) => {
      if (neighbour !== node) {
        const weight = graph._assoc_mat[node][neighbour] || 1;
        const neighbourcom = status.nodes_to_com[neighbour];
        weights[neighbourcom] = (weights[neighbourcom] || 0) + weight;
      }
    });

    return weights;
  }

  #insert(node, com, weight, status) {
    status.nodes_to_com[node] = +com;
    status.degrees[com] =
      (status.degrees[com] || 0) + (status.gdegrees[node] || 0);
    status.internals[com] =
      (status.internals[com] || 0) + weight + (status.loops[node] || 0);
  }

  #remove(node, com, weight, status) {
    status.degrees[com] =
      (status.degrees[com] || 0) - (status.gdegrees[node] || 0);
    status.internals[com] =
      (status.internals[com] || 0) - weight - (status.loops[node] || 0);
    status.nodes_to_com[node] = -1;
  }

  #renumber(dict) {
    let count = 0;
    const ret = this.#clone(dict);
    const newValues = {};

    Object.keys(dict).forEach((key) => {
      const value = dict[key];
      let newValue =
        typeof newValues[value] === "undefined" ? -1 : newValues[value];

      if (newValue === -1) {
        newValues[value] = count;
        newValue = count;
        count++;
      }

      ret[key] = newValue;
    });

    return ret;
  }

  #oneLevel(graph, status) {
    let modif = true;
    let nbPassDone = 0;
    let curMod = this.#modularity(status);
    let newMod = curMod;

    while (modif && nbPassDone !== this.PASS_MAX) {
      curMod = newMod;
      modif = false;
      nbPassDone++;

      // For graphs with no edges, skip node processing
      if (graph.edges.length === 0) {
        break;
      }

      graph.nodes.forEach((node) => {
        const comNode = status.nodes_to_com[node];
        const degcTotw =
          (status.gdegrees[node] || 0) / (status.total_weight * 2.0);
        const neighCommunities = this.#neighcom(node, graph, status);

        this.#remove(node, comNode, neighCommunities[comNode] || 0.0, status);

        let bestCom = comNode;
        let bestIncrease = 0;

        Object.keys(neighCommunities).forEach((com) => {
          const incr =
            neighCommunities[com] - (status.degrees[com] || 0.0) * degcTotw;

          if (incr > bestIncrease) {
            bestIncrease = incr;
            bestCom = com;
          }
        });

        this.#insert(node, bestCom, neighCommunities[bestCom] || 0, status);

        if (bestCom !== comNode) {
          modif = true;
        }
      });

      newMod = this.#modularity(status);

      if (newMod - curMod < this.MIN) {
        break;
      }
    }
  }

  #inducedGraph(partition, graph) {
    const ret = { nodes: [], edges: [], _assoc_mat: {} };

    // Add nodes from partition values
    const partitionValues = this.#objValues(partition);
    ret.nodes = ret.nodes.concat(this.#makeSet(partitionValues));

    graph.edges.forEach((edge) => {
      const weight = edge.weight || 1;
      const com1 = partition[edge.source];
      const com2 = partition[edge.target];
      const wPrec = this.#getEdgeWeight(ret, com1, com2) || 0;
      const newWeight = wPrec + weight;

      // Create a proper Connection object
      this.#addEdgeToGraph(ret, new Connection(com1, com2, newWeight));
    });

    return ret;
  }

  #partitionAtLevel(dendogram, level) {
    let partition = this.#clone(dendogram[0]);

    for (let i = 1; i < level + 1; i++) {
      Object.keys(partition).forEach((node) => {
        const com = partition[node];
        partition[node] = dendogram[i][com];
      });
    }

    // Make sure different initial communities stay different
    if (this.partitionInit) {
      const communityMap = {};
      
      // Group nodes by their community
      Object.entries(partition).forEach(([node, community]) => {
        if (!communityMap[community]) {
          communityMap[community] = [];
        }
        communityMap[community].push(node);
      });
      
      // For each community, check if it contains nodes from different initial communities
      Object.entries(communityMap).forEach(([community, nodes]) => {
        const initialCommunities = new Set();
        nodes.forEach(node => {
          if (this.partitionInit[node] !== undefined) {
            initialCommunities.add(this.partitionInit[node]);
          }
        });
        
        // If a community contains nodes from different initial communities, 
        // reassign them to match the initial partitioning
        if (initialCommunities.size > 1) {
          const initialCommunitiesMap = {};
          nodes.forEach(node => {
            const initialCom = this.partitionInit[node];
            if (!initialCommunitiesMap[initialCom]) {
              initialCommunitiesMap[initialCom] = [];
            }
            initialCommunitiesMap[initialCom].push(node);
          });
          
          // Assign new unique communities
          let newComCounter = Math.max(...Object.values(partition)) + 1;
          Object.values(initialCommunitiesMap).forEach(comNodes => {
            if (comNodes.length > 0) {
              const newCom = newComCounter++;
              comNodes.forEach(node => {
                partition[node] = newCom;
              });
            }
          });
        }
      });
    }

    return partition;
  }

  #generateDendogram(graph, partInit) {
    if (graph.edges.length === 0) {
      const part = {};
      graph.nodes.forEach((node) => {
        part[node] = node;
      });
      return [part];
    }

    const status = {};
    this.#initStatus(this.originalGraph, status, partInit);

    let mod = this.#modularity(status);
    const statusList = [];

    this.#oneLevel(this.originalGraph, status);
    let newMod = this.#modularity(status);
    let partition = this.#renumber(status.nodes_to_com);

    statusList.push(partition);
    mod = newMod;

    let currentGraph = this.#inducedGraph(partition, this.originalGraph);
    this.#initStatus(currentGraph, status);

    while (true) {
      this.#oneLevel(currentGraph, status);
      newMod = this.#modularity(status);

      if (newMod - mod < this.MIN) {
        break;
      }

      partition = this.#renumber(status.nodes_to_com);
      statusList.push(partition);

      mod = newMod;
      currentGraph = this.#inducedGraph(partition, currentGraph);
      this.#initStatus(currentGraph, status);
    }

    return statusList;
  }
}

// Factory function to create a new Louvain instance
export function louvain() {
  const instance = new Louvain();
  
  const obj = {
    nodes: (nodes) => {
      instance.setNodes(nodes);
      return obj;
    },
    edges: (edges) => {
      instance.setEdges(edges);
      return instance.execute();
    }
  };
  
  return obj;
}

export default Louvain;
