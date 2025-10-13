/**
 * Snapshot and UID mapping for DOM elements
 */

/* eslint-disable no-inner-declarations, @typescript-eslint/prefer-optional-chain */

import type { WebDriver } from 'selenium-webdriver';
import { logDebug } from '../utils/logger.js';

/**
 * Snapshot node structure
 */
export interface SnapshotNode {
  uid: string;
  tag: string;
  role?: string;
  name?: string;
  value?: string;
  href?: string;
  src?: string;
  text?: string;
  children: SnapshotNode[];
}

/**
 * Snapshot result
 */
export interface Snapshot {
  text: string;
  json: {
    root: SnapshotNode;
    snapshotId: number;
    timestamp: number;
  };
}

/**
 * Snapshot management for DOM tree
 */
export class SnapshotManager {
  private driver: WebDriver;
  private currentSnapshotId = 1;
  private uidToSelector: Map<string, string> = new Map();

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  /**
   * Take a snapshot of the current page
   * Injects data-mcp-uid attributes and returns tree structure
   */
  async takeSnapshot(): Promise<Snapshot> {
    const snapshotId = this.currentSnapshotId++;
    this.uidToSelector.clear();

    logDebug(`Taking snapshot (ID: ${snapshotId})...`);

    // Inject UIDs and collect tree structure via JS
    const result = await this.driver.executeScript<{
      tree: SnapshotNode | null;
      uidMap: Array<[string, string]>;
      error?: string;
    }>(
      `
      const snapshotId = arguments[0];
      try {
        let counter = 0;
        const uidMap = [];

        // Helper: Check if element is visible and relevant
        function isRelevant(el) {
          if (!el || el.nodeType !== 1) {
            return false;
          } // Only elements

          try {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return false;
            }
          } catch (e) {
            return false;
          }

          const tag = el.tagName.toLowerCase();

          // Always include interactive elements
          const interactive = [
            'a',
            'button',
            'input',
            'select',
            'textarea',
            'img',
            'video',
            'audio',
            'iframe',
          ];
          if (interactive.indexOf(tag) !== -1) {
            return true;
          }

          // Include elements with role
          if (el.hasAttribute('role')) {
            return true;
          }

          // Include elements with aria-label
          if (el.hasAttribute('aria-label')) {
            return true;
          }

          // Include headings
          if (/^h[1-6]$/.test(tag)) {
            return true;
          }

          // Include semantic elements
          if (['nav', 'main', 'section', 'article', 'header', 'footer'].indexOf(tag) !== -1) {
            return true;
          }

          // Include common container elements
          if (['div', 'span', 'p', 'li', 'ul', 'ol'].indexOf(tag) !== -1) {
            // But only if they have some text or attributes
            const textContent = (el.textContent || '').trim();
            if (textContent.length > 0 && textContent.length < 500) {
              return true;
            }
            // Or if they have id/class
            if (el.id || el.className) {
              return true;
            }
          }

          return false;
        }

        // Helper: Extract text content (direct text only, not from deep children)
        function getTextContent(el) {
          let text = '';
          for (let i = 0; i < el.childNodes.length; i++) {
            const node = el.childNodes[i];
            if (node.nodeType === 3) {
              // Text node
              text += node.textContent || '';
            }
          }
          return text.trim().substring(0, 100); // Limit length
        }

        // Helper: Get element name/label
        function getElementName(el) {
          // aria-label
          if (el.hasAttribute('aria-label')) {
            return el.getAttribute('aria-label');
          }

          // label for input
          const elId = el.id;
          if (elId) {
            const label = document.querySelector('label[for="' + elId + '"]');
            if (label && label.textContent) {
              return label.textContent.trim();
            }
          }

          // placeholder
          if (el.hasAttribute('placeholder')) {
            return el.getAttribute('placeholder');
          }

          // title
          if (el.hasAttribute('title')) {
            return el.getAttribute('title');
          }

          // alt for images
          if (el.hasAttribute('alt')) {
            return el.getAttribute('alt');
          }

          // text content for buttons/links
          const tag = el.tagName.toLowerCase();
          if (['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(tag) !== -1) {
            return getTextContent(el);
          }

          return null;
        }

        // Recursive walker
        function walkTree(el, depth) {
          if (depth > 10) {
            return null;
          } // Prevent too deep recursion

          // Always include body/html
          const tag = el.tagName.toLowerCase();
          const isRoot = tag === 'body' || tag === 'html';

          if (!isRoot && !isRelevant(el)) {
            return null;
          }

          const uid = snapshotId + '_' + counter++;
          const selector = '[data-mcp-uid="' + uid + '"]';

          // Inject UID attribute
          el.setAttribute('data-mcp-uid', uid);
          uidMap.push([uid, selector]);

          const node = {
            uid: uid,
            tag: tag,
            role: el.getAttribute('role') || undefined,
            name: getElementName(el) || undefined,
            value: el.value || undefined,
            href: el.href || undefined,
            src: el.src || undefined,
            text: getTextContent(el) || undefined,
            children: [],
          };

          // Walk children
          for (let i = 0; i < el.children.length; i++) {
            const child = el.children[i];
            const childNode = walkTree(child, depth + 1);
            if (childNode) {
              node.children.push(childNode);
            }
          }

          return node;
        }

        // Start from body
        const tree = walkTree(document.body, 0);

        return { tree: tree, uidMap: uidMap };
      } catch (error) {
        return {
          tree: null,
          uidMap: [],
          error: error.toString(),
        };
      }
    `,
      snapshotId
    );

    logDebug(
      `Snapshot executeScript result: hasResult=${!!result}, hasTree=${!!result?.tree}, error=${result?.error || 'none'}`,
    );

    if (!result?.tree) {
      const errorMsg = result?.error || 'Unknown error';
      logDebug(`Snapshot generation failed: ${errorMsg}`);
      throw new Error(`Failed to generate snapshot: ${errorMsg}`);
    }

    // Store UID to selector mapping
    for (const [uid, selector] of result.uidMap) {
      this.uidToSelector.set(uid, selector);
    }

    const snapshot: Snapshot = {
      text: this.formatTree(result.tree),
      json: {
        root: result.tree,
        snapshotId,
        timestamp: Date.now(),
      },
    };

    logDebug(`Snapshot created: ${result.uidMap.length} elements with UIDs`);

    return snapshot;
  }

  /**
   * Resolve UID to CSS selector
   */
  resolveUidToSelector(uid: string): string {
    const selector = this.uidToSelector.get(uid);
    if (!selector) {
      throw new Error(`UID not found: ${uid}. Take a fresh snapshot first.`);
    }
    return selector;
  }

  /**
   * Clear UID mappings (called on navigation)
   */
  clear(): void {
    this.uidToSelector.clear();
    logDebug('Snapshot UIDs cleared');
  }

  /**
   * Format snapshot tree as human-readable text
   */
  private formatTree(node: SnapshotNode, depth = 0): string {
    const indent = '  '.repeat(depth);
    const attrs: string[] = [];

    attrs.push(`uid=${node.uid}`);
    attrs.push(node.tag);

    if (node.role) {
      attrs.push(`role="${node.role}"`);
    }
    if (node.name) {
      attrs.push(`name="${node.name}"`);
    }
    if (node.value) {
      attrs.push(`value="${node.value}"`);
    }
    if (node.href) {
      attrs.push(`href="${node.href.substring(0, 50)}"`);
    }
    if (node.src) {
      attrs.push(`src="${node.src.substring(0, 50)}"`);
    }
    if (node.text) {
      attrs.push(`text="${node.text}"`);
    }

    let result = indent + attrs.join(' ') + '\n';

    for (const child of node.children) {
      result += this.formatTree(child, depth + 1);
    }

    return result;
  }
}
