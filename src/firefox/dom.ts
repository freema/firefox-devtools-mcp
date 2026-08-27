/**
 * DOM interactions: evaluate, element lookup, input actions
 */

import { By, Key, WebDriver, WebElement } from 'selenium-webdriver';

/**
 * Key names accepted by press_key. Names are matched case-insensitively.
 */
const KEY_MAP: Record<string, string> = {
  cancel: Key.CANCEL,
  help: Key.HELP,
  backspace: Key.BACK_SPACE,
  tab: Key.TAB,
  clear: Key.CLEAR,
  return: Key.RETURN,
  enter: Key.RETURN,
  numpadenter: Key.ENTER,
  pause: Key.PAUSE,
  escape: Key.ESCAPE,
  esc: Key.ESCAPE,
  space: Key.SPACE,
  pageup: Key.PAGE_UP,
  pagedown: Key.PAGE_DOWN,
  end: Key.END,
  home: Key.HOME,
  arrowleft: Key.ARROW_LEFT,
  left: Key.ARROW_LEFT,
  arrowup: Key.ARROW_UP,
  up: Key.ARROW_UP,
  arrowright: Key.ARROW_RIGHT,
  right: Key.ARROW_RIGHT,
  arrowdown: Key.ARROW_DOWN,
  down: Key.ARROW_DOWN,
  insert: Key.INSERT,
  delete: Key.DELETE,
  semicolon: Key.SEMICOLON,
  equals: Key.EQUALS,
  numpad0: Key.NUMPAD0,
  numpad1: Key.NUMPAD1,
  numpad2: Key.NUMPAD2,
  numpad3: Key.NUMPAD3,
  numpad4: Key.NUMPAD4,
  numpad5: Key.NUMPAD5,
  numpad6: Key.NUMPAD6,
  numpad7: Key.NUMPAD7,
  numpad8: Key.NUMPAD8,
  numpad9: Key.NUMPAD9,
  multiply: Key.MULTIPLY,
  add: Key.ADD,
  separator: Key.SEPARATOR,
  subtract: Key.SUBTRACT,
  decimal: Key.DECIMAL,
  divide: Key.DIVIDE,
  f1: Key.F1,
  f2: Key.F2,
  f3: Key.F3,
  f4: Key.F4,
  f5: Key.F5,
  f6: Key.F6,
  f7: Key.F7,
  f8: Key.F8,
  f9: Key.F9,
  f10: Key.F10,
  f11: Key.F11,
  f12: Key.F12,
};

const MODIFIER_MAP: Record<string, string> = {
  ctrl: Key.CONTROL,
  control: Key.CONTROL,
  alt: Key.ALT,
  shift: Key.SHIFT,
  meta: Key.META,
  cmd: Key.META,
  command: Key.META,
  win: Key.META,
  super: Key.META,
};

export interface KeyCombo {
  modifiers: string[];
  key: string;
}

/**
 * Parse a combination such as "ctrl+shift+t" into its modifiers and its single
 * non-modifier key. Any number of modifiers is allowed, but exactly one key is:
 * "ctrl+k+l" is rejected rather than silently dropping one of the two.
 * Unrecognised names are rejected too, so that a mistyped key name does not turn
 * into typed text.
 * @param combo Key name, single character, or "+"-separated combination
 */
export function parseKeyCombo(combo: string): KeyCombo {
  const trimmed = combo.trim();
  // A lone character is taken literally so that "+" itself can be pressed.
  const parts = [...trimmed].length === 1 ? [trimmed] : trimmed.split('+');

  const modifiers: string[] = [];
  let key: string | undefined;

  for (const part of parts) {
    const name = part.trim();
    if (name === '') {
      continue;
    }

    const lowerName = name.toLowerCase();
    const modifier = Object.hasOwn(MODIFIER_MAP, lowerName) ? MODIFIER_MAP[lowerName] : undefined;
    if (modifier) {
      modifiers.push(modifier);
      continue;
    }

    const mapped = Object.hasOwn(KEY_MAP, lowerName) ? KEY_MAP[lowerName] : undefined;
    if (mapped === undefined && [...name].length > 1) {
      throw new Error(`press_key: unknown key "${name}" in "${combo}"`);
    }
    if (key !== undefined) {
      throw new Error(
        `press_key: "${combo}" has more than one non-modifier key. Use any number of modifiers but a single key, for example "ctrl+shift+t".`
      );
    }
    key = mapped ?? name;
  }

  if (key === undefined) {
    throw new Error(`press_key: no key specified in "${combo}"`);
  }

  return { modifiers, key };
}

export class DomInteractions {
  constructor(
    private driver: WebDriver,
    private resolveUid?: (uid: string) => Promise<WebElement>
  ) {}

  // ============================================================================
  // Element polling helpers
  // ============================================================================

  /**
   * Poll for an element matching a CSS selector until found or timeout.
   */
  private async waitForElement(selector: string, timeout = 5000): Promise<WebElement> {
    const deadline = Date.now() + timeout;
    let lastError: Error | undefined;
    while (Date.now() < deadline) {
      try {
        return await this.driver.findElement(By.css(selector));
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw lastError ?? new Error(`Element not found: ${selector}`);
  }

  /**
   * Wait until an element reports isDisplayed(), ignoring failures.
   */
  private async waitForVisible(el: WebElement, timeout = 5000): Promise<void> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        if (await el.isDisplayed()) {
          return;
        }
      } catch {
        // Element may not be ready yet
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    // Visibility wait is best-effort; don't throw
  }

  // ============================================================================
  // Selector-based input methods
  // ============================================================================

  /**
   * Click element by CSS selector
   */
  async clickBySelector(selector: string): Promise<void> {
    const el = await this.waitForElement(selector, 5000);
    await this.waitForVisible(el, 5000);
    await el.click();
  }

  /**
   * Hover over element by CSS selector
   */
  async hoverBySelector(selector: string): Promise<void> {
    const el = await this.waitForElement(selector, 5000);
    await this.driver.actions({ async: true }).move({ origin: el }).perform();
  }

  /**
   * Fill input field by CSS selector
   */
  async fillBySelector(selector: string, text: string): Promise<void> {
    const el = await this.waitForElement(selector, 5000);
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
      `
      var srcSel = arguments[0], tgtSel = arguments[1];
      var src = document.querySelector(srcSel);
      var tgt = document.querySelector(tgtSel);
      if (!src || !tgt) throw new Error('dragAndDrop: element not found');
      function dispatch(type, target, dt) {
        var evt = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
        return target.dispatchEvent(evt);
      }
      var dt = typeof DataTransfer !== 'undefined' ? new DataTransfer() : undefined;
      dispatch('dragstart', src, dt);
      dispatch('dragenter', tgt, dt);
      dispatch('dragover', tgt, dt);
      dispatch('drop', tgt, dt);
      dispatch('dragend', src, dt);
    `,
      sourceSelector,
      targetSelector
    );
  }

  /**
   * File upload: unhide if needed, then send local path to <input type=file>.
   */
  async uploadFileBySelector(selector: string, filePath: string): Promise<void> {
    const el = await this.waitForElement(selector, 5000);
    // Ensure it's an <input type=file>; if hidden, unhide via JS
    await this.driver.executeScript(
      `
      var sel = arguments[0];
      var e = document.querySelector(sel);
      if (!e) throw new Error('uploadFile: element not found');
      if (e.tagName !== 'INPUT' || e.type !== 'file')
        throw new Error('uploadFile: selector must target <input type=file>');
      var style = window.getComputedStyle(e);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        var s = e.style;
        s.display = 'block'; s.visibility = 'visible'; s.opacity = '1';
        s.position = 'fixed'; s.left = '0px'; s.top = '0px';
        s.zIndex = '2147483647';
      }
    `,
      selector
    );
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
    await this.waitForVisible(el, 5000);

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
      `
      var srcEl = arguments[0], tgtEl = arguments[1];
      if (!srcEl || !tgtEl) throw new Error('dragAndDrop: element not found');
      function dispatch(type, target, dt) {
        var evt = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
        return target.dispatchEvent(evt);
      }
      var dt = typeof DataTransfer !== 'undefined' ? new DataTransfer() : undefined;
      dispatch('dragstart', srcEl, dt);
      dispatch('dragenter', tgtEl, dt);
      dispatch('dragover', tgtEl, dt);
      dispatch('drop', tgtEl, dt);
      dispatch('dragend', srcEl, dt);
    `,
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
    await this.driver.executeScript(
      `
      var element = arguments[0];
      if (!element) throw new Error('uploadFile: element not found');
      if (element.tagName !== 'INPUT' || element.type !== 'file')
        throw new Error('uploadFile: element must be <input type=file>');
      var style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        var s = element.style;
        s.display = 'block'; s.visibility = 'visible'; s.opacity = '1';
        s.position = 'fixed'; s.left = '0px'; s.top = '0px';
        s.zIndex = '2147483647';
      }
    `,
      el
    );

    await el.sendKeys(filePath);

    // Wait for events to propagate
    await this.waitForEventsAfterAction();
  }

  /**
   * Press a single key, optionally with modifiers.
   * @param key Key name or combination, such as "Escape", "Enter" or "ctrl+shift+t"
   * @param uid Element UID to focus first. Defaults to the focused element.
   */
  async pressKey(key: string, uid?: string): Promise<void> {
    const { modifiers, key: mainKey } = parseKeyCombo(key);

    if (uid) {
      // If a uid was provided, focus the element first so that actions will be
      // applied to it.
      await this.focusByUid(uid);
    }

    const actions = this.driver.actions({ async: true });
    for (const modifier of modifiers) {
      actions.keyDown(modifier);
    }
    actions.keyDown(mainKey);
    actions.keyUp(mainKey);
    for (const modifier of [...modifiers].reverse()) {
      actions.keyUp(modifier);
    }
    await actions.perform();

    await this.waitForEventsAfterAction();
  }

  /**
   * Focus the element for the provided uid. Throws if the element cannot be
   * focused.
   */
  private async focusByUid(uid: string): Promise<void> {
    if (!this.resolveUid) {
      throw new Error('pressKey: resolveUid callback not set. Ensure snapshot is initialized.');
    }
    const el = await this.resolveUid(uid);
    await this.waitForVisible(el, 5000);
    const focused = await this.driver.executeScript(
      'arguments[0].focus(); return arguments[0].getRootNode().activeElement === arguments[0];',
      el
    );
    if (!focused) {
      throw new Error(
        `pressKey: uid ${uid} cannot receive keyboard focus. Target a focusable element, or omit uid to send the key to the currently focused element.`
      );
    }
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
