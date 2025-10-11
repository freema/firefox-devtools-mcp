/**
 * High-level Firefox DevTools API using Selenium WebDriver BiDi
 * EXACT copy of working test-firefox-bidi.js logic
 */

import { Builder, Browser, WebDriver } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import type { FirefoxLaunchOptions, ConsoleMessage } from './types.js';
import { log, logDebug } from '../utils/logger.js';

export class FirefoxDevTools {
  private driver: WebDriver | null = null;
  private consoleMessages: ConsoleMessage[] = [];
  private currentContextId: string | null = null;

  constructor(private options: FirefoxLaunchOptions) {}

  /**
   * Connect to Firefox - EXACT copy of working script
   */
  async connect(): Promise<void> {
    log('🚀 Launching Firefox via Selenium WebDriver BiDi...');

    // Configure Firefox options - EXACT same as working script
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

    // Build driver - EXACT same
    this.driver = await new Builder()
      .forBrowser(Browser.FIREFOX)
      .setFirefoxOptions(firefoxOptions)
      .build();

    log('✅ Firefox launched with BiDi');

    // Get window handle - EXACT same
    this.currentContextId = await this.driver.getWindowHandle();
    logDebug(`Browsing context ID: ${this.currentContextId}`);

    // Setup console listener - EXACT same
    const bidi = await this.driver.getBidi();
    await bidi.subscribe('log.entryAdded', this.currentContextId, (event: any) => {
      const entry = event.params;
      const message: ConsoleMessage = {
        level: entry.level || 'info',
        text: entry.text || JSON.stringify(entry.args || []),
        timestamp: entry.timestamp || Date.now(),
        source: entry.source?.realm,
        args: entry.args,
      };
      this.consoleMessages.push(message);
      logDebug(`Console [${message.level}]: ${message.text}`);
    });

    logDebug('Console listener active');

    // Navigate if startUrl provided
    if (this.options.startUrl) {
      await this.driver.get(this.options.startUrl);
      logDebug(`Navigated to: ${this.options.startUrl}`);
    }

    log('✅ Firefox DevTools ready');
  }

  /**
   * Evaluate JavaScript - direct passthrough to executeScript
   */
  async evaluate(script: string): Promise<unknown> {
    if (!this.driver) throw new Error('Driver not connected');
    return await this.driver.executeScript(script);
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<void> {
    if (!this.driver) throw new Error('Driver not connected');
    await this.driver.get(url);
    this.consoleMessages = [];
    log(`Navigated to: ${url}`);
  }

  /**
   * Get console messages
   */
  async getConsoleMessages(): Promise<ConsoleMessage[]> {
    return [...this.consoleMessages];
  }

  /**
   * Get all tabs
   */
  getTabs(): Array<{ actor: string; title: string; url: string }> {
    return [
      {
        actor: this.currentContextId || '',
        title: 'Current Tab',
        url: '',
      },
    ];
  }

  /**
   * Get selected tab index
   */
  getSelectedTabIdx(): number {
    return 0;
  }

  /**
   * Refresh tabs
   */
  async refreshTabs(): Promise<void> {
    // No-op for now
  }

  /**
   * Select tab
   */
  async selectTab(index: number): Promise<void> {
    if (!this.driver) throw new Error('Driver not connected');
    const handles = await this.driver.getAllWindowHandles();
    if (index >= 0 && index < handles.length) {
      await this.driver.switchTo().window(handles[index]);
      this.currentContextId = handles[index];
    }
  }

  /**
   * Create new page
   */
  async createNewPage(url: string): Promise<number> {
    if (!this.driver) throw new Error('Driver not connected');
    await this.driver.switchTo().newWindow('tab');
    const handles = await this.driver.getAllWindowHandles();
    const newIdx = handles.length - 1;
    this.currentContextId = handles[newIdx];
    await this.driver.get(url);
    return newIdx;
  }

  /**
   * Close tab
   */
  async closeTab(index: number): Promise<void> {
    if (!this.driver) throw new Error('Driver not connected');
    const handles = await this.driver.getAllWindowHandles();
    if (index >= 0 && index < handles.length) {
      await this.driver.switchTo().window(handles[index]);
      await this.driver.close();
      const remaining = await this.driver.getAllWindowHandles();
      if (remaining.length > 0) {
        await this.driver.switchTo().window(remaining[0]);
        this.currentContextId = remaining[0];
      }
    }
  }

  /**
   * Get page content
   */
  async getContent(): Promise<string> {
    const html = await this.evaluate('return document.documentElement.outerHTML');
    return String(html);
  }

  /**
   * Network monitoring stubs
   */
  async startNetworkMonitoring(): Promise<void> {
    log('Network monitoring not yet implemented');
  }

  async stopNetworkMonitoring(): Promise<void> {}

  async getNetworkRequests(): Promise<any[]> {
    return [];
  }

  clearNetworkRequests(): void {}

  /**
   * Close
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
    log('✅ Firefox DevTools closed');
  }
}
