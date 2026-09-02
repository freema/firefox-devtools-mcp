/**
 * Unit tests for DomInteractions.typeText action sequencing
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
    sendKeys: vi.fn((text: string) => {
      calls.push(['sendKeys', text]);
      return actions;
    }),
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

describe('DomInteractions.typeText', () => {
  it('should type the text on the focused element', async () => {
    const { driver, actions, calls } = createDriver();
    const dom = new DomInteractions(driver as never);

    await dom.typeText('hello');

    expect(calls).toEqual([['sendKeys', 'hello']]);
    expect(actions.perform).toHaveBeenCalledTimes(1);
  });

  it('should press the submit key after the text in the same sequence', async () => {
    const { driver, actions, calls } = createDriver();
    const dom = new DomInteractions(driver as never);

    await dom.typeText('hello', { submitKey: 'Enter' });

    expect(calls).toEqual([
      ['sendKeys', 'hello'],
      ['keyDown', Key.RETURN],
      ['keyUp', Key.RETURN],
    ]);
    expect(actions.perform).toHaveBeenCalledTimes(1);
  });

  it('should hold modifiers of the submit key around it', async () => {
    const { driver, calls } = createDriver();
    const dom = new DomInteractions(driver as never);

    await dom.typeText('hello', { submitKey: 'shift+Enter' });

    expect(calls).toEqual([
      ['sendKeys', 'hello'],
      ['keyDown', Key.SHIFT],
      ['keyDown', Key.RETURN],
      ['keyUp', Key.RETURN],
      ['keyUp', Key.SHIFT],
    ]);
  });

  it('should focus a uid first and still type through the actions keyboard', async () => {
    const { driver, calls } = createDriver();
    const sendKeys = vi.fn();
    const resolveUid = vi.fn().mockResolvedValue({ sendKeys, isDisplayed: async () => true });
    const dom = new DomInteractions(driver as never, resolveUid);

    await dom.typeText('hello', { uid: 'uid-1' });

    expect(resolveUid).toHaveBeenCalledWith('uid-1');
    expect(sendKeys).not.toHaveBeenCalled();
    expect(calls).toEqual([['sendKeys', 'hello']]);
  });

  it('should reject a uid that cannot take focus before typing anything', async () => {
    const { driver, calls } = createDriver(false);
    const resolveUid = vi.fn().mockResolvedValue({ isDisplayed: async () => true });
    const dom = new DomInteractions(driver as never, resolveUid);

    await expect(dom.typeText('hello', { uid: 'uid-2' })).rejects.toThrow(
      /uid-2 cannot receive keyboard focus/
    );
    expect(calls).toEqual([]);
  });

  it('should reject an invalid submit key before touching the driver', async () => {
    const { driver, calls } = createDriver();
    const dom = new DomInteractions(driver as never);

    await expect(dom.typeText('hello', { submitKey: 'foobar' })).rejects.toThrow(
      /unknown key "foobar"/
    );
    expect(calls).toEqual([]);
    expect(driver.actions).not.toHaveBeenCalled();
  });
});
