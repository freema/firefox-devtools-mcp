/**
 * Core WebDriver + BiDi connection management
 */

import { Builder, Browser, WebDriver } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { spawn, type ChildProcess } from 'node:child_process';
import type { FirefoxLaunchOptions } from './types.js';
import { log, logDebug } from '../utils/logger.js';

/**
 * Thin wrapper around geckodriver HTTP API that implements the subset of
 * WebDriver interface used by firefox-devtools-mcp.
 *
 * This exists because selenium-webdriver's Driver.createSession() tries to
 * auto-upgrade to BiDi WebSocket, which hangs when connecting to an existing
 * Firefox instance. By talking directly to geckodriver's HTTP API we avoid
 * the BiDi issue entirely.
 */
class GeckodriverHttpDriver {
  private baseUrl: string;
  private sessionId: string;
  private gdProcess: ChildProcess;

  constructor(baseUrl: string, sessionId: string, gdProcess: ChildProcess) {
    this.baseUrl = baseUrl;
    this.sessionId = sessionId;
    this.gdProcess = gdProcess;
  }

  static async connect(marionettePort: number): Promise<GeckodriverHttpDriver> {
    // Find geckodriver binary via selenium-manager
    const path = await import('node:path');
    const { execFileSync } = await import('node:child_process');

    let geckodriverPath: string;
    try {
      // selenium-manager ships with selenium-webdriver and resolves/downloads geckodriver
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      const swPkg = require.resolve('selenium-webdriver/package.json');
      const swDir = path.dirname(swPkg);
      const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
      const ext = process.platform === 'win32' ? '.exe' : '';
      const smBin = path.join(swDir, 'bin', platform, `selenium-manager${ext}`);
      const result = JSON.parse(
        execFileSync(smBin, ['--browser', 'firefox', '--output', 'json'], { encoding: 'utf-8' })
      );
      geckodriverPath = result.result.driver_path;
    } catch {
      // Fallback: check well-known selenium cache locations
      const os = await import('node:os');
      const fs = await import('node:fs');
      const cached = path.join(os.homedir(), '.cache/selenium/geckodriver/linux64/0.36.0/geckodriver');
      if (fs.existsSync(cached)) {
        geckodriverPath = cached;
      } else {
        throw new Error('Cannot find geckodriver binary. Ensure selenium-webdriver is installed.');
      }
    }
    logDebug(`Using geckodriver: ${geckodriverPath}`);

    const port = 4444 + Math.floor(Math.random() * 10000);
    const gd = spawn(geckodriverPath, [
      '--connect-existing',
      '--marionette-port', String(marionettePort),
      '--port', String(port),
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    // Wait for geckodriver to start listening
    // geckodriver writes its log to stderr (INFO, DEBUG etc.)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Geckodriver startup timeout')), 10000);
      const onData = (data: Buffer) => {
        const msg = data.toString();
        logDebug(`[geckodriver] ${msg.trim()}`);
        if (msg.includes('Listening on')) {
          clearTimeout(timeout);
          resolve();
        }
      };
      // Listen on both stdout and stderr — geckodriver's output stream varies by version/platform
      gd.stdout?.on('data', onData);
      gd.stderr?.on('data', onData);
      gd.on('error', (err) => { clearTimeout(timeout); reject(err); });
      gd.on('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Geckodriver exited with code ${code}`));
      });
    });

    const baseUrl = `http://127.0.0.1:${port}`;

    // Create a WebDriver session
    const resp = await fetch(`${baseUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capabilities: { alwaysMatch: {} } }),
    });
    const json = await resp.json() as { value: { sessionId: string; capabilities: Record<string, unknown> } };
    if (!json.value?.sessionId) {
      throw new Error(`Failed to create session: ${JSON.stringify(json)}`);
    }

    return new GeckodriverHttpDriver(baseUrl, json.value.sessionId, gd);
  }

  private async cmd(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}/session/${this.sessionId}${path}`;
    const opts: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    const json = await resp.json() as { value: unknown & { error?: string; message?: string } };
    if (json.value && typeof json.value === 'object' && 'error' in json.value) {
      throw new Error(`${(json.value as { error: string }).error}: ${(json.value as { message: string }).message}`);
    }
    return json.value;
  }

  // WebDriver-compatible methods used by the rest of the codebase
  async getTitle(): Promise<string> { return (await this.cmd('GET', '/title')) as string; }
  async getCurrentUrl(): Promise<string> { return (await this.cmd('GET', '/url')) as string; }
  async getWindowHandle(): Promise<string> { return (await this.cmd('GET', '/window')) as string; }
  async getAllWindowHandles(): Promise<string[]> { return (await this.cmd('GET', '/window/handles')) as string[]; }
  async get(url: string): Promise<void> { await this.cmd('POST', '/url', { url }); }
  async getPageSource(): Promise<string> { return (await this.cmd('GET', '/source')) as string; }
  async executeScript<T>(script: string, ...args: unknown[]): Promise<T> {
    return (await this.cmd('POST', '/execute/sync', { script, args })) as T;
  }
  async executeAsyncScript<T>(script: string, ...args: unknown[]): Promise<T> {
    return (await this.cmd('POST', '/execute/async', { script, args })) as T;
  }
  async takeScreenshot(): Promise<string> { return (await this.cmd('GET', '/screenshot')) as string; }
  async close(): Promise<void> { await this.cmd('DELETE', '/window'); }
  async getSession(): Promise<{ getId(): string }> {
    return { getId: () => this.sessionId };
  }

  switchTo() {
    const self = this;
    return {
      async window(handle: string): Promise<void> {
        await self.cmd('POST', '/window', { handle });
      },
      async newWindow(type: string): Promise<{ handle: string }> {
        return (await self.cmd('POST', '/window/new', { type })) as { handle: string };
      },
      async alert() {
        return {
          async accept(): Promise<void> { await self.cmd('POST', '/alert/accept'); },
          async dismiss(): Promise<void> { await self.cmd('POST', '/alert/dismiss'); },
          async getText(): Promise<string> { return (await self.cmd('GET', '/alert/text')) as string; },
          async sendKeys(text: string): Promise<void> { await self.cmd('POST', '/alert/text', { text }); },
        };
      },
    };
  }

  navigate() {
    const self = this;
    return {
      async back(): Promise<void> { await self.cmd('POST', '/back'); },
      async forward(): Promise<void> { await self.cmd('POST', '/forward'); },
      async refresh(): Promise<void> { await self.cmd('POST', '/refresh'); },
    };
  }

  manage() {
    const self = this;
    return {
      window() {
        return {
          async setRect(rect: { width: number; height: number }): Promise<void> {
            await self.cmd('POST', '/window/rect', rect);
          },
        };
      },
    };
  }

  actions() {
    // Accumulate action sequences for the W3C Actions API
    const self = this;
    const actionSequences: unknown[] = [];
    return {
      move(opts: { x: number; y: number; origin?: unknown }) {
        actionSequences.push({ type: 'pointer', id: 'mouse', actions: [{ type: 'pointerMove', ...opts }] });
        return this;
      },
      click() {
        const last = actionSequences[actionSequences.length - 1] as { actions: unknown[] } | undefined;
        if (last) {
          last.actions.push({ type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 });
        }
        return this;
      },
      async perform(): Promise<void> {
        await self.cmd('POST', '/actions', { actions: actionSequences });
      },
      async clear(): Promise<void> {
        await self.cmd('DELETE', '/actions');
      },
    };
  }

  async findElement(strategy: string, value: string): Promise<{ [key: string]: string }> {
    return (await this.cmd('POST', '/element', { using: strategy, value })) as { [key: string]: string };
  }

  async quit(): Promise<void> {
    try {
      await this.cmd('DELETE', '');
    } catch {
      // ignore
    }
    this.gdProcess.kill();
  }

  /** Kill the geckodriver process without closing Firefox */
  kill(): void {
    this.gdProcess.kill();
  }
}

export class FirefoxCore {
  private driver: (WebDriver | GeckodriverHttpDriver) | null = null;
  private currentContextId: string | null = null;

  constructor(private options: FirefoxLaunchOptions) {}

  /**
   * Launch Firefox (or connect to an existing instance) and establish BiDi connection
   */
  async connect(): Promise<void> {
    if (this.options.connectExisting) {
      log('🔗 Connecting to existing Firefox via Marionette...');
    } else {
      log('🚀 Launching Firefox via Selenium WebDriver BiDi...');
    }

    if (this.options.connectExisting) {
      // Connect to existing Firefox via geckodriver HTTP API directly.
      // We bypass selenium-webdriver because its BiDi auto-upgrade hangs
      // when used with geckodriver's --connect-existing mode.
      const port = this.options.marionettePort ?? 2828;
      this.driver = await GeckodriverHttpDriver.connect(port);
    } else {
      // Standard path: launch a new Firefox via selenium-webdriver
      const firefoxOptions = new firefox.Options();
      firefoxOptions.enableBidi();

      if (this.options.headless) {
        firefoxOptions.addArguments('-headless');
      }
      if (this.options.viewport) {
        firefoxOptions.windowSize({
          width: this.options.viewport.width,
          height: this.options.viewport.height,
        });
      }
      if (this.options.firefoxPath) {
        firefoxOptions.setBinary(this.options.firefoxPath);
      }
      if (this.options.args && this.options.args.length > 0) {
        firefoxOptions.addArguments(...this.options.args);
      }
      if (this.options.profilePath) {
        firefoxOptions.setProfile(this.options.profilePath);
      }
      if (this.options.acceptInsecureCerts) {
        firefoxOptions.setAcceptInsecureCerts(true);
      }

      this.driver = await new Builder()
        .forBrowser(Browser.FIREFOX)
        .setFirefoxOptions(firefoxOptions)
        .build();
    }

    log(this.options.connectExisting
      ? '✅ Connected to existing Firefox'
      : '✅ Firefox launched with BiDi');

    // Remember current window handle (browsing context)
    this.currentContextId = await this.driver.getWindowHandle();
    logDebug(`Browsing context ID: ${this.currentContextId}`);

    // Navigate if startUrl provided (skip for connectExisting to not disrupt the user's browsing)
    if (this.options.startUrl && !this.options.connectExisting) {
      await this.driver.get(this.options.startUrl);
      logDebug(`Navigated to: ${this.options.startUrl}`);
    }

    log('✅ Firefox DevTools ready');
  }

  /**
   * Get WebDriver instance (throw if not connected)
   */
  getDriver(): WebDriver | GeckodriverHttpDriver {
    if (!this.driver) {
      throw new Error('Driver not connected');
    }
    return this.driver;
  }

  /**
   * Check if Firefox is still connected and responsive
   * Returns false if Firefox was closed or connection is broken
   */
  async isConnected(): Promise<boolean> {
    if (!this.driver) {
      return false;
    }

    try {
      await this.driver.getWindowHandle();
      return true;
    } catch (error) {
      logDebug('Connection check failed: Firefox is not responsive');
      return false;
    }
  }

  /**
   * Reset driver state (used when Firefox is detected as closed)
   */
  reset(): void {
    if (this.driver && this.driver instanceof GeckodriverHttpDriver) {
      this.driver.kill();
    }
    this.driver = null;
    this.currentContextId = null;
    logDebug('Driver state reset');
  }

  /**
   * Get current browsing context ID
   */
  getCurrentContextId(): string | null {
    return this.currentContextId;
  }

  /**
   * Update current context ID (used by page management)
   */
  setCurrentContextId(contextId: string): void {
    this.currentContextId = contextId;
  }

  /**
   * Close driver and cleanup.
   * When connected to an existing Firefox instance, only kills geckodriver
   * without closing the browser.
   */
  async close(): Promise<void> {
    if (this.driver) {
      if (this.options.connectExisting && this.driver instanceof GeckodriverHttpDriver) {
        this.driver.kill();
        this.driver = null;
      } else if (this.driver instanceof WebDriver) {
        await this.driver.quit();
        this.driver = null;
      }
    }
    log('✅ Firefox DevTools closed');
  }
}
