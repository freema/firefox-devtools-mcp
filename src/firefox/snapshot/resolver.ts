/**
 * UID Resolver
 * Resolves UIDs by asking the content page for the element the UID was assigned to
 * during the snapshot (see injected/uidRegistry.ts)
 */

import { WebDriver, WebElement } from 'selenium-webdriver';
import { logDebug } from '../../utils/logger.js';

const RESOLVE_SCRIPT = 'return window.__resolveUid ? window.__resolveUid(arguments[0]) : null;';
const SELECTOR_SCRIPT =
  'return window.__uidToSelector ? window.__uidToSelector(arguments[0]) : null;';
const CLEAR_SCRIPT = 'if (window.__clearUidRegistry) { window.__clearUidRegistry(); }';

/**
 * UID Resolver class
 * Separated from SnapshotManager for better modularity
 */
export class UidResolver {
  constructor(private driver: WebDriver) {}

  /**
   * Forget all UID associations in the page, making existing UIDs unresolvable.
   * Best effort: the registry dies with the page anyway.
   */
  async clear(): Promise<void> {
    try {
      await this.driver.executeScript(CLEAR_SCRIPT);
      logDebug('Snapshot UIDs cleared');
    } catch {
      logDebug('Unable to clear snapshot UIDs (page may be navigating)');
    }
  }

  /**
   * Resolve UID to a CSS selector, generated on demand from the element it points at
   */
  async resolveUidToSelector(uid: string): Promise<string> {
    const selector = await this.driver.executeScript<string | null>(SELECTOR_SCRIPT, uid);
    if (!selector) {
      throw new Error(notFoundMessage(uid));
    }

    return selector;
  }

  /**
   * Resolve UID to the element it was assigned to during the snapshot
   */
  async resolveUidToElement(uid: string): Promise<WebElement> {
    const element = await this.driver.executeScript<WebElement | null>(RESOLVE_SCRIPT, uid);
    if (!element) {
      throw new Error(notFoundMessage(uid));
    }

    logDebug(`Resolved element for UID: ${uid}`);
    return element;
  }
}

function notFoundMessage(uid: string): string {
  return (
    `UID not found: ${uid}. The element is gone from the page, or the page was reloaded. ` +
    'Take a fresh snapshot first.'
  );
}
