import { NetworkStats } from '@guinetik/network-js';
import fs from 'fs';
import path from 'path';
import networkCaruaru from '../data/network_caruaru.json' assert { type: 'json' };
import networkRio from '../data/network_rj.json' assert { type: 'json' };
import networkNiteroi from '../data/network_niteroi.json' assert { type: 'json' };

class NetworkRunner {
  constructor(args) {
    this.args = args;
    this.networkStats = new NetworkStats();
  }

  run() {
    switch (this.args[0]) {
      case "caruaru":
        console.table(this.networkStats.analyze(networkCaruaru));
        break;
      case "rj":
        console.table(this.networkStats.analyze(networkRio));
        break;
      case "niteroi":
        console.table(this.networkStats.analyze(networkNiteroi));
        break;
      case "basic":
        const edge_data = [
          { source: "id1", target: "id2" },
          { source: "id2", target: "id3" },
          { source: "id3", target: "id1" },
        ];
        const stats = this.networkStats.analyze(edge_data, null, { verbose: true });
        console.log("stats", stats);
        break;
      case "custom":
        if (!this.args[1]) {
          console.log("Error: Please provide a file path as second argument");
          console.log("Usage: node runner custom [file_path]");
          return;
        }
        try {
          const filePath = this.args[1];
          const fileExtension = path.extname(filePath).toLowerCase();
          
          let networkData;
          
          if (fileExtension === '.json') {
            networkData = this.#parseJsonFile(filePath);
          } else if (fileExtension === '.csv') {
            networkData = this.#parseCsvFile(filePath);
          } else {
            console.error("Error: Only .json and .csv formats are supported");
            return;
          }
          
          if (!this.#validateNetworkData(networkData)) {
            console.error("Error: Invalid network data format. Each record must have 'source' and 'target' properties");
            return;
          }
          
          console.log(`Processing custom network from ${filePath} with ${networkData.length} connections`);
          console.table(this.networkStats.analyze(networkData));
        } catch (error) {
          console.error(`Error processing custom network file: ${error.message}`);
        }
        break;
      default:
        console.log("Usage: node runner [caruaru|rj|niteroi|basic|custom file_path]");
        console.log("  For custom option, supported file formats: JSON, CSV");
    }
  }
  
  #parseJsonFile(filePath) {
    const fileContent = fs.readFileSync(path.resolve(filePath), 'utf8');
    return JSON.parse(fileContent);
  }
  
  #parseCsvFile(filePath) {
    const fileContent = fs.readFileSync(path.resolve(filePath), 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // Parse header to find source and target columns
    const header = lines[0].split(',').map(column => column.trim().toLowerCase());
    const sourceIndex = header.indexOf('source');
    const targetIndex = header.indexOf('target');
    
    if (sourceIndex === -1 || targetIndex === -1) {
      throw new Error("CSV file must have 'source' and 'target' columns");
    }
    
    // Parse data rows
    return lines.slice(1).map(line => {
      const columns = line.split(',').map(column => column.trim());
      return {
        source: columns[sourceIndex],
        target: columns[targetIndex]
      };
    });
  }
  
  #validateNetworkData(networkData) {
    if (!Array.isArray(networkData) || networkData.length === 0) {
      return false;
    }
    
    // Check if each item has source and target properties
    return networkData.every(item => 
      item !== null && 
      typeof item === 'object' && 
      'source' in item && 
      'target' in item && 
      item.source !== undefined && 
      item.target !== undefined
    );
  }
  
  static main(args) {
    const runner = new NetworkRunner(args);
    runner.run();
  }
}

// Execute with command line arguments
NetworkRunner.main(process.argv.slice(2));