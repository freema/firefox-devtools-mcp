/**
 * DOM interactions: evaluate, element lookup, input actions
 */

import { By, Key, until, type WebDriver } from 'selenium-webdriver';

export class DomInteractions {
  constructor(private driver: WebDriver) {}

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
}
