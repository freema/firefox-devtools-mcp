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
 * Walk DOM tree and collect snapshot
 */
export function walkTree(
  rootElement: Element,
  snapshotId: number,
  includeIframes = true
): TreeWalkerResult {
  let counter = 0;
  const uidMap: UidEntry[] = [];
  let truncated = false;

  function walk(el: Element, depth: number): SnapshotNode | null {
    // Check limits
    if (depth > MAX_DEPTH) {
      truncated = true;
      return null;
    }

    if (counter >= MAX_NODES) {
      truncated = true;
      return null;
    }

    // Check relevance (except root)
    const tag = el.tagName.toLowerCase();
    const isRoot = tag === 'body' || tag === 'html';

    if (!isRoot && !isRelevant(el)) {
      return null;
    }

    // Generate UID and selectors
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
      children: [],
    };

    // Handle iframes
    if (tag === 'iframe' && includeIframes) {
      try {
        const iframe = el as HTMLIFrameElement;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (iframeDoc?.body) {
          // Same-origin iframe - traverse it
          const iframeTree = walk(iframeDoc.body, depth + 1);
          if (iframeTree) {
            iframeTree.isIframe = true;
            iframeTree.frameSrc = iframe.src;
            node.children.push(iframeTree);
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
      return node;
    }

    // Walk children
    for (let i = 0; i < el.children.length; i++) {
      if (counter >= MAX_NODES) {
        truncated = true;
        break;
      }

      const child = el.children[i];
      if (!child) {
        continue;
      }

      const childNode = walk(child, depth + 1);
      if (childNode) {
        node.children.push(childNode);
      }
    }

    return node;
  }

  const tree = walk(rootElement, 0);

  return {
    tree,
    uidMap,
    truncated,
  };
}
