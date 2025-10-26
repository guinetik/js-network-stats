/**
 * Graph data adapters for @guinetik/network-js
 *
 * Convert between various graph formats and the standard GraphData format.
 *
 * @module adapters
 *
 * @example
 * import { CSVAdapter, JSONAdapter, NetworkXAdapter } from '@guinetik/network-js';
 *
 * // CSV
 * const data1 = await CSVAdapter.loadFromURL('../edges.csv');
 *
 * // JSON (D3, Cytoscape, etc.)
 * const data2 = JSONAdapter.fromD3(d3Data);
 *
 * // NetworkX (Python interop)
 * const data3 = NetworkXAdapter.fromNodeLink(nxData);
 */

import { Adapter } from './adapter.js';
import { CSVAdapter } from './csv.js';
import { JSONAdapter } from './json.js';
import { NetworkXAdapter } from './networkx.js';

export { Adapter, CSVAdapter, JSONAdapter, NetworkXAdapter };

export default {
  Adapter,
  CSVAdapter,
  JSONAdapter,
  NetworkXAdapter
};
