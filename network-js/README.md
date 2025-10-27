# js-network-stats
A nodejs micro-package to help calculating stats for network graphs.

It uses [JSNetworkX](https://felix-kling.de/jsnetworkx/) to generate metrics about a network graph. The original use case is for a serveless function so think of this as a batch operation to generate metrics on demand.

## Usage
```js
import {getNetworkStats} from 'js-network-stats'
const myStats = getNetworkStats(edge_data, feature, options)
```
Where 
- `edge_data` - an array of edge objects with the format `{source:"A", target:"B"}`
- `feature` - an array of strings describing the desired features to extract
- `options` - an object with options.
    - `options.verbose` - boolean - toggles console output
    - `options.maxIter` - number - max number of iterations for eigenvector calculation.
## Example
```js
const edge_data = [
    { source: "id1", target: "id2" },
    { source: "id2", target: "id3" },
    { source: "id3", target: "id1" },
];
const stats = getNetworkStats(edge_data, null, { verbose: true });
console.log("stats", stats);
//outputs...
stats [
  {
    id: 'id1',
    eigenvector: 0.5773502691896257,
    betweenness: 0,
    clustering: 1,
    cliques: 1,
    degree: 2,
    modularity: 0
  },
  {
    id: 'id2',
    eigenvector: 0.5773502691896257,
    betweenness: 0,
    clustering: 1,
    cliques: 1,
    degree: 2,
    modularity: 1
  },
  {
    id: 'id3',
    eigenvector: 0.5773502691896257,
    betweenness: 0,
    clustering: 1,
    cliques: 1,
    degree: 2,
    modularity: 2
  }
]
```

## Features
The second parameter of `getNetworkStats` expect an array of strings. These are the features you want to extract:

### **eigenvector**
In graph theory, eigenvector centrality (also called eigencentrality or prestige score[1]) is a measure of the influence of a node in a network. Relative scores are assigned to all nodes in the network based on the concept that connections to high-scoring nodes contribute more to the score of the node in question than equal connections to low-scoring nodes. A high eigenvector score means that a node is connected to many nodes who themselves have high scores.

Eigenvector centrality computes the centrality for a node based on the centrality of its neighbors. The eigenvector centrality for node $i$ is $$Ax = \lambda x$$ where $A$ is the adjacency matrix of the graph `G` with eigenvalue $\lambda$. By virtue of the Perron-Frobinus theorem, there is a unique and positive solution if $\lambda$ is the largest eigenvalue associated with the eigenvector of the adjacency matrix `A`.


### **modularity**
Communities are groups of nodes within a network that are more densely connected to one another than to other nodes. Modularity is a metric that quantifies the quality of an assignment of nodes to communities by evaluating how much more densely connected the nodes within a community are compared to how connected they would be, on average, in a suitably defined random network.

The script uses [Louvain](https://github.com/upphiminn/jLouvain) community detection algorithm to sort related nodes with different modularities. The function returns an integer for each node and all the nodes with the same modularity are part of the same community. The Louvain method of community detection is an algorithm for detecting communities in networks that relies upon a heuristic for maximizing the modularity. 


### **betweenness**
Betweenness centrality represents the degree to which nodes stand between each other. The script computes the shortest-path betweenness centrality for nodes. The betweenness centrality of a node `v` is the sum of the fraction of all-pairs shortest paths that pass through `v`: 

$$ c_B(v) =\sum_{s,t \in V} \frac{\sigma(s, t|v)}{\sigma(s, t)} $$ 

where `V` is the set of nodes, 
is the number of shortest $(s, t)$ paths, and $\sigma(s, t|v)$ is the number of those paths passing through some node `v` other than $s, t$. If $s = t$, $\sigma(s, t) = 1$, and if $v \in {s, t}$, $\sigma(s, t|v) = 0$.

### **clustering**
For unweighted graphs the clustering of each node `u` is the fraction of possible triangles through that node that exist: 
$$c_u = \frac{2 T(u)}{deg(u)(deg(u)-1)}$$
where $T(u)$ is the number of triangles through node u and $deg(u)$ is the degree of $u$.

### **cliques**
Maximal cliques are the largest complete subgraph containing a given node. The largest maximal clique is sometimes called the maximum clique.

### **degree**
The node degree is the number of edges adjacent to the node. The weighted node degree is the sum of the edge weights for edges incident to that node.
