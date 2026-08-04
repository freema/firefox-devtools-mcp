/**
 * Snapshot injected script entry point
 * This gets bundled and injected into browser context
 */

import { walkTree, type TreeWalkerOptions } from './treeWalker.js';
import type { TreeWalkerResult } from './treeWalker.js';
import { clearRegistry, lookupElement, registerUids } from './uidRegistry.js';
import { generateCssSelector } from './selectorGenerator.js';

/**
 * Options for snapshot creation
 */
export interface CreateSnapshotOptions extends TreeWalkerOptions {
  selector?: string;
}

/**
 * Result from snapshot creation
 */
export interface CreateSnapshotResult extends Omit<TreeWalkerResult, 'newUids'> {
  selectorError?: string;
}

/**
 * Create snapshot of current page
 * This function is called from executeScript
 */
export function createSnapshot(
  nextElementId: number,
  options?: CreateSnapshotOptions
): CreateSnapshotResult {
  try {
    // Determine root element
    let rootElement: Element = document.body;

    if (options?.selector) {
      try {
        const selected = document.querySelector(options.selector);
        if (!selected) {
          return {
            tree: null,
            nodeCount: 0,
            truncated: false,
            nextElementId,
            selectorError: `Selector "${options.selector}" not found`,
          };
        }
        rootElement = selected;
      } catch {
        return {
          tree: null,
          nodeCount: 0,
          truncated: false,
          nextElementId,
          selectorError: `Invalid selector syntax: "${options.selector}"`,
        };
      }
    }

    // Walk from root element
    const treeOptions: TreeWalkerOptions = {
      includeIframes: options?.includeIframes ?? true,
    };
    if (options?.includeAll !== undefined) {
      treeOptions.includeAll = options.includeAll;
    }
    const { newUids, ...result } = walkTree(rootElement, nextElementId, treeOptions);

    if (!result.tree) {
      throw new Error('Failed to generate tree');
    }

    // Only remember the new UIDs now that the snapshot is complete: the caller stores the returned
    // nextElementId, so UIDs from a failed snapshot must not stay resolvable.
    registerUids(newUids);

    return result;
  } catch {
    return {
      tree: null,
      nodeCount: 0,
      truncated: false,
      nextElementId,
    };
  }
}

/**
 * Resolve a UID to the element it was assigned to during a snapshot
 */
export function resolveUid(uid: string): Element | null {
  return lookupElement(uid);
}

/**
 * Generate a CSS selector for the element a UID points at
 */
export function uidToSelector(uid: string): string | null {
  const el = lookupElement(uid);
  return el ? generateCssSelector(el) : null;
}

/**
 * Forget all UID associations, making every existing UID unresolvable
 */
export function clearUidRegistry(): void {
  clearRegistry();
}

// Make it available globally for executeScript
if (typeof window !== 'undefined') {
  const target = window as any;
  target.__createSnapshot = createSnapshot;
  target.__resolveUid = resolveUid;
  target.__uidToSelector = uidToSelector;
  target.__clearUidRegistry = clearUidRegistry;
}
