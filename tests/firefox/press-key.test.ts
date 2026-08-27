/**
 * Unit tests for DomInteractions.pressKey action sequencing
 */

import { describe, it, expect, vi } from 'vitest';
import { Key } from 'selenium-webdriver';
import { DomInteractions } from '../../src/firefox/dom.js';

interface MockActions {
  keyDown: ReturnType<typeof vi.fn>;
  keyUp: ReturnType<typeof vi.fn>;
  sendKeys: ReturnType<typeof vi.fn>;
  perform: ReturnType<typeof vi.fn>;
}

function createDriver(focusResult: unknown = true) {
  const calls: Array<[string, string]> = [];
  const actions: MockActions = {
    keyDown: vi.fn((k: string) => {
      calls.push(['keyDown', k]);
      return actions;
    }),
    keyUp: vi.fn((k: string) => {
      calls.push(['keyUp', k]);
      return actions;
    }),
    sendKeys: vi.fn(() => actions),
    perform: vi.fn().mockResolvedValue(undefined),
  };
  const driver = {
    actions: vi.fn(() => actions),
    executeScript: vi.fn(async (script: string) =>
      script.includes('activeElement') ? focusResult : undefined
    ),
  };
  return { driver, actions, calls };
}

describe('DomInteractions.pressKey', () => {
  it('should press and release the key on the focused element', async () => {
    const { driver, calls } = createDriver();
    const dom = new DomInteractions(driver as never);

    await dom.pressKey('Escape');

    expect(calls).toEqual([
      ['keyDown', Key.ESCAPE],
      ['keyUp', Key.ESCAPE],
    ]);
  });

  it('should hold modifiers around the key and release them in reverse order', async () => {
    const { driver, calls } = createDriver();
    const dom = new DomInteractions(driver as never);

    await dom.pressKey('ctrl+shift+t');

    expect(calls).toEqual([
      ['keyDown', Key.CONTROL],
      ['keyDown', Key.SHIFT],
      ['keyDown', 't'],
      ['keyUp', 't'],
      ['keyUp', Key.SHIFT],
      ['keyUp', Key.CONTROL],
    ]);
  });

  it('should focus a uid and still use the actions keyboard, not element sendKeys', async () => {
    const { driver, actions, calls } = createDriver();
    const sendKeys = vi.fn();
    const resolveUid = vi.fn().mockResolvedValue({ sendKeys, isDisplayed: async () => true });
    const dom = new DomInteractions(driver as never, resolveUid);

    await dom.pressKey('Enter', 'uid-1');

    expect(resolveUid).toHaveBeenCalledWith('uid-1');
    // Element Send Keys appends a NULL key that the page sees as a second
    // keydown, so the uid path must not use it.
    expect(sendKeys).not.toHaveBeenCalled();
    expect(actions.sendKeys).not.toHaveBeenCalled();
    expect(calls).toEqual([
      ['keyDown', Key.RETURN],
      ['keyUp', Key.RETURN],
    ]);
  });

  it('should reject a uid that cannot take focus instead of pressing elsewhere', async () => {
    const { driver, calls } = createDriver(false);
    const resolveUid = vi.fn().mockResolvedValue({ isDisplayed: async () => true });
    const dom = new DomInteractions(driver as never, resolveUid);

    await expect(dom.pressKey('Escape', 'uid-2')).rejects.toThrow(
      /uid-2 cannot receive keyboard focus/
    );
    expect(calls).toEqual([]);
  });

  it('should require a resolveUid callback when a uid is given', async () => {
    const { driver } = createDriver();
    const dom = new DomInteractions(driver as never);

    await expect(dom.pressKey('Escape', 'uid-3')).rejects.toThrow(/resolveUid callback not set/);
  });

  it('should reject an invalid combination before touching the driver', async () => {
    const { driver, calls } = createDriver();
    const dom = new DomInteractions(driver as never);

    await expect(dom.pressKey('ctrl+k+l')).rejects.toThrow(/more than one non-modifier key/);
    expect(calls).toEqual([]);
    expect(driver.actions).not.toHaveBeenCalled();
  });
});
