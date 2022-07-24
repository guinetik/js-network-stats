const getNetworkStats = require("./index");
const networkCaruaru = require("../data/network_caruaru.json");
const networkRio = require("../data/network_rj.json");
const networkNiteroi = require("../data/network_niteroi.json");

const argz = process.argv.slice(2);
switch (argz[0]) {
  case "caruaru":
    console.table(getNetworkStats(networkCaruaru));
    break;
  case "rj":
    console.table(getNetworkStats(networkRio));
    break;
  case "niteroi":
    console.table(getNetworkStats(networkNiteroi));
    break;
  case "basic":
    const edge_data = [
      { source: "id1", target: "id2" },
      { source: "id2", target: "id3" },
      { source: "id3", target: "id1" },
    ];
    const stats = getNetworkStats(edge_data, null, { verbose: true });
    console.log("stats", stats);
    break;
  default:
    console.log("Usage: node runner  [caruaru|rj|niteroi|basic]");
}