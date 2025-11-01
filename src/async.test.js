/**
 * Tests for async API with worker support
 */

import { describe, it, test, expect, afterAll } from 'vitest';
import { getNetworkStatsAsync, cleanup } from './async.js';
import { FEATURES } from './core/constants.js';

describe('getNetworkStatsAsync', () => {
  const simpleNetwork = [
    { source: 'A', target: 'B' },
    { source: 'B', target: 'C' },
    { source: 'C', target: 'A' }
  ];

  // Cleanup workers after all tests
  afterAll(async () => {
    await cleanup();
  });

  describe('Basic async functionality', () => {
    test('should return a promise', () => {
      const result = getNetworkStatsAsync(simpleNetwork, [FEATURES.DEGREE], { verbose: false });
      expect(result).toBeInstanceOf(Promise);
    });

    test('should calculate stats asynchronously', async () => {
      const stats = await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.DEGREE],
        { verbose: false, workers: false }
      );

      expect(stats).toBeDefined();
      expect(stats.length).toBe(3);
      expect(stats[0]).toHaveProperty('degree');
    });

    test('should work with all features', async () => {
      const stats = await getNetworkStatsAsync(
        simpleNetwork,
        null,
        { verbose: false, workers: false }
      );

      expect(stats.length).toBe(3);
      expect(stats[0]).toHaveProperty('degree');
      expect(stats[0]).toHaveProperty('eigenvector');
      expect(stats[0]).toHaveProperty('betweenness');
    });
  });

  describe('Worker modes', () => {
    test('workers: false should use sync computation', async () => {
      const stats = await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.DEGREE],
        { verbose: false, workers: false }
      );

      expect(stats).toBeDefined();
      expect(stats.length).toBe(3);
    });

    test('workers: true should use worker threads (with fallback)', async () => {
      const stats = await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.DEGREE],
        { verbose: false, workers: true }
      );

      expect(stats).toBeDefined();
      expect(stats.length).toBe(3);
    });

    test('workers: auto should auto-detect based on size', async () => {
      // Small network - should use sync
      const statsSmall = await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.DEGREE],
        { verbose: false, workers: 'auto', workerThreshold: 10 }
      );

      expect(statsSmall).toBeDefined();
      expect(statsSmall.length).toBe(3);
    });

    test('workers: auto with large graph should use workers', async () => {
      // Create large network (100 edges)
      const largeNetwork = [];
      for (let i = 0; i < 100; i++) {
        largeNetwork.push({
          source: `node${i}`,
          target: `node${(i + 1) % 100}`
        });
      }

      const stats = await getNetworkStatsAsync(
        largeNetwork,
        [FEATURES.DEGREE],
        { verbose: false, workers: 'auto', workerThreshold: 50 }
      );

      expect(stats).toBeDefined();
      expect(stats.length).toBe(100);
    });
  });

  describe('Progress callbacks', () => {
    test('should call progress callback', async () => {
      const progressValues = [];

      await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.DEGREE],
        {
          verbose: false,
          workers: false,
          onProgress: (progress) => {
            progressValues.push(progress);
          }
        }
      );

      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[0]).toBe(0); // Initial
      expect(progressValues[progressValues.length - 1]).toBe(1); // Complete
    });

    test('progress values should be between 0 and 1', async () => {
      const progressValues = [];

      await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.DEGREE],
        {
          verbose: false,
          workers: false,
          onProgress: (progress) => {
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(1);
            progressValues.push(progress);
          }
        }
      );

      expect(progressValues.length).toBeGreaterThan(0);
    });
  });

  describe('Options handling', () => {
    test('should respect maxIter option', async () => {
      const stats = await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.EIGENVECTOR],
        { verbose: false, workers: false, maxIter: 1000 }
      );

      expect(stats).toBeDefined();
      expect(stats[0]).toHaveProperty('eigenvector');
    });

    test('should respect verbose option', async () => {
      // Should not throw
      await expect(
        getNetworkStatsAsync(simpleNetwork, [FEATURES.DEGREE], { verbose: true, workers: false })
      ).resolves.toBeDefined();

      await expect(
        getNetworkStatsAsync(simpleNetwork, [FEATURES.DEGREE], { verbose: false, workers: false })
      ).resolves.toBeDefined();
    });

    test('should accept custom workerThreshold', async () => {
      const stats = await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.DEGREE],
        { verbose: false, workers: 'auto', workerThreshold: 1000 }
      );

      expect(stats).toBeDefined();
    });
  });

  describe('Error handling', () => {
    test('should reject on invalid network', async () => {
      await expect(
        getNetworkStatsAsync('not an array', [FEATURES.DEGREE], { verbose: false })
      ).rejects.toThrow(TypeError);
    });

    test('should reject on empty network', async () => {
      await expect(
        getNetworkStatsAsync([], [FEATURES.DEGREE], { verbose: false })
      ).rejects.toThrow('Network cannot be empty');
    });

    test('should reject on invalid features', async () => {
      await expect(
        getNetworkStatsAsync(simpleNetwork, ['invalid'], { verbose: false })
      ).rejects.toThrow('Invalid feature');
    });
  });

  describe('Correctness', () => {
    test('should produce same results as sync API', async () => {
      const { getNetworkStats } = await import('./index.js');

      const syncResult = getNetworkStats(
        simpleNetwork,
        [FEATURES.DEGREE],
        { verbose: false }
      );

      const asyncResult = await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.DEGREE],
        { verbose: false, workers: false }
      );

      expect(asyncResult).toEqual(syncResult);
    });

    test('should calculate correct values', async () => {
      const stats = await getNetworkStatsAsync(
        simpleNetwork,
        [FEATURES.DEGREE, FEATURES.EIGENVECTOR],
        { verbose: false, workers: false, maxIter: 100000 }
      );

      // Triangle graph - all nodes have degree 2
      stats.forEach(node => {
        expect(node.degree).toBe(2);
      });

      // Triangle graph - all nodes have equal eigenvector centrality
      expect(stats[0].eigenvector).toBeCloseTo(0.5773502691896257, 5);
      expect(stats[1].eigenvector).toBeCloseTo(0.5773502691896257, 5);
      expect(stats[2].eigenvector).toBeCloseTo(0.5773502691896257, 5);
    });
  });

  describe('Cleanup', () => {
    test('cleanup function should not throw', async () => {
      await expect(cleanup()).resolves.toBeUndefined();
    });
  });
});
