/**
 * Tree walker with iframe support (runs in browser context)
 */

import type { SnapshotNode, UidEntry } from '../types.js';
import { isRelevant } from './elementCollector.js';
import {
  getElementName,
  getTextContent,
  getAriaAttributes,
  getComputedProperties,
} from './attributeCollector.js';
import { generateCssSelector, generateXPath } from './selectorGenerator.js';

/**
 * Configuration
 */
const MAX_DEPTH = 10;
const MAX_NODES = 1000;

/**
 * Tree walker result
 */
export interface TreeWalkerResult {
  tree: SnapshotNode | null;
  uidMap: UidEntry[];
  truncated: boolean;
}

/**
 * Tree walker options
 */
export interface TreeWalkerOptions {
  includeIframes?: boolean;
  includeAll?: boolean;
}

/**
 * Check if element is visible (not display:none, visibility:hidden, or opacity:0)
 */
function isVisible(el: Element): boolean {
  try {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Walk DOM tree and collect snapshot
 *
 * Key design: Always traverse children even if parent is not "relevant".
 * This ensures we don't miss deeply nested interactive elements inside
 * non-relevant wrapper divs (common in Vue/React/Livewire apps).
 *
 * @param options.includeIframes - Whether to traverse same-origin iframes (default: true)
 * @param options.includeAll - Include all visible elements, bypassing relevance filtering (default: false)
 */
export function walkTree(
  rootElement: Element,
  snapshotId: number,
  options: TreeWalkerOptions = {}
): TreeWalkerResult {
  const { includeIframes = true, includeAll = false } = options;

  let counter = 0;
  const uidMap: UidEntry[] = [];
  let truncated = false;

  /**
   * Walk an element and its children.
   * Returns: { node, relevantChildren } where:
   * - node: The SnapshotNode for this element (if relevant), or null
   * - relevantChildren: Array of relevant child/descendant nodes found
   */
  function walk(
    el: Element,
    depth: number
  ): { node: SnapshotNode | null; relevantChildren: SnapshotNode[] } {
    // Check limits
    if (depth > MAX_DEPTH) {
      truncated = true;
      return { node: null, relevantChildren: [] };
    }

    if (counter >= MAX_NODES) {
      truncated = true;
      return { node: null, relevantChildren: [] };
    }

    const tag = el.tagName.toLowerCase();
    const isRoot = tag === 'body' || tag === 'html';

    // Determine if this element should be included
    // In includeAll mode, include all visible elements
    // Otherwise, use the standard relevance check
    let elementIsRelevant: boolean;
    if (includeAll) {
      // In includeAll mode, include everything that's visible
      elementIsRelevant = isRoot || isVisible(el);
    } else {
      // Standard mode: use relevance filtering
      elementIsRelevant = isRoot || isRelevant(el);
    }

    // Always walk children first (even if this element isn't relevant)
    // This ensures we find nested interactive elements
    const childResults: SnapshotNode[] = [];

    // Handle iframes specially
    if (tag === 'iframe' && includeIframes && elementIsRelevant) {
      // Generate UID for this iframe
      const uid = `${snapshotId}_${counter++}`;
      const css = generateCssSelector(el);
      const xpath = generateXPath(el);
      uidMap.push({ uid, css, xpath });

      const node: SnapshotNode = {
        uid,
        tag,
        children: [],
      };

      try {
        const iframe = el as HTMLIFrameElement;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (iframeDoc?.body) {
          // Same-origin iframe - traverse it
          const iframeResult = walk(iframeDoc.body, depth + 1);
          if (iframeResult.node) {
            iframeResult.node.isIframe = true;
            iframeResult.node.frameSrc = iframe.src;
            node.children.push(iframeResult.node);
          }
        } else {
          // Cross-origin or no body - placeholder
          node.isIframe = true;
          node.frameSrc = iframe.src;
          node.crossOrigin = true;
        }
      } catch (e) {
        // Cross-origin error - add placeholder
        node.isIframe = true;
        node.frameSrc = (el as HTMLIFrameElement).src;
        node.crossOrigin = true;
      }
      return { node, relevantChildren: [] };
    }

    // Walk all children
    for (let i = 0; i < el.children.length; i++) {
      if (counter >= MAX_NODES) {
        truncated = true;
        break;
      }

      const child = el.children[i];
      if (!child) {
        continue;
      }

      const childResult = walk(child, depth + 1);

      if (childResult.node) {
        // Child itself is relevant - add it
        childResults.push(childResult.node);
      } else if (childResult.relevantChildren.length > 0) {
        // Child is not relevant but has relevant descendants - bubble them up
        childResults.push(...childResult.relevantChildren);
      }
    }

    // If this element is relevant, create a node for it
    if (elementIsRelevant) {
      const uid = `${snapshotId}_${counter++}`;
      const css = generateCssSelector(el);
      const xpath = generateXPath(el);
      uidMap.push({ uid, css, xpath });

      // Collect attributes
      const htmlEl = el as HTMLElement;
      const roleAttr = el.getAttribute('role');
      const nameAttr = getElementName(el);
      const textAttr = getTextContent(el);
      const valueAttr = (htmlEl as any).value;
      const hrefAttr = (htmlEl as any).href;
      const srcAttr = (htmlEl as any).src;
      const ariaAttr = getAriaAttributes(el);
      const computedAttr = getComputedProperties(el);

      const node: SnapshotNode = {
        uid,
        tag,
        ...(roleAttr && { role: roleAttr }),
        ...(nameAttr && { name: nameAttr }),
        ...(valueAttr && { value: valueAttr }),
        ...(hrefAttr && { href: hrefAttr }),
        ...(srcAttr && { src: srcAttr }),
        ...(textAttr && { text: textAttr }),
        ...(ariaAttr && { aria: ariaAttr }),
        ...(computedAttr && { computed: computedAttr }),
        children: childResults,
      };

      return { node, relevantChildren: [] };
    }

    // This element is not relevant - pass up any relevant children
    return { node: null, relevantChildren: childResults };
  }

  const result = walk(rootElement, 0);
  const tree = result.node;

  return {
    tree,
    uidMap,
    truncated,
  };
}
