/**
 * Snapshot injected script entry point
 * This gets bundled and injected into browser context
 */

import { walkTree } from './treeWalker.js';
import type { TreeWalkerResult, TreeWalkerOptions } from './treeWalker.js';

/**
 * Create snapshot of current page
 * This function is called from executeScript
 * @param snapshotId - Unique ID for this snapshot
 * @param options.includeAll - If true, include all visible elements without relevance filtering
 */
export function createSnapshot(snapshotId: number, options?: TreeWalkerOptions): TreeWalkerResult {
  try {
    // Walk from body
    const result = walkTree(document.body, snapshotId, {
      includeIframes: true,
      includeAll: options?.includeAll ?? false,
    });

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
