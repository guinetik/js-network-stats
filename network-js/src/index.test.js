import { describe, test, expect } from 'vitest';
import getNetworkStats from "./index.js";
import networkCaruaru from "../data/network_caruaru.json" assert { type: "json" };

describe("It should return stats on valid data", () => {
  test.skip("basic", () => {
    const edge_data = [
      { source: "id1", target: "id2" },
      { source: "id2", target: "id3" },
      { source: "id3", target: "id1" },
    ];
    const stats = getNetworkStats(edge_data, null, { verbose: true });
    expect(stats).toBeDefined();
    expect(stats[0].eigenvector).toEqual(0.5773502691896257);
    expect(stats[1].eigenvector).toEqual(0.5773502691896257);
    expect(stats[2].eigenvector).toEqual(0.5773502691896257);
    //
    expect(stats[0].betweenness).toEqual(0);
    expect(stats[1].betweenness).toEqual(0);
    expect(stats[2].betweenness).toEqual(0);
    //
    expect(stats[0].clustering).toEqual(1);
    expect(stats[1].clustering).toEqual(1);
    expect(stats[2].clustering).toEqual(1);
    //
    expect(stats[0].cliques).toEqual(1);
    expect(stats[1].cliques).toEqual(1);
    expect(stats[2].cliques).toEqual(1);
    //
    expect(stats[0].degree).toEqual(2);
    expect(stats[1].degree).toEqual(2);
    expect(stats[2].degree).toEqual(2);
    //
    expect(stats[0].modularity).toEqual(0);
    expect(stats[1].modularity).toEqual(1);
    expect(stats[2].modularity).toEqual(2);
  });

  test("feature:betweenness", () => {
    const edge_data = [
      { source: "id1", target: "id2" },
      { source: "id2", target: "id3" },
      { source: "id3", target: "id1" },
    ];
    const stats = getNetworkStats(edge_data, ["betweenness"], { verbose: false });
    expect(stats).toBeDefined();
    //
    expect(stats[0].betweenness).toEqual(0);
    expect(stats[1].betweenness).toEqual(0);
    expect(stats[2].betweenness).toEqual(0);
  });

  test.skip("feature:modularity", () => {
    const edge_data = [
      { source: "id1", target: "id2" },
      { source: "id2", target: "id3" },
      { source: "id3", target: "id1" },
    ];
    const stats = getNetworkStats(edge_data, ["modularity"], { verbose: false });
    expect(stats).toBeDefined();
    //
    expect(stats[0].modularity).toEqual(0);
    expect(stats[1].modularity).toEqual(1);
    expect(stats[2].modularity).toEqual(2);
  });

  test("feature:clustering", () => {
    const edge_data = [
      { source: "id1", target: "id2" },
      { source: "id2", target: "id3" },
      { source: "id3", target: "id1" },
    ];
    const stats = getNetworkStats(edge_data, ["clustering"], { verbose: false });
    expect(stats).toBeDefined();
    //
    expect(stats[0].clustering).toEqual(1);
    expect(stats[1].clustering).toEqual(1);
    expect(stats[2].clustering).toEqual(1);
  });

  test("feature:cliques", () => {
    const edge_data = [
      { source: "id1", target: "id2" },
      { source: "id2", target: "id3" },
      { source: "id3", target: "id1" },
    ];
    const stats = getNetworkStats(edge_data, ["cliques"], { verbose: false });
    expect(stats).toBeDefined();
    //
    expect(stats[0].cliques).toEqual(1);
    expect(stats[1].cliques).toEqual(1);
    expect(stats[2].cliques).toEqual(1);
  });

  test("feature:degree", () => {
    const edge_data = [
      { source: "id1", target: "id2" },
      { source: "id2", target: "id3" },
      { source: "id3", target: "id1" },
    ];
    const stats = getNetworkStats(edge_data, ["degree"], { verbose: false });
    expect(stats).toBeDefined();
    //
    expect(stats[0].degree).toEqual(2);
    expect(stats[1].degree).toEqual(2);
    expect(stats[2].degree).toEqual(2);
  });

  test("network_caruaru", () => {
    const stats = getNetworkStats(networkCaruaru, null, {
      verbose: false,
      maxIter: 100000,
    });
    expect(stats).toBeDefined();
    expect(stats.length).toEqual(105);
    // Use tolerance check for floating point comparison (our implementation vs jsnetworkx)
    expect(stats[0].eigenvector).toBeCloseTo(0.012707156721008774, 5);
  });
});
