import { describe, it, expect } from 'vitest';
import { StatisticAlgorithm } from './base.js';

describe('StatisticAlgorithm', () => {
  describe('constructor', () => {
    it('should prevent direct instantiation', () => {
      expect(() => {
        new StatisticAlgorithm('test', 'Test Stat', 'node', {
          module: 'test.js',
          functionName: 'testCompute'
        });
      }).toThrow('StatisticAlgorithm is abstract and cannot be instantiated directly');
    });

    it('should allow subclass instantiation', () => {
      class TestStatistic extends StatisticAlgorithm {
        constructor() {
          super('test', 'Test Statistic', 'node', {
            module: '../test.js',
            functionName: 'testCompute'
          });
        }
      }

      const stat = new TestStatistic();
      expect(stat.name).toBe('test');
      expect(stat.description).toBe('Test Statistic');
      expect(stat.scope).toBe('node');
    });

    it('should require valid scope', () => {
      class InvalidStatistic extends StatisticAlgorithm {
        constructor() {
          super('test', 'Test', 'invalid', {
            module: 'test.js',
            functionName: 'testCompute'
          });
        }
      }

      expect(() => {
        new InvalidStatistic();
      }).toThrow(/Scope must be 'node' or 'graph'/);
    });

    it('should require computeConfig', () => {
      class NoConfigStatistic extends StatisticAlgorithm {
        constructor() {
          super('test', 'Test', 'node', null);
        }
      }

      expect(() => {
        new NoConfigStatistic();
      }).toThrow(/computeConfig with module and functionName is required/);
    });

    it('should require computeConfig.module', () => {
      class NoModuleStatistic extends StatisticAlgorithm {
        constructor() {
          super('test', 'Test', 'node', { functionName: 'test' });
        }
      }

      expect(() => {
        new NoModuleStatistic();
      }).toThrow(/computeConfig with module and functionName is required/);
    });

    it('should require computeConfig.functionName', () => {
      class NoFunctionStatistic extends StatisticAlgorithm {
        constructor() {
          super('test', 'Test', 'node', { module: 'test.js' });
        }
      }

      expect(() => {
        new NoFunctionStatistic();
      }).toThrow(/computeConfig with module and functionName is required/);
    });
  });

  describe('getInfo', () => {
    it('should return algorithm metadata', () => {
      class TestStatistic extends StatisticAlgorithm {
        constructor() {
          super('test', 'Test Description', 'node', {
            module: 'test.js',
            functionName: 'testCompute'
          });
        }
      }

      const stat = new TestStatistic();
      const info = stat.getInfo();

      expect(info).toEqual({
        name: 'test',
        description: 'Test Description',
        scope: 'node'
      });
    });
  });

  describe('isNodeLevel', () => {
    it('should return true for node-level statistics', () => {
      class NodeStat extends StatisticAlgorithm {
        constructor() {
          super('test', 'Test', 'node', {
            module: 'test.js',
            functionName: 'testCompute'
          });
        }
      }

      const stat = new NodeStat();
      expect(stat.isNodeLevel()).toBe(true);
      expect(stat.isGraphLevel()).toBe(false);
    });
  });

  describe('isGraphLevel', () => {
    it('should return true for graph-level statistics', () => {
      class GraphStat extends StatisticAlgorithm {
        constructor() {
          super('test', 'Test', 'graph', {
            module: 'test.js',
            functionName: 'testCompute'
          });
        }
      }

      const stat = new GraphStat();
      expect(stat.isGraphLevel()).toBe(true);
      expect(stat.isNodeLevel()).toBe(false);
    });
  });

  describe('options', () => {
    it('should allow setting options in subclass', () => {
      class ConfigurableStat extends StatisticAlgorithm {
        constructor(options = {}) {
          super('test', 'Test', 'node', {
            module: 'test.js',
            functionName: 'testCompute'
          });
          this.options = {
            maxIter: options.maxIter || 100,
            tolerance: options.tolerance || 1e-6
          };
        }
      }

      const stat = new ConfigurableStat({ maxIter: 200 });
      expect(stat.options.maxIter).toBe(200);
      expect(stat.options.tolerance).toBe(1e-6);
    });
  });
});
