import { getNetworkStats, FEATURES } from './index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadNetwork(name) {
  const path = join(__dirname, '..', 'data', `network_${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'caruaru':
    console.table(getNetworkStats(loadNetwork('caruaru')));
    break;

  case 'rj':
    console.table(getNetworkStats(loadNetwork('rj')));
    break;

  case 'niteroi':
    console.table(getNetworkStats(loadNetwork('niteroi')));
    break;

  case 'basic': {
    const network = [
      { source: 'id1', target: 'id2' },
      { source: 'id2', target: 'id3' },
      { source: 'id3', target: 'id1' }
    ];
    const stats = getNetworkStats(network, null, { verbose: true });
    console.log('Basic network stats:');
    console.table(stats);
    break;
  }

  case 'features': {
    const network = [
      { source: 'Alice', target: 'Bob' },
      { source: 'Bob', target: 'Carol' },
      { source: 'Carol', target: 'Alice' },
      { source: 'David', target: 'Carol' }
    ];
    console.log('\nCalculating specific features (degree + eigenvector):');
    const stats = getNetworkStats(network, [FEATURES.DEGREE, FEATURES.EIGENVECTOR]);
    console.table(stats);
    break;
  }

  default:
    console.log('Usage: node src/index.runner.js [command]');
    console.log('\nAvailable commands:');
    console.log('  caruaru  - Run analysis on Caruaru network');
    console.log('  rj       - Run analysis on Rio de Janeiro network');
    console.log('  niteroi  - Run analysis on Niteroi network');
    console.log('  basic    - Run basic demo with simple network');
    console.log('  features - Demo specific feature calculation');
    console.log('\nAvailable features:', Object.values(FEATURES).filter(f => typeof f === 'string').join(', '));
}