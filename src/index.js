const jsnetworkx = require("jsnetworkx");
const louvain = require("./lib.louvain");
const FEATURES = {
  EIGENVECTOR: "eigenvector",
  MODULARITY: "modularity",
  BETWEENNESS: "betweenness",
  CLUSTERING: "clustering",
  TRANSITIVITY: "transitivity",
  CLIQUES: "cliques",
  DEGREE: "degree",
  ALL: [
    "degree",
    "modularity",
    "cliques",
    "eigenvector",
    "betweenness",
    "clustering",
  ],
};
/**
 * @typedef NetworkEdge - An edge in a network is one of the connections between nodes or vertices of the network.
 * @type {Object}
 * @property {string} source - The ID of the source node.
 * @property {string} target - The ID of the target node.
 */
/**
 * Generates a set of stats for a given graph network.
 * @param {Array<NetworkEdge>} network - The network to be analyzed.
 * @param {Array<string>} features- a list of features to be included in the stats.
 */
const getNetworkStats = (
  network,
  features,
  options = { maxIter: 100000, verbose: true }
) => {
  console.time("getNetworkStats");
  if (options.verbose) console.log("processing", network.length, "records");
  if (!features) features = FEATURES.ALL;
  //get unique source and target values from network
  const nodes = getDistinctNodes(network, "source").concat(
    getDistinctNodes(network, "target")
  );
  const distinct = nodes.filter((item, pos) => nodes.indexOf(item) === pos);
  const edges = reduce2EdgeTuples(network);
  var G = new jsnetworkx.Graph();
  G.addNodesFrom(distinct);
  G.addEdgesFrom(edges);
  //
  const stats = {};
  if (features.includes(FEATURES.EIGENVECTOR)) {
    try {
      if (options.verbose) console.log("processing EIGENVECTOR");
      stats[FEATURES.EIGENVECTOR] = jsnetworkx.eigenvectorCentrality(G, {
        maxIter: options.maxIter,
      })._stringValues;
    } catch (err) {
      if (options.verbose)
        console.log("error processing FEATURES.EIGENVECTOR:", err);
    }
  }
  //
  if (features.includes(FEATURES.BETWEENNESS)) {
    try {
      if (options.verbose) console.log("processing BETWEENNESS");
      stats[FEATURES.BETWEENNESS] =
        jsnetworkx.betweennessCentrality(G)._stringValues;
    } catch (err) {
      if (options.verbose)
        console.log("error processing FEATURES.BETWEENNESS:", err);
    }
  }
  //
  if (features.includes(FEATURES.CLUSTERING)) {
    try {
      if (options.verbose) console.log("processing CLUSTERING");
      stats[FEATURES.CLUSTERING] = jsnetworkx.clustering(G)._stringValues;
    } catch (err) {
      if (options.verbose)
        console.log("error processing FEATURES.CLUSTERING:", err);
    }
  }
  //
  if (features.includes(FEATURES.CLIQUES)) {
    try {
      if (options.verbose) console.log("processing CLIQUES");
      stats[FEATURES.CLIQUES] = jsnetworkx.numberOfCliques(G)._stringValues;
    } catch (err) {
      if (options.verbose)
        console.log("error processing FEATURES.CLIQUES:", err);
    }
  }
  //
  if (features.includes(FEATURES.DEGREE)) {
    try {
      if (options.verbose) console.log("processing DEGREE");
      stats[FEATURES.DEGREE] = jsnetworkx.degree(G)._stringValues;
    } catch (err) {
      if (options.verbose)
        console.log("error processing FEATURES.DEGREE:", err);
    }
  }
  //
  if (features.includes(FEATURES.MODULARITY)) {
    try {
      if (options.verbose) console.log("processing MODULARITY");
      let community = louvain().nodes(distinct).edges(network);
      stats[FEATURES.MODULARITY] = community();
    } catch (err) {
      if (options.verbose)
        console.log("error processing FEATURES.MODULARITY:", err);
    }
  }
  //
  return normalizeFeatures(stats, distinct);
};

normalizeFeatures = (stats, nodes) => {
  const normalized = [];
  for (const node of nodes) {
    const nodeStats = {};
    nodeStats.id = node;
    for (const feature in stats) {
      nodeStats[feature] = stats[feature][node];
    }
    normalized.push(nodeStats);
  }
  console.timeEnd("getNetworkStats");
  return normalized;
};

const getDistinctNodes = (network, prop) => {
  return network
    .map((item) => item[prop])
    .filter((value, index, self) => self.indexOf(value) === index);
};
const reduce2EdgeTuples = (network) => {
  return network.reduce((acc, curr) => {
    const edge = [];
    edge.push(curr.source);
    edge.push(curr.target);
    acc.push(edge);
    return acc;
  }, []);
};
//
module.exports = getNetworkStats;
