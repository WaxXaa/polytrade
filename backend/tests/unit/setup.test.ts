/**
 * Smoke test — verifies Vitest and fast-check are correctly configured.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Project setup', () => {
  it('Vitest is configured correctly', () => {
    expect(true).toBe(true);
  });

  it('fast-check is available and runs property tests', () => {
    // Verify fast-check can run at least 100 iterations
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a; // commutativity of addition
      }),
      { numRuns: 100 },
    );
  });

  it('fast-check generates valid arbitrary values', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        return typeof s === 'string';
      }),
      { numRuns: 100 },
    );
  });
});
