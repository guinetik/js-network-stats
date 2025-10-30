/**
 * Internationalization (i18n)
 * Translation strings for English and Portuguese
 */

export const translations = {
  en: {
    // Navigation
    nav: {
      home: 'Home',
      showcase: 'Features Showcase',
      explorer: 'Network Explorer',
      family: 'Family Tree',
      docs: 'Documentation'
    },

    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      darkMode: 'Toggle dark mode',
      language: 'Language'
    },

    // Footer
    footer: {
      madeBy: 'Made with',
      by: 'by',
      license: 'MIT License'
    },

    // Home page
    home: {
      hero: {
        title: 'Lorem Ipsum Network Analysis',
        subtitle: 'Dolor sit amet consectetur adipiscing elit',
        description: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation.',
        cta: 'Get Started',
        github: 'View on GitHub'
      },
      features: [
        {
          icon: '📊',
          title: 'Lorem Analytics',
          description: 'Consectetur adipiscing elit sed do eiusmod tempor incididunt'
        },
        {
          icon: '🔍',
          title: 'Ipsum Explorer',
          description: 'Ut labore et dolore magna aliqua enim ad minim veniam'
        },
        {
          icon: '🎨',
          title: 'Dolor Layouts',
          description: 'Quis nostrud exercitation ullamco laboris nisi ut aliquip'
        },
        {
          icon: '⚡',
          title: 'Amet Performance',
          description: 'Ex ea commodo consequat duis aute irure dolor in reprehenderit'
        },
        {
          icon: '🔗',
          title: 'Sit Connections',
          description: 'Voluptate velit esse cillum dolore eu fugiat nulla pariatur'
        },
        {
          icon: '📈',
          title: 'Elit Statistics',
          description: 'Excepteur sint occaecat cupidatat non proident sunt in culpa'
        }
      ],
      code: {
        title: 'Lorem Ipsum Example',
        snippet: `npm install lorem-ipsum

import { Lorem } from 'lorem-ipsum';

const network = [
  { source: 'Dolor', target: 'Sit', weight: 1 },
  { source: 'Amet', target: 'Elit', weight: 2 }
];

const analyzer = new Lorem();
const results = analyzer.analyze(network);

console.log(results);`
      }
    },

    // Documentation
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
          description: 'Compute network statistics for all nodes'
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
        description: 'Convert between various graph formats and the standard GraphData format.',
        csv: {
          title: 'CSVAdapter',
          description: 'Load and convert CSV files to graph format'
        },
        json: {
          title: 'JSONAdapter',
          description: 'Support for D3.js, Cytoscape, and other JSON formats'
        },
        networkx: {
          title: 'NetworkXAdapter',
          description: 'Python NetworkX interoperability'
        }
      },
      layouts: {
        description: 'Position nodes in 2D space using physics-based algorithms.',
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
          description: 'Distance-based circular positioning'
        }
      },
      community: {
        description: 'Detect communities (clusters) in networks using various algorithms.',
        detector: {
          description: 'Main orchestrator class using Strategy Pattern'
        },
        louvain: {
          title: 'LouvainAlgorithm',
          description: 'Fast modularity optimization (Louvain method)'
        },
        customAlgorithm: {
          title: 'Custom Algorithms',
          description: 'Extend CommunityAlgorithm to create your own algorithms'
        }
      },
      examples: {
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
        }
      }
    },

    // Pages
    showcase: {
      title: 'Features Showcase',
      description: 'Explore all the features of @guinetik/network-js'
    },
    explorer: {
      title: 'Network Explorer',
      description: 'Interactive network analysis and visualization'
    },
    family: {
      title: 'Family Tree',
      description: 'Visualize family relationships'
    },
    docs: {
      title: 'Documentation',
      description: 'Learn how to use @guinetik/network-js'
    }
  },

  pt: {
    // Navigation
    nav: {
      home: 'Início',
      showcase: 'Recursos',
      explorer: 'Explorador de Redes',
      family: 'Árvore Genealógica',
      docs: 'Documentação'
    },

    // Common
    common: {
      loading: 'Carregando...',
      error: 'Erro',
      success: 'Sucesso',
      darkMode: 'Alternar modo escuro',
      language: 'Idioma'
    },

    // Footer
    footer: {
      madeBy: 'Feito com',
      by: 'por',
      license: 'Licença MIT'
    },

    // Home page
    home: {
      hero: {
        title: 'Lorem Ipsum Análise de Redes',
        subtitle: 'Dolor sit amet consectetur adipiscing elit',
        description: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation.',
        cta: 'Começar',
        github: 'Ver no GitHub'
      },
      features: [
        {
          icon: '📊',
          title: 'Lorem Análise',
          description: 'Consectetur adipiscing elit sed do eiusmod tempor incididunt'
        },
        {
          icon: '🔍',
          title: 'Ipsum Explorador',
          description: 'Ut labore et dolore magna aliqua enim ad minim veniam'
        },
        {
          icon: '🎨',
          title: 'Dolor Layouts',
          description: 'Quis nostrud exercitation ullamco laboris nisi ut aliquip'
        },
        {
          icon: '⚡',
          title: 'Amet Performance',
          description: 'Ex ea commodo consequat duis aute irure dolor in reprehenderit'
        },
        {
          icon: '🔗',
          title: 'Sit Conexões',
          description: 'Voluptate velit esse cillum dolore eu fugiat nulla pariatur'
        },
        {
          icon: '📈',
          title: 'Elit Estatísticas',
          description: 'Excepteur sint occaecat cupidatat non proident sunt in culpa'
        }
      ],
      code: {
        title: 'Exemplo Lorem Ipsum',
        snippet: `npm install lorem-ipsum

import { Lorem } from 'lorem-ipsum';

const network = [
  { source: 'Dolor', target: 'Sit', weight: 1 },
  { source: 'Amet', target: 'Elit', weight: 2 }
];

const analyzer = new Lorem();
const results = analyzer.analyze(network);

console.log(results);`
      }
    },

    // Documentation (Portuguese - needs translation)
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
        description: 'Estrutura de dados de grafo principal usando mapas de adjacência.',
        methods: 'Métodos',
        methodsList: {
          addNode: {
            name: 'addNode(nodeId)',
            description: 'Adicionar um nó ao grafo'
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
            description: 'Verificar se aresta existe'
          },
          numberOfNodes: {
            name: 'numberOfNodes()',
            description: 'Obter número total de nós'
          }
        }
      },
      networkStats: {
        title: 'NetworkStats',
        description: 'Classe principal para analisar redes e calcular métricas estatísticas.',
        constructor: 'Construtor',
        constructorParams: {
          maxIter: 'Máximo de iterações para algoritmos (padrão: 100000)',
          verbose: 'Ativar logging (padrão: true)'
        },
        analyze: {
          title: 'Método analyze()',
          description: 'Computar estatísticas de rede para todos os nós'
        },
        features: {
          title: 'Recursos Disponíveis',
          degree: 'Número de conexões por nó',
          eigenvector: 'Influência baseada na qualidade das conexões',
          betweenness: 'Importância de ponte entre grupos',
          clustering: 'Quão densamente conectados estão os vizinhos',
          cliques: 'Número de subgrafos completos contendo o nó',
          modularity: 'Atribuição de comunidade (algoritmo Louvain)'
        }
      },
      adapters: {
        description: 'Converter entre vários formatos de grafo.',
        csv: {
          title: 'CSVAdapter',
          description: 'Carregar e converter arquivos CSV para formato de grafo'
        },
        json: {
          title: 'JSONAdapter',
          description: 'Suporte para D3.js, Cytoscape e outros formatos JSON'
        },
        networkx: {
          title: 'NetworkXAdapter',
          description: 'Interoperabilidade com Python NetworkX'
        }
      },
      layouts: {
        description: 'Posicionar nós no espaço 2D usando algoritmos baseados em física.',
        forceDirected: {
          title: 'ForceDirectedLayout',
          description: 'Modelo spring-elétrico (algoritmo Fruchterman-Reingold)',
          options: {
            width: 'Largura da área de layout (padrão: 1000)',
            height: 'Altura da área de layout (padrão: 1000)',
            iterations: 'Número de passos de simulação (padrão: 100)',
            repulsion: 'Força de repulsão dos nós (padrão: 50000)',
            attraction: 'Força de atração das arestas (padrão: 0.1)'
          }
        },
        circular: {
          title: 'CircularLayout',
          description: 'Posicionamento circular baseado em distância'
        }
      },
      community: {
        description: 'Detectar comunidades (clusters) em redes usando vários algoritmos.',
        detector: {
          description: 'Classe orquestradora principal usando Strategy Pattern'
        },
        louvain: {
          title: 'LouvainAlgorithm',
          description: 'Otimização rápida de modularidade (método Louvain)'
        },
        customAlgorithm: {
          title: 'Algoritmos Personalizados',
          description: 'Estender CommunityAlgorithm para criar seus próprios algoritmos'
        }
      },
      examples: {
        csv: {
          title: 'Carregando Dados CSV',
          description: 'Importar dados de rede de arquivos CSV'
        },
        layout: {
          title: 'Layout de Grafo',
          description: 'Posicionar nós usando layout force-directed'
        },
        communityStrategy: {
          title: 'Detecção de Comunidades (Strategy Pattern)',
          description: 'Usar instâncias de algoritmo para detecção de comunidades'
        }
      }
    },

    // Pages
    showcase: {
      title: 'Recursos',
      description: 'Explore todos os recursos da @guinetik/network-js'
    },
    explorer: {
      title: 'Explorador de Redes',
      description: 'Análise e visualização interativa de redes'
    },
    family: {
      title: 'Árvore Genealógica',
      description: 'Visualize relações familiares'
    },
    docs: {
      title: 'Documentação',
      description: 'Aprenda a usar @guinetik/network-js'
    }
  }
};

/**
 * Get translation for current language
 * @param {string} lang - Language code ('en' or 'pt')
 * @param {string} key - Translation key (e.g., 'nav.showcase')
 * @returns {string} Translated text
 */
export function t(lang, key) {
  const keys = key.split('.');
  let value = translations[lang];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      console.warn(`Translation not found: ${key} (${lang})`);
      return key;
    }
  }

  return value;
}
