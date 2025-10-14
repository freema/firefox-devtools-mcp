/**
 * Snapshot injected script entry point
 * This gets bundled and injected into browser context
 */

import { walkTree } from './treeWalker.js';
import type { TreeWalkerResult } from './treeWalker.js';

/**
 * Create snapshot of current page
 * This function is called from executeScript
 */
export function createSnapshot(snapshotId: number): TreeWalkerResult {
  try {
    // Walk from body
    const result = walkTree(document.body, snapshotId, true);

    if (!result.tree) {
      throw new Error('Failed to generate tree');
    }

    return result;
  } catch (error: any) {
    return {
      tree: null,
      uidMap: [],
      truncated: false,
    };
  }
}

// Make it available globally for executeScript
if (typeof window !== 'undefined') {
  (window as any).__createSnapshot = createSnapshot;
}
