export class Connection {
    constructor(source, target, weight = 1) {
      this.source = source;
      this.target = target;
      this.weight = weight;
    }
    
    // Get unique identifier for this connection
    get id() {
      return `${this.source}_${this.target}`;
    }
    
    // Check if connection involves a specific node
    hasNode(node) {
      return this.source === node || this.target === node;
    }
    
    // Clone the connection
    clone() {
      return new Connection(this.source, this.target, this.weight);
    }
  }