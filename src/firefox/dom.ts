/**
 * DOM interactions: evaluate, element lookup, input actions
 */

import { By, Key, until, type WebDriver, type WebElement } from 'selenium-webdriver';

export class DomInteractions {
  constructor(
    private driver: WebDriver,
    private resolveUid?: (uid: string) => Promise<WebElement>
  ) {}

  /**
   * Evaluate JavaScript - direct passthrough to executeScript
   */
  async evaluate(script: string): Promise<unknown> {
    return await this.driver.executeScript(script);
  }

  /**
   * Get page HTML content
   */
  async getContent(): Promise<string> {
    const html = await this.evaluate('return document.documentElement.outerHTML');
    return String(html);
  }

  /**
   * Click element by CSS selector
   */
  async clickBySelector(selector: string): Promise<void> {
    const el = await this.driver.wait(until.elementLocated(By.css(selector)), 5000);
    await this.driver.wait(until.elementIsVisible(el), 5000).catch(() => {});
    await el.click();
  }

  /**
   * Hover over element by CSS selector
   */
  async hoverBySelector(selector: string): Promise<void> {
    const el = await this.driver.wait(until.elementLocated(By.css(selector)), 5000);
    await this.driver.actions({ async: true }).move({ origin: el }).perform();
  }

  /**
   * Fill input field by CSS selector
   */
  async fillBySelector(selector: string, text: string): Promise<void> {
    const el = await this.driver.wait(until.elementLocated(By.css(selector)), 5000);
    try {
      await el.clear();
    } catch {
      // Some inputs may not support clear(); fall back to select-all + delete
      await el.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.DELETE);
    }
    await el.sendKeys(text);
  }

  /**
   * Drag & drop using JS events fallback (DataTransfer).
   * Works on simple pages; not guaranteed for all custom DnD libs.
   */
  async dragAndDropBySelectors(sourceSelector: string, targetSelector: string): Promise<void> {
    await this.driver.executeScript(
      (srcSel: string, tgtSel: string) => {
        const src = document.querySelector(srcSel);
        const tgt = document.querySelector(tgtSel);
        if (!src || !tgt) {
          throw new Error('dragAndDrop: element not found');
        }

        function dispatch(type: string, target: Element, dataTransfer?: DataTransfer) {
          const evt = new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          } as DragEventInit);
          return target.dispatchEvent(evt);
        }

        // Create DataTransfer if available
        const dt = typeof DataTransfer !== 'undefined' ? new DataTransfer() : undefined;
        dispatch('dragstart', src, dt);
        dispatch('dragenter', tgt, dt);
        dispatch('dragover', tgt, dt);
        dispatch('drop', tgt, dt);
        dispatch('dragend', src, dt);
      },
      sourceSelector,
      targetSelector
    );
  }

  /**
   * File upload: unhide if needed, then send local path to <input type=file>.
   */
  async uploadFileBySelector(selector: string, filePath: string): Promise<void> {
    // Try to locate input element
    const el = await this.driver.wait(until.elementLocated(By.css(selector)), 5000);
    // Ensure it's an <input type=file>; if hidden, unhide via JS
    await this.driver.executeScript((sel: string) => {
      const e = document.querySelector(sel);
      if (!e) {
        throw new Error('uploadFile: element not found');
      }
      if (e.tagName !== 'INPUT' || (e as HTMLInputElement).type !== 'file') {
        throw new Error('uploadFile: selector must target <input type=file>');
      }
      const style = window.getComputedStyle(e);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        const s = (e as HTMLElement).style;
        s.display = 'block';
        s.visibility = 'visible';
        s.opacity = '1';
        s.position = 'fixed';
        s.left = '0px';
        s.top = '0px';
        s.zIndex = '2147483647';
      }
    }, selector);
    await el.sendKeys(filePath);
  }

  // ============================================================================
  // UID-based input methods
  // ============================================================================

  /**
   * Click element by UID
   * Requires resolveUid callback to be set (from SnapshotManager)
   */
  async clickByUid(uid: string, dblClick = false): Promise<void> {
    if (!this.resolveUid) {
      throw new Error('clickByUid: resolveUid callback not set. Ensure snapshot is initialized.');
    }
    const el = await this.resolveUid(uid);
    await this.driver.wait(until.elementIsVisible(el), 5000).catch(() => {});

    if (dblClick) {
      await this.driver.actions({ async: true }).doubleClick(el).perform();
    } else {
      await el.click();
    }

    // Wait for events to propagate
    await this.waitForEventsAfterAction();
  }

  /**
   * Hover over element by UID
   */
  async hoverByUid(uid: string): Promise<void> {
    if (!this.resolveUid) {
      throw new Error('hoverByUid: resolveUid callback not set. Ensure snapshot is initialized.');
    }
    const el = await this.resolveUid(uid);
    await this.driver.actions({ async: true }).move({ origin: el }).perform();

    // Wait for events to propagate
    await this.waitForEventsAfterAction();
  }

  /**
   * Fill input field by UID
   */
  async fillByUid(uid: string, value: string): Promise<void> {
    if (!this.resolveUid) {
      throw new Error('fillByUid: resolveUid callback not set. Ensure snapshot is initialized.');
    }
    const el = await this.resolveUid(uid);

    try {
      await el.clear();
    } catch {
      // Some inputs may not support clear(); fall back to select-all + delete
      await el.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.DELETE);
    }

    await el.sendKeys(value);

    // Wait for events to propagate
    await this.waitForEventsAfterAction();
  }

  /**
   * Drag & drop by UIDs
   * Uses JS events fallback for better compatibility
   */
  async dragByUidToUid(fromUid: string, toUid: string): Promise<void> {
    if (!this.resolveUid) {
      throw new Error(
        'dragByUidToUid: resolveUid callback not set. Ensure snapshot is initialized.'
      );
    }

    const fromEl = await this.resolveUid(fromUid);
    const toEl = await this.resolveUid(toUid);

    // Use JS drag events fallback for compatibility (Actions DnD not used)
    await this.driver.executeScript(
      (srcEl: Element, tgtEl: Element) => {
        if (!srcEl || !tgtEl) {
          throw new Error('dragAndDrop: element not found');
        }

        function dispatch(type: string, target: Element, dataTransfer?: DataTransfer) {
          const evt = new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          } as DragEventInit);
          return target.dispatchEvent(evt);
        }

        // Create DataTransfer if available
        const dt = typeof DataTransfer !== 'undefined' ? new DataTransfer() : undefined;
        dispatch('dragstart', srcEl, dt);
        dispatch('dragenter', tgtEl, dt);
        dispatch('dragover', tgtEl, dt);
        dispatch('drop', tgtEl, dt);
        dispatch('dragend', srcEl, dt);
      },
      fromEl,
      toEl
    );

    // Wait for events to propagate
    await this.waitForEventsAfterAction();
  }

  /**
   * Fill multiple form fields by UIDs
   */
  async fillFormByUid(elements: Array<{ uid: string; value: string }>): Promise<void> {
    if (!this.resolveUid) {
      throw new Error(
        'fillFormByUid: resolveUid callback not set. Ensure snapshot is initialized.'
      );
    }

    for (const { uid, value } of elements) {
      await this.fillByUid(uid, value);
    }
  }

  /**
   * Upload file by UID
   * Handles hidden file inputs by making them visible
   */
  async uploadFileByUid(uid: string, filePath: string): Promise<void> {
    if (!this.resolveUid) {
      throw new Error(
        'uploadFileByUid: resolveUid callback not set. Ensure snapshot is initialized.'
      );
    }

    const el = await this.resolveUid(uid);

    // Ensure it's an <input type=file>; if hidden, unhide via JS
    await this.driver.executeScript((element: Element) => {
      if (!element) {
        throw new Error('uploadFile: element not found');
      }
      if (element.tagName !== 'INPUT' || (element as HTMLInputElement).type !== 'file') {
        throw new Error('uploadFile: element must be <input type=file>');
      }
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        const s = (element as HTMLElement).style;
        s.display = 'block';
        s.visibility = 'visible';
        s.opacity = '1';
        s.position = 'fixed';
        s.left = '0px';
        s.top = '0px';
        s.zIndex = '2147483647';
      }
    }, el);

    await el.sendKeys(filePath);

    // Wait for events to propagate
    await this.waitForEventsAfterAction();
  }

  /**
   * Wait for events to propagate after user action
   * Gives the page time to respond to interactions
   */
  private async waitForEventsAfterAction(): Promise<void> {
    // Wait for microtask/raf to allow event handlers to fire
    await this.driver.executeScript('return new Promise(r => requestAnimationFrame(() => r()))');
    // Small additional delay for good measure
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // ============================================================================
  // Screenshot
  // ============================================================================

  /**
   * Take screenshot of the entire page
   * @returns PNG as base64 string
   */
  async takeScreenshotPage(): Promise<string> {
    return await this.driver.takeScreenshot();
  }

  /**
   * Take screenshot of element by UID
   * Scrolls element into view, then captures it
   * @param uid Element UID from snapshot
   * @returns PNG as base64 string
   */
  async takeScreenshotByUid(uid: string): Promise<string> {
    if (!this.resolveUid) {
      throw new Error(
        'takeScreenshotByUid: resolveUid callback not set. Ensure snapshot is initialized.'
      );
    }

    const el = await this.resolveUid(uid);

    // Scroll element into view
    await this.driver.executeScript(
      'arguments[0].scrollIntoView({block: "center", inline: "center"});',
      el
    );

    // Wait for scroll to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Take screenshot of element (Selenium automatically crops to element bounds)
    return await el.takeScreenshot();
  }
}
