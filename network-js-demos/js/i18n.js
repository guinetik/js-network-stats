// i18n translations
export const translations = {
    en: {
        home: {
            hero: {
                title: '📊 Network Analysis Made Simple',
                subtitle: 'A lightweight, zero-dependency JavaScript library',
                description: 'From social networks to family trees, understand your connected data with powerful graph algorithms.',
                cta: 'See It in Action',
                github: 'View on GitHub'
            },
            features: [
                {
                    icon: '🪶',
                    title: 'Placeholder Feature 1',
                    description: 'Placeholder description 1'
                },
                {
                    icon: '📖',
                    title: 'Placeholder Feature 2',
                    description: 'Placeholder description 2'
                },
                {
                    icon: '🎓',
                    title: 'Placeholder Feature 3',
                    description: 'Placeholder description 3'
                },
                {
                    icon: '🧪',
                    title: 'Placeholder Feature 4',
                    description: 'Placeholder description 4'
                },
                {
                    icon: '🌐',
                    title: 'Placeholder Feature 5',
                    description: 'Placeholder description 5'
                },
                {
                    icon: '⚡',
                    title: 'Placeholder Feature 6',
                    description: 'Placeholder description 6'
                }
            ]
        },
        docs: {
            title: 'Documentation',
            subtitle: 'Complete API reference for @guinetik/network-js',
            sections: {
                quickStart: 'Quick Start',
                coreClasses: 'Core Classes',
                adapters: 'Data Adapters',
                layouts: 'Graph Layouts',
                community: 'Community Detection',
                examples: 'Usage Examples'
            },
            quickStart: {
                title: 'Quick Start',
                install: 'Installation',
                installCmd: 'npm install @guinetik/network-js',
                basicUsage: 'Basic Usage',
                description: 'Get started with network analysis in just a few lines of code.'
            },
            graph: {
                title: 'Graph',
                description: 'Core graph data structure using adjacency maps for efficient operations.',
                constructor: 'Constructor',
                methods: 'Methods',
                methodsList: {
                    addNode: {
                        name: 'addNode(nodeId)',
                        description: 'Add a single node to the graph'
                    },
                    addNodesFrom: {
                        name: 'addNodesFrom(nodeIds)',
                        description: 'Add multiple nodes from an array'
                    },
                    addEdge: {
                        name: 'addEdge(source, target, weight?)',
                        description: 'Add an edge between two nodes'
                    },
                    removeNode: {
                        name: 'removeNode(nodeId)',
                        description: 'Remove a node and all its edges'
                    },
                    getNeighbors: {
                        name: 'getNeighbors(nodeId)',
                        description: 'Get array of neighbor node IDs'
                    },
                    hasEdge: {
                        name: 'hasEdge(source, target)',
                        description: 'Check if edge exists'
                    },
                    numberOfNodes: {
                        name: 'numberOfNodes()',
                        description: 'Get total number of nodes'
                    },
                    numberOfEdges: {
                        name: 'numberOfEdges()',
                        description: 'Get total number of edges'
                    }
                }
            },
            networkStats: {
                title: 'NetworkStats',
                description: 'Main class for analyzing networks and calculating statistical metrics.',
                constructor: 'Constructor',
                constructorParams: {
                    maxIter: 'Maximum iterations for algorithms (default: 100000)',
                    verbose: 'Enable logging (default: true)'
                },
                analyze: {
                    title: 'analyze() Method',
                    description: 'Compute network statistics for all nodes',
                    params: {
                        network: 'Edge list array with source, target, and optional weight',
                        features: 'Array of feature names to compute (default: all)',
                    },
                    returns: 'Array of node statistics objects'
                },
                features: {
                    title: 'Available Features',
                    degree: 'Number of connections per node',
                    eigenvector: 'Influence based on connection quality (like PageRank)',
                    betweenness: 'Bridge importance between groups',
                    clustering: 'How densely connected neighbors are',
                    cliques: 'Number of complete subgraphs containing the node',
                    modularity: 'Community assignment (Louvain algorithm)'
                }
            },
            adapters: {
                title: 'Data Adapters',
                description: 'Convert between various graph formats and the standard GraphData format.',
                csv: {
                    title: 'CSVAdapter',
                    description: 'Load and convert CSV files to graph format',
                    methods: {
                        loadFromURL: 'Load CSV from URL(s)',
                        fromEdgeList: 'Parse edge list CSV',
                        fromNodes: 'Parse node properties CSV',
                        toEdgeList: 'Export to edge list CSV'
                    }
                },
                json: {
                    title: 'JSONAdapter',
                    description: 'Support for D3.js, Cytoscape, and other JSON formats',
                    methods: {
                        fromD3: 'Convert from D3 format (nodes, links)',
                        toD3: 'Export to D3 format',
                        fromCytoscape: 'Convert from Cytoscape format',
                        toCytoscape: 'Export to Cytoscape format'
                    }
                },
                networkx: {
                    title: 'NetworkXAdapter',
                    description: 'Python NetworkX interoperability',
                    methods: {
                        fromNodeLink: 'Import NetworkX node-link format',
                        toNodeLink: 'Export to NetworkX node-link format',
                        fromAdjacency: 'Import adjacency format',
                        toAdjacency: 'Export to adjacency format'
                    }
                }
            },
            layouts: {
                title: 'Graph Layouts',
                description: 'Position nodes in 2D space using physics-based algorithms.',
                base: {
                    title: 'Layout (Base Class)',
                    description: 'Abstract base class for all layout algorithms',
                    methods: {
                        getPositions: 'Get computed node positions',
                        computePositions: 'Compute layout (implemented by subclasses)',
                        updateLayout: 'Incremental layout updates',
                        reset: 'Clear cached positions'
                    }
                },
                forceDirected: {
                    title: 'ForceDirectedLayout',
                    description: 'Spring-electrical model (Fruchterman-Reingold algorithm)',
                    options: {
                        width: 'Layout area width (default: 1000)',
                        height: 'Layout area height (default: 1000)',
                        iterations: 'Number of simulation steps (default: 100)',
                        repulsion: 'Node repulsion strength (default: 50000)',
                        attraction: 'Edge attraction strength (default: 0.1)'
                    }
                },
                circular: {
                    title: 'CircularLayout',
                    description: 'Distance-based circular positioning',
                    options: {
                        width: 'Layout area width (default: 1000)',
                        height: 'Layout area height (default: 1000)',
                        springLength: 'Ideal spring length (default: 100)',
                        maxIterations: 'Maximum iterations per node (default: 100)'
                    }
                }
            },
            community: {
                title: 'Community Detection',
                description: 'Detect communities (clusters) in networks using various algorithms.',
                detector: {
                    title: 'CommunityDetection',
                    description: 'Main orchestrator class using Strategy Pattern',
                    methods: {
                        detectCommunities: 'Detect communities using algorithm instance or name',
                        setGraph: 'Set or update the graph to analyze',
                        calculateModularity: 'Calculate modularity score'
                    }
                },
                algorithm: {
                    title: 'CommunityAlgorithm',
                    description: 'Abstract base class for community detection algorithms',
                    method: {
                        detect: 'Detect communities in graph (must be implemented)'
                    }
                },
                louvain: {
                    title: 'LouvainAlgorithm',
                    description: 'Fast modularity optimization (Louvain method)',
                    options: {
                        resolution: 'Resolution parameter (default: 1.0)',
                        randomize: 'Randomize node order (default: false)'
                    }
                },
                customAlgorithm: {
                    title: 'Custom Algorithms',
                    description: 'Extend CommunityAlgorithm to create your own algorithms'
                }
            },
            examples: {
                title: 'Usage Examples',
                basic: {
                    title: 'Basic Network Analysis',
                    description: 'Compute centrality metrics for a simple network'
                },
                csv: {
                    title: 'Loading CSV Data',
                    description: 'Import network data from CSV files'
                },
                layout: {
                    title: 'Graph Layout',
                    description: 'Position nodes using force-directed layout'
                },
                communityStrategy: {
                    title: 'Community Detection (Strategy Pattern)',
                    description: 'Use algorithm instances for community detection'
                },
                communityCustom: {
                    title: 'Custom Community Algorithm',
                    description: 'Create your own community detection algorithm'
                }
            }
        }
    },
    pt: {
        home: {
            hero: {
                title: '📊 Análise de Redes Simplificada',
                subtitle: 'Uma biblioteca JavaScript leve e sem dependências',
                description: 'De redes sociais a árvores genealógicas, entenda seus dados conectados com algoritmos de grafos poderosos.',
                cta: 'Ver em Ação',
                github: 'Ver no GitHub'
            },
            features: [
                {
                    icon: '🪶',
                    title: 'Placeholder Feature 1',
                    description: 'Placeholder description 1'
                },
                {
                    icon: '📖',
                    title: 'Placeholder Feature 2',
                    description: 'Placeholder description 2'
                },
                {
                    icon: '🎓',
                    title: 'Placeholder Feature 3',
                    description: 'Placeholder description 3'
                },
                {
                    icon: '🧪',
                    title: 'Placeholder Feature 4',
                    description: 'Placeholder description 4'
                },
                {
                    icon: '🌐',
                    title: 'Placeholder Feature 5',
                    description: 'Placeholder description 5'
                },
                {
                    icon: '⚡',
                    title: 'Placeholder Feature 6',
                    description: 'Placeholder description 6'
                }
            ]
        },
        docs: {
            title: 'Documentação',
            subtitle: 'Referência completa da API para @guinetik/network-js',
            sections: {
                quickStart: 'Início Rápido',
                coreClasses: 'Classes Principais',
                adapters: 'Adaptadores de Dados',
                layouts: 'Layouts de Grafos',
                community: 'Detecção de Comunidades',
                examples: 'Exemplos de Uso'
            },
            quickStart: {
                title: 'Início Rápido',
                install: 'Instalação',
                installCmd: 'npm install @guinetik/network-js',
                basicUsage: 'Uso Básico',
                description: 'Comece com análise de redes em apenas algumas linhas de código.'
            },
            graph: {
                title: 'Graph',
                description: 'Estrutura de dados de grafo principal usando mapas de adjacência para operações eficientes.',
                constructor: 'Construtor',
                methods: 'Métodos',
                methodsList: {
                    addNode: {
                        name: 'addNode(nodeId)',
                        description: 'Adicionar um único nó ao grafo'
                    },
                    addNodesFrom: {
                        name: 'addNodesFrom(nodeIds)',
                        description: 'Adicionar múltiplos nós de um array'
                    },
                    addEdge: {
                        name: 'addEdge(source, target, weight?)',
                        description: 'Adicionar uma aresta entre dois nós'
                    },
                    removeNode: {
                        name: 'removeNode(nodeId)',
                        description: 'Remover um nó e todas as suas arestas'
                    },
                    getNeighbors: {
                        name: 'getNeighbors(nodeId)',
                        description: 'Obter array de IDs de nós vizinhos'
                    },
                    hasEdge: {
                        name: 'hasEdge(source, target)',
                        description: 'Verificar se a aresta existe'
                    },
                    numberOfNodes: {
                        name: 'numberOfNodes()',
                        description: 'Obter o número total de nós'
                    },
                    numberOfEdges: {
                        name: 'numberOfEdges()',
                        description: 'Obter o número total de arestas'
                    }
                }
            },
            networkStats: {
                title: 'NetworkStats',
                description: 'Classe principal para analisar redes e calcular métricas estatísticas.',
                constructor: 'Construtor',
                constructorParams: {
                    maxIter: 'Iterações máximas para algoritmos (padrão: 100000)',
                    verbose: 'Ativar logging (padrão: true)'
                },
                analyze: {
                    title: 'Método analyze()',
                    description: 'Calcular estatísticas de rede para todos os nós',
                    params: {
                        network: 'Array de lista de arestas com source, target e peso opcional',
                        features: 'Array de nomes de features para calcular (padrão: todas)',
                    },
                    returns: 'Array de objetos de estatísticas de nós'
                },
                features: {
                    title: 'Features Disponíveis',
                    degree: 'Número de conexões por nó',
                    eigenvector: 'Influência baseada na qualidade das conexões (como PageRank)',
                    betweenness: 'Importância de ponte entre grupos',
                    clustering: 'Quão densamente conectados os vizinhos estão',
                    cliques: 'Número de subgrafos completos contendo o nó',
                    modularity: 'Atribuição de comunidade (algoritmo Louvain)'
                }
            },
            adapters: {
                title: 'Adaptadores de Dados',
                description: 'Converter entre vários formatos de grafo e o formato GraphData padrão.',
                csv: {
                    title: 'CSVAdapter',
                    description: 'Carregar e converter arquivos CSV para formato de grafo',
                    methods: {
                        loadFromURL: 'Carregar CSV de URL(s)',
                        fromEdgeList: 'Analisar CSV de lista de arestas',
                        fromNodes: 'Analisar CSV de propriedades de nós',
                        toEdgeList: 'Exportar para CSV de lista de arestas'
                    }
                },
                json: {
                    title: 'JSONAdapter',
                    description: 'Suporte para D3.js, Cytoscape e outros formatos JSON',
                    methods: {
                        fromD3: 'Converter de formato D3 (nodes, links)',
                        toD3: 'Exportar para formato D3',
                        fromCytoscape: 'Converter de formato Cytoscape',
                        toCytoscape: 'Exportar para formato Cytoscape'
                    }
                },
                networkx: {
                    title: 'NetworkXAdapter',
                    description: 'Interoperabilidade com Python NetworkX',
                    methods: {
                        fromNodeLink: 'Importar formato node-link do NetworkX',
                        toNodeLink: 'Exportar para formato node-link do NetworkX',
                        fromAdjacency: 'Importar formato de adjacência',
                        toAdjacency: 'Exportar para formato de adjacência'
                    }
                }
            },
            layouts: {
                title: 'Layouts de Grafos',
                description: 'Posicionar nós no espaço 2D usando algoritmos baseados em física.',
                base: {
                    title: 'Layout (Classe Base)',
                    description: 'Classe base abstrata para todos os algoritmos de layout',
                    methods: {
                        getPositions: 'Obter posições de nós calculadas',
                        computePositions: 'Calcular layout (implementado por subclasses)',
                        updateLayout: 'Atualizações incrementais de layout',
                        reset: 'Limpar posições em cache'
                    }
                },
                forceDirected: {
                    title: 'ForceDirectedLayout',
                    description: 'Modelo mola-elétrico (algoritmo Fruchterman-Reingold)',
                    options: {
                        width: 'Largura da área de layout (padrão: 1000)',
                        height: 'Altura da área de layout (padrão: 1000)',
                        iterations: 'Número de passos de simulação (padrão: 100)',
                        repulsion: 'Força de repulsão de nós (padrão: 50000)',
                        attraction: 'Força de atração de arestas (padrão: 0.1)'
                    }
                },
                circular: {
                    title: 'CircularLayout',
                    description: 'Posicionamento circular baseado em distância',
                    options: {
                        width: 'Largura da área de layout (padrão: 1000)',
                        height: 'Altura da área de layout (padrão: 1000)',
                        springLength: 'Comprimento ideal da mola (padrão: 100)',
                        maxIterations: 'Iterações máximas por nó (padrão: 100)'
                    }
                }
            },
            community: {
                title: 'Detecção de Comunidades',
                description: 'Detectar comunidades (clusters) em redes usando vários algoritmos.',
                detector: {
                    title: 'CommunityDetection',
                    description: 'Classe orquestradora principal usando Strategy Pattern',
                    methods: {
                        detectCommunities: 'Detectar comunidades usando instância de algoritmo ou nome',
                        setGraph: 'Definir ou atualizar o grafo para analisar',
                        calculateModularity: 'Calcular pontuação de modularidade'
                    }
                },
                algorithm: {
                    title: 'CommunityAlgorithm',
                    description: 'Classe base abstrata para algoritmos de detecção de comunidades',
                    method: {
                        detect: 'Detectar comunidades no grafo (deve ser implementado)'
                    }
                },
                louvain: {
                    title: 'LouvainAlgorithm',
                    description: 'Otimização rápida de modularidade (método Louvain)',
                    options: {
                        resolution: 'Parâmetro de resolução (padrão: 1.0)',
                        randomize: 'Aleatorizar ordem dos nós (padrão: false)'
                    }
                },
                customAlgorithm: {
                    title: 'Algoritmos Personalizados',
                    description: 'Estenda CommunityAlgorithm para criar seus próprios algoritmos'
                }
            },
            examples: {
                title: 'Exemplos de Uso',
                basic: {
                    title: 'Análise Básica de Rede',
                    description: 'Calcular métricas de centralidade para uma rede simples'
                },
                csv: {
                    title: 'Carregando Dados CSV',
                    description: 'Importar dados de rede de arquivos CSV'
                },
                layout: {
                    title: 'Layout de Grafo',
                    description: 'Posicionar nós usando layout dirigido por força'
                },
                communityStrategy: {
                    title: 'Detecção de Comunidades (Strategy Pattern)',
                    description: 'Usar instâncias de algoritmo para detecção de comunidades'
                },
                communityCustom: {
                    title: 'Algoritmo de Comunidade Personalizado',
                    description: 'Criar seu próprio algoritmo de detecção de comunidades'
                }
            }
        }
    }
};
