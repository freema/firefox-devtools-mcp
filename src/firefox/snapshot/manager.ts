/**
 * Snapshot Manager
 * Handles snapshot creation, UID resolution, caching, and staleness detection
 */

import type { WebDriver, WebElement } from 'selenium-webdriver';
import { By } from 'selenium-webdriver';
import { logDebug } from '../../utils/logger.js';
import type {
  Snapshot,
  SnapshotJson,
  InjectedScriptResult,
  UidEntry,
  ElementCacheEntry,
} from './types.js';
import { formatSnapshotTree } from './formatter.js';

// Import injected script modules (will be bundled)
import { createSnapshot } from './injected/snapshot.injected.js';

/**
 * Snapshot Manager
 */
export class SnapshotManager {
  private driver: WebDriver;
  private currentSnapshotId = 0;
  private uidToEntry = new Map<string, UidEntry>();
  private elementCache = new Map<string, ElementCacheEntry>();
  private lastNavigationTime = Date.now();

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  /**
   * Take a snapshot of the current page
   * Returns text and JSON with snapshotId, no DOM mutations
   */
  async takeSnapshot(): Promise<Snapshot> {
    const snapshotId = ++this.currentSnapshotId;
    this.uidToEntry.clear();
    this.elementCache.clear();

    logDebug(`Taking snapshot (ID: ${snapshotId})...`);

    // Inject and execute snapshot script
    // For now, we'll inline the script as a string
    // TODO: Bundle this properly in Milestone 5
    const result = await this.executeInjectedScript(snapshotId);

    logDebug(
      `Snapshot executeScript result: hasResult=${!!result}, hasTree=${!!result?.tree}, truncated=${result?.truncated || false}`
    );

    // Debug: log isRelevant results
    if (result?.debugLog && Array.isArray(result.debugLog)) {
      logDebug(`isRelevant debug log (${result.debugLog.length} elements checked):`);
      result.debugLog.slice(0, 20).forEach((log: any) => {
        logDebug(`  ${log.relevant ? '✓' : '✗'} ${log.el} (depth ${log.depth})`);
      });
      if (result.debugLog.length > 20) {
        logDebug(`  ... and ${result.debugLog.length - 20} more`);
      }
    }

    if (!result?.tree) {
      const errorMsg = 'Unknown error';
      logDebug(`Snapshot generation failed: ${errorMsg}`);
      throw new Error(`Failed to generate snapshot: ${errorMsg}`);
    }

    // Store UID mappings
    for (const entry of result.uidMap) {
      this.uidToEntry.set(entry.uid, entry);
    }

    // Create snapshot object
    const snapshotJson: SnapshotJson = {
      root: result.tree,
      snapshotId,
      timestamp: Date.now(),
      truncated: result.truncated,
    };

    const snapshot: Snapshot = {
      text: formatSnapshotTree(result.tree),
      json: snapshotJson,
    };

    logDebug(
      `Snapshot created: ${result.uidMap.length} elements with UIDs${result.truncated ? ' (truncated)' : ''}`
    );

    return snapshot;
  }

  /**
   * Resolve UID to CSS selector (with staleness check)
   */
  resolveUidToSelector(uid: string): string {
    this.validateUid(uid);

    const entry = this.uidToEntry.get(uid);
    if (!entry) {
      throw new Error(`UID not found: ${uid}. Take a fresh snapshot first.`);
    }

    return entry.css;
  }

  /**
   * Resolve UID to WebElement (with staleness check and caching)
   * Tries CSS first, falls back to XPath
   */
  async resolveUidToElement(uid: string): Promise<WebElement> {
    this.validateUid(uid);

    const entry = this.uidToEntry.get(uid);
    if (!entry) {
      throw new Error(`UID not found: ${uid}. Take a fresh snapshot first.`);
    }

    // Check cache
    const cached = this.elementCache.get(uid);
    if (cached && cached.cachedElement) {
      try {
        // Validate element is still alive
        await cached.cachedElement.isDisplayed();
        logDebug(`Using cached element for UID: ${uid}`);
        return cached.cachedElement;
      } catch (e) {
        // Element is stale, re-find it
        logDebug(`Cached element stale for UID: ${uid}, re-finding...`);
      }
    }

    // Try CSS selector first
    try {
      const element = await this.driver.findElement(By.css(entry.css));

      // Update cache
      this.elementCache.set(uid, {
        selector: entry.css,
        xpath: entry.xpath,
        cachedElement: element,
        snapshotId: this.currentSnapshotId,
        timestamp: Date.now(),
      });

      logDebug(`Found element by CSS for UID: ${uid}`);
      return element;
    } catch (cssError) {
      logDebug(
        `CSS selector failed for UID: ${uid}, trying XPath fallback...`
      );

      // Fallback to XPath if available
      if (entry.xpath) {
        try {
          const element = await this.driver.findElement(By.xpath(entry.xpath));

          // Update cache
          this.elementCache.set(uid, {
            selector: entry.css,
            xpath: entry.xpath,
            cachedElement: element,
            snapshotId: this.currentSnapshotId,
            timestamp: Date.now(),
          });

          logDebug(`Found element by XPath for UID: ${uid}`);
          return element;
        } catch (xpathError) {
          throw new Error(
            `Element not found for UID: ${uid}. The element may have changed. Take a fresh snapshot.`
          );
        }
      }

      throw new Error(
        `Element not found for UID: ${uid}. The element may have changed. Take a fresh snapshot.`
      );
    }
  }

  /**
   * Clear snapshot (called on navigation)
   */
  clear(): void {
    this.uidToEntry.clear();
    this.elementCache.clear();
    this.lastNavigationTime = Date.now();
    logDebug('Snapshot UIDs cleared');
  }

  /**
   * Validate UID (staleness check)
   */
  private validateUid(uid: string): void {
    const parts = uid.split('_');
    if (parts.length < 2) {
      throw new Error(`Invalid UID format: ${uid}`);
    }

    const uidSnapshotId = parseInt(parts[0], 10);
    if (isNaN(uidSnapshotId)) {
      throw new Error(`Invalid UID format: ${uid}`);
    }

    if (uidSnapshotId !== this.currentSnapshotId) {
      throw new Error(
        `This uid is from a stale snapshot (snapshot ${uidSnapshotId}, current ${this.currentSnapshotId}). Take a fresh snapshot.`
      );
    }
  }

  /**
   * Execute injected snapshot script
   * TODO: In Milestone 5, this will use a pre-bundled script
   */
  private async executeInjectedScript(
    snapshotId: number
  ): Promise<InjectedScriptResult> {
    // For now, we'll build the script inline
    // This is a temporary solution until we add the bundler in Milestone 5

    const scriptSource = this.buildInlineScript();

    const result = await this.driver.executeScript<InjectedScriptResult>(
      `
      ${scriptSource}
      return window.__createSnapshot(arguments[0]);
      `,
      snapshotId
    );

    return result;
  }

  /**
   * Build inline script (temporary until bundler is added)
   * This concatenates all the injected modules
   */
  private buildInlineScript(): string {
    // This is a placeholder - in Milestone 5 we'll use esbuild to bundle this properly
    // For now, we'll use a simplified inline version

    return `
    (function() {
      // Simplified inline version of the injected script
      // This will be replaced with proper bundled version in Milestone 5

      const MAX_DEPTH = 10;
      const MAX_NODES = 1000;
      const MAX_TEXT_LENGTH = 100;
      const MAX_SEGMENT_LENGTH = 64;
      const INTERACTIVE_TAGS = ['a', 'button', 'input', 'select', 'textarea', 'img', 'video', 'audio', 'iframe'];
      const SEMANTIC_TAGS = ['nav', 'main', 'section', 'article', 'header', 'footer'];
      const CONTAINER_TAGS = ['div', 'span', 'p', 'li', 'ul', 'ol'];
      const MAX_TEXT_CONTENT = 500;
      const PREFERRED_ID_ATTRS = ['id', 'data-testid', 'data-test-id'];

      function isRelevant(el) {
        if (!el || el.nodeType !== 1) return false;

        try {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
          }
        } catch (e) {
          return false;
        }

        const tag = el.tagName.toLowerCase();
        if (INTERACTIVE_TAGS.indexOf(tag) !== -1) return true;
        if (el.hasAttribute('role')) return true;
        if (el.hasAttribute('aria-label')) return true;
        if (/^h[1-6]$/.test(tag)) return true;
        if (SEMANTIC_TAGS.indexOf(tag) !== -1) return true;

        if (CONTAINER_TAGS.indexOf(tag) !== -1) {
          // Include if it has id or class (for testing/automation)
          if (el.id || el.className) return true;
          // Include if it has text content
          const textContent = (el.textContent || '').trim();
          if (textContent.length > 0 && textContent.length < MAX_TEXT_CONTENT) return true;
        }

        return false;
      }

      function getTextContent(el) {
        let text = '';
        for (let i = 0; i < el.childNodes.length; i++) {
          const node = el.childNodes[i];
          if (node.nodeType === 3) text += node.textContent || '';
        }
        const trimmed = text.trim();
        return trimmed ? trimmed.substring(0, MAX_TEXT_LENGTH) : undefined;
      }

      function getElementName(el) {
        if (el.hasAttribute('aria-label')) return el.getAttribute('aria-label');

        const elId = el.id;
        if (elId) {
          const label = document.querySelector('label[for="' + elId + '"]');
          if (label && label.textContent) return label.textContent.trim();
        }

        if (el.hasAttribute('placeholder')) return el.getAttribute('placeholder');
        if (el.hasAttribute('title')) return el.getAttribute('title');
        if (el.hasAttribute('alt')) return el.getAttribute('alt');
        if (el.hasAttribute('name')) return el.getAttribute('name');

        const tag = el.tagName.toLowerCase();
        if (['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(tag) !== -1) {
          return getTextContent(el);
        }

        return undefined;
      }

      function generateCssSelector(el) {
        const path = [];
        let current = el;

        while (current && current.nodeType === 1) {
          let selector = current.nodeName.toLowerCase();
          let hasId = false;

          for (let i = 0; i < PREFERRED_ID_ATTRS.length; i++) {
            const idAttr = PREFERRED_ID_ATTRS[i];
            const value = current.getAttribute(idAttr);
            if (value) {
              if (idAttr === 'id') {
                selector += '#' + CSS.escape(value);
              } else {
                selector += '[' + idAttr + '="' + value + '"]';
              }
              path.unshift(selector);
              hasId = true;
              break;
            }
          }

          if (hasId) break;

          const siblings = current.parentElement?.children;
          if (siblings && siblings.length > 1) {
            let nth = 1;
            for (let i = 0; i < siblings.length; i++) {
              if (siblings[i] === current) break;
              if (siblings[i].nodeName === current.nodeName) nth++;
            }
            if (nth > 1) selector += ':nth-of-type(' + nth + ')';
          }

          path.unshift(selector);
          current = current.parentElement;

          if (current && current.nodeName.toLowerCase() === 'body') {
            path.unshift('body');
            break;
          }
        }

        return path.join(' > ');
      }

      function generateXPath(el) {
        if (el.id) return '//*[@id="' + el.id + '"]';

        const path = [];
        let current = el;

        while (current && current.nodeType === 1) {
          const tagName = current.nodeName.toLowerCase();
          let index = 1;
          let sibling = current.previousElementSibling;

          while (sibling) {
            if (sibling.nodeName.toLowerCase() === tagName) index++;
            sibling = sibling.previousElementSibling;
          }

          path.unshift(tagName + '[' + index + ']');
          current = current.parentElement;

          if (current && current.nodeName.toLowerCase() === 'html') {
            path.unshift('html');
            break;
          }
        }

        return '/' + path.join('/');
      }

      function getAriaAttributes(el) {
        const aria = {};
        let hasAny = false;

        ['disabled', 'hidden', 'selected', 'expanded'].forEach(function(attr) {
          const value = el.getAttribute('aria-' + attr);
          if (value !== null) {
            aria[attr] = value === 'true';
            hasAny = true;
          }
        });

        ['checked', 'pressed'].forEach(function(attr) {
          const value = el.getAttribute('aria-' + attr);
          if (value !== null) {
            aria[attr] = value === 'mixed' ? 'mixed' : value === 'true';
            hasAny = true;
          }
        });

        ['autocomplete', 'haspopup', 'invalid', 'label', 'labelledby', 'describedby', 'controls'].forEach(function(attr) {
          const value = el.getAttribute('aria-' + attr);
          if (value) {
            aria[attr] = value;
            hasAny = true;
          }
        });

        const levelValue = el.getAttribute('aria-level');
        if (levelValue) {
          const level = parseInt(levelValue, 10);
          if (!isNaN(level)) {
            aria.level = level;
            hasAny = true;
          }
        }

        return hasAny ? aria : undefined;
      }

      function getComputedProperties(el) {
        const computed = {};

        try {
          const style = window.getComputedStyle(el);
          computed.visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        } catch (e) {
          computed.visible = false;
        }

        computed.accessible = computed.visible && !el.getAttribute('aria-hidden');
        computed.focusable = el.tabIndex >= 0 || ['a', 'button', 'input', 'select', 'textarea'].indexOf(el.tagName.toLowerCase()) !== -1;
        computed.interactive = INTERACTIVE_TAGS.indexOf(el.tagName.toLowerCase()) !== -1;

        return computed;
      }

      function walkTree(rootElement, snapshotId, includeIframes) {
        let counter = 0;
        const uidMap = [];
        let truncated = false;
        const debugLog = [];

        function walk(el, depth) {
          if (depth > MAX_DEPTH || counter >= MAX_NODES) {
            truncated = true;
            return null;
          }

          const tag = el.tagName.toLowerCase();
          const isRoot = tag === 'body' || tag === 'html';

          // Debug logging
          const elId = el.id || '';
          const elDebug = tag + (elId ? '#' + elId : '');

          if (!isRoot) {
            const relevant = isRelevant(el);
            debugLog.push({ el: elDebug, relevant, depth });
            if (!relevant) return null;
          }

          const uid = snapshotId + '_' + counter++;
          const css = generateCssSelector(el);
          const xpath = generateXPath(el);

          uidMap.push({ uid: uid, css: css, xpath: xpath });

          const node = {
            uid: uid,
            tag: tag,
            role: el.getAttribute('role') || undefined,
            name: getElementName(el),
            value: el.value || undefined,
            href: el.href || undefined,
            src: el.src || undefined,
            text: getTextContent(el),
            aria: getAriaAttributes(el),
            computed: getComputedProperties(el),
            children: []
          };

          if (tag === 'iframe' && includeIframes) {
            try {
              const iframeDoc = el.contentDocument || el.contentWindow?.document;
              if (iframeDoc && iframeDoc.body) {
                const iframeTree = walk(iframeDoc.body, depth + 1);
                if (iframeTree) {
                  iframeTree.isIframe = true;
                  iframeTree.frameSrc = el.src;
                  node.children.push(iframeTree);
                }
              } else {
                node.isIframe = true;
                node.frameSrc = el.src;
                node.crossOrigin = true;
              }
            } catch (e) {
              node.isIframe = true;
              node.frameSrc = el.src;
              node.crossOrigin = true;
            }
            return node;
          }

          for (let i = 0; i < el.children.length; i++) {
            if (counter >= MAX_NODES) {
              truncated = true;
              break;
            }
            const child = el.children[i];
            const childNode = walk(child, depth + 1);
            if (childNode) node.children.push(childNode);
          }

          return node;
        }

        const tree = walk(rootElement, 0);
        return { tree: tree, uidMap: uidMap, truncated: truncated, debugLog: debugLog };
      }

      window.__createSnapshot = function(snapshotId) {
        try {
          return walkTree(document.body, snapshotId, true);
        } catch (error) {
          return { tree: null, uidMap: [], truncated: false };
        }
      };
    })();
    `;
  }
}
