/**
 * Core WebDriver + BiDi connection management
 */

import { Builder, Browser, WebDriver } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import type { FirefoxLaunchOptions } from './types.js';
import { log, logDebug } from '../utils/logger.js';

export class FirefoxCore {
  private driver: WebDriver | null = null;
  private currentContextId: string | null = null;

  constructor(private options: FirefoxLaunchOptions) {}

  /**
   * Launch Firefox and establish BiDi connection
   */
  async connect(): Promise<void> {
    log('🚀 Launching Firefox via Selenium WebDriver BiDi...');

    // Configure Firefox options
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

    // Build WebDriver instance
    this.driver = await new Builder()
      .forBrowser(Browser.FIREFOX)
      .setFirefoxOptions(firefoxOptions)
      .build();

    log('✅ Firefox launched with BiDi');

    // Remember current window handle (browsing context)
    this.currentContextId = await this.driver.getWindowHandle();
    logDebug(`Browsing context ID: ${this.currentContextId}`);

    // Navigate if startUrl provided
    if (this.options.startUrl) {
      await this.driver.get(this.options.startUrl);
      logDebug(`Navigated to: ${this.options.startUrl}`);
    }

    log('✅ Firefox DevTools ready');
  }

  /**
   * Get WebDriver instance (throw if not connected)
   */
  getDriver(): WebDriver {
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
      // Try a simple command to check if Firefox is responsive
      await this.driver.getWindowHandle();
      return true;
    } catch (error) {
      // Any error means connection is broken
      logDebug('Connection check failed: Firefox is not responsive');
      return false;
    }
  }

  /**
   * Reset driver state (used when Firefox is detected as closed)
   */
  reset(): void {
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
   * Close driver and cleanup
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
    log('✅ Firefox DevTools closed');
  }
}
