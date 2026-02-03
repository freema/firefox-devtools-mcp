/**
 * Snapshot injected script entry point
 * This gets bundled and injected into browser context
 */

import { walkTree } from './treeWalker.js';
import type { TreeWalkerResult, TreeWalkerOptions } from './treeWalker.js';

/**
 * Extended result that can include selector errors
 */
interface CreateSnapshotResult extends TreeWalkerResult {
  selectorError?: string;
}

/**
 * Create snapshot of current page
 * This function is called from executeScript
 * @param snapshotId - Unique ID for this snapshot
 * @param options.includeAll - If true, include all visible elements without relevance filtering
 * @param options.selector - CSS selector to scope the snapshot (starts from matched element)
 */
export function createSnapshot(
  snapshotId: number,
  options?: TreeWalkerOptions
): CreateSnapshotResult {
  try {
    // Determine root element - use selector if provided, otherwise body
    let rootElement: Element = document.body;

    if (options?.selector) {
      const selected = document.querySelector(options.selector);
      if (!selected) {
        return {
          tree: null,
          uidMap: [],
          truncated: false,
          selectorError: `Selector "${options.selector}" not found`,
        };
      }
      rootElement = selected;
    }

    // Walk from root element
    const result = walkTree(rootElement, snapshotId, {
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
