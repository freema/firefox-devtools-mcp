/**
 * High-level Firefox DevTools API
 * Manages tab state and provides convenient methods
 */

import { FirefoxRdpClient } from './rdp-client.js';
import { FirefoxLauncher } from './launcher.js';
import { FirefoxBiDiClient } from './bidi-client.js';
import type {
  Tab,
  ActorId,
  FirefoxLaunchOptions,
  ScreenshotOptions,
  ConsoleMessage,
  NetworkRequest,
} from './types.js';
import { logDebug, log, logError } from '../utils/logger.js';

interface SelectedTab {
  tab: Tab;
  tabActor: ActorId;
  consoleActor: ActorId;
  threadActor: ActorId;
}

export class FirefoxDevTools {
  private client: FirefoxRdpClient;
  private bidiClient: FirefoxBiDiClient | null = null;
  private launcher: FirefoxLauncher | null = null;
  private tabs: Tab[] = [];
  private selectedTabIdx = 0;
  private selectedTab: SelectedTab | null = null;

  constructor(private options: FirefoxLaunchOptions) {
    this.client = new FirefoxRdpClient();
  }

  async connect(): Promise<void> {
    // Try to connect to existing Firefox instance
    try {
      logDebug(`Attempting to connect to Firefox RDP at ${this.options.rdpHost}:${this.options.rdpPort}...`);
      await this.client.connect(this.options.rdpHost, this.options.rdpPort);
      log(`Connected to existing Firefox RDP at ${this.options.rdpHost}:${this.options.rdpPort}`);
    } catch (err) {
      log(`❌ Failed to connect to existing Firefox: ${String(err)}`);
      log(`🚀 AUTO-LAUNCH: Starting Firefox...`);

      // Auto-launch if not already launched
      if (!this.launcher) {
        log('Creating Firefox launcher...');
        this.launcher = new FirefoxLauncher(this.options);

        log('Launching Firefox process...');
        await this.launcher.launch();

        // After launch, retry connection for up to ~10s with small backoff
        const maxAttempts = 20;
        const delayMs = 500;
        let lastErr: unknown = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            logDebug(`Connecting to RDP (attempt ${attempt}/${maxAttempts})...`);
            await this.client.connect(this.options.rdpHost, this.options.rdpPort);
            log('Connected to launched Firefox instance');
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
        if (lastErr) {
          throw lastErr;
        }
      } else {
        throw new Error(
          `Cannot connect to Firefox RDP at ${this.options.rdpHost}:${this.options.rdpPort}. ` +
            'Please start Firefox with --start-debugger-server or enable AUTO_LAUNCH_FIREFOX.'
        );
      }
    }

    // Initialize: list tabs and select first one
    await this.refreshTabs();
    if (this.tabs.length > 0) {
      await this.selectTab(0);
    }
  }

  async refreshTabs(): Promise<Tab[]> {
    this.tabs = await this.client.listTabs();
    logDebug(`Found ${this.tabs.length} tabs`);
    return this.tabs;
  }

  getTabs(): Tab[] {
    return this.tabs;
  }

  getSelectedTabIdx(): number {
    return this.selectedTabIdx;
  }

  async selectTab(idx: number): Promise<void> {
    if (idx < 0 || idx >= this.tabs.length) {
      throw new Error(`Invalid tab index: ${idx}. Available tabs: 0-${this.tabs.length - 1}`);
    }

    const tab = this.tabs[idx];
    if (!tab) {
      throw new Error(`Tab not found at index ${idx}`);
    }

    // Attach to tab if not already attached
    if (!this.selectedTab || this.selectedTab.tabActor !== tab.actor) {
      logDebug(`Attaching to tab ${idx}: ${tab.title}`);
      const attachResult = await this.client.attachToTab(tab.actor);

      this.selectedTab = {
        tab,
        tabActor: tab.actor,
        consoleActor: attachResult.consoleActor,
        threadActor: attachResult.threadActor,
      };

      // Start console listening for new tab
      await this.client.startConsoleListening(attachResult.consoleActor);
    }

    this.selectedTabIdx = idx;
    logDebug(`Selected tab ${idx}: ${tab.title}`);
  }

  getSelectedTab(): SelectedTab {
    if (!this.selectedTab) {
      throw new Error('No tab selected. Call selectTab() first.');
    }
    return this.selectedTab;
  }

  async navigate(url: string): Promise<void> {
    const selected = this.getSelectedTab();

    // Clear console messages before navigation
    this.client.clearConsoleMessages(selected.consoleActor);

    await this.client.navigateTo(selected.tabActor, url);
    log(`Navigated to: ${url}`);

    // Refresh tab info after navigation
    await this.refreshTabs();
  }

  async createNewTab(url: string): Promise<number> {
    // Create a new tab by opening URL
    await this.client.openNewTab(url);

    // Refresh tabs to get the new tab
    await this.refreshTabs();

    // The new tab is typically the last one
    const newTabIdx = this.tabs.length - 1;

    // Select the new tab
    await this.selectTab(newTabIdx);

    log(`Created new tab [${newTabIdx}] and navigated to: ${url}`);
    return newTabIdx;
  }

  async closeTab(idx: number): Promise<void> {
    if (idx < 0 || idx >= this.tabs.length) {
      throw new Error(`Invalid tab index: ${idx}. Available tabs: 0-${this.tabs.length - 1}`);
    }

    const tab = this.tabs[idx];
    if (!tab) {
      throw new Error(`Tab not found at index ${idx}`);
    }

    logDebug(`Closing tab ${idx}: ${tab.title}`);

    // Close the tab via RDP
    await this.client.closeTab(tab.actor);

    // If we're closing the selected tab, we need to select another one
    if (idx === this.selectedTabIdx) {
      this.selectedTab = null;
    }

    // Refresh tab list
    await this.refreshTabs();

    // Auto-select another tab if available
    if (this.tabs.length > 0) {
      // Select previous tab or first tab
      const newIdx = Math.min(idx, this.tabs.length - 1);
      await this.selectTab(newIdx);
    } else {
      this.selectedTabIdx = 0;
    }

    log(`Closed tab [${idx}]`);
  }

  async evaluate(code: string): Promise<unknown> {
    const selected = this.getSelectedTab();
    return await this.client.evaluateJS(selected.consoleActor, code);
  }

  async getContent(): Promise<string> {
    const selected = this.getSelectedTab();
    return await this.client.getPageContent(selected.tabActor, selected.consoleActor);
  }

  async getConsoleMessages(): Promise<ConsoleMessage[]> {
    const selected = this.getSelectedTab();
    return this.client.getConsoleMessages(selected.consoleActor);
  }

  async startNetworkMonitoring(): Promise<void> {
    const selected = this.getSelectedTab();
    await this.client.startNetworkMonitoring(selected.tabActor);
    log('Network monitoring started');
  }

  async stopNetworkMonitoring(): Promise<void> {
    const selected = this.getSelectedTab();
    await this.client.stopNetworkMonitoring(selected.tabActor);
    log('Network monitoring stopped');
  }

  async getNetworkRequests(): Promise<NetworkRequest[]> {
    const selected = this.getSelectedTab();
    return this.client.getNetworkRequests(selected.tabActor);
  }

  clearNetworkRequests(): void {
    const selected = this.getSelectedTab();
    this.client.clearNetworkRequests(selected.tabActor);
  }

  async takeScreenshot(options: ScreenshotOptions = {}): Promise<Buffer> {
    // Lazy-initialize BiDi client
    if (!this.bidiClient) {
      try {
        logDebug('Initializing BiDi client for screenshot');
        this.bidiClient = new FirefoxBiDiClient();
        await this.bidiClient.connect(this.options.rdpHost, this.options.bidiPort);

        // Select browsing context for current tab
        const selectedTab = this.getSelectedTab();
        const contextId =
          (await this.bidiClient.selectContextByUrl(selectedTab.tab.url)) ||
          (await this.bidiClient.selectFirstContext());

        if (!contextId) {
          throw new Error('No browsing context available');
        }
      } catch (error) {
        logError('BiDi initialization failed', error);
        throw new Error(`Screenshot not available: BiDi connection failed. ${String(error)}`);
      }
    }

    const format = options.format || 'png';
    const fullPage = options.fullPage || false;

    // Handle fullPage: get content dimensions and set clip
    let clip: { x: number; y: number; width: number; height: number } | undefined;

    if (fullPage) {
      try {
        const selected = this.getSelectedTab();
        const dimensionsCode = `
          JSON.stringify({
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            devicePixelRatio: window.devicePixelRatio || 1
          })
        `;

        const result = await this.client.evaluateJS(selected.consoleActor, dimensionsCode);
        const dimensions = JSON.parse(result as string) as {
          scrollWidth: number;
          scrollHeight: number;
          devicePixelRatio: number;
        };

        clip = {
          x: 0,
          y: 0,
          width: dimensions.scrollWidth,
          height: dimensions.scrollHeight,
        };

        logDebug(
          `Full page screenshot: ${clip.width}x${clip.height} (device pixel ratio: ${dimensions.devicePixelRatio})`
        );
      } catch (error) {
        logError('Failed to get page dimensions for fullPage screenshot', error);
        // Continue without clip
      }
    } else if (options.clip) {
      clip = options.clip;
    }

    // Capture screenshot via BiDi
    try {
      const screenshotOptions = clip
        ? { clip, origin: (fullPage ? 'document' : 'viewport') as 'viewport' | 'document' }
        : { origin: (fullPage ? 'document' : 'viewport') as 'viewport' | 'document' };

      const screenshot = await this.bidiClient.captureScreenshot(
        this.bidiClient.getSelectedContextId() || undefined,
        screenshotOptions
      );

      // BiDi returns base64 PNG
      const buffer = Buffer.from(screenshot.data, 'base64');

      // TODO: Transcode to JPEG/WebP if requested
      // For now, we only support PNG natively from BiDi
      if (format !== 'png') {
        logDebug(
          `Format ${format} requested but BiDi only returns PNG. TODO: Add image transcoding.`
        );
        // We could add sharp or jimp here for transcoding, but for MVP keep PNG only
      }

      logDebug(`Screenshot captured: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      logError('BiDi screenshot failed', error);
      throw new Error(`Screenshot capture failed: ${String(error)}`);
    }
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }

  async close(): Promise<void> {
    this.client.close();
    if (this.bidiClient) {
      this.bidiClient.close();
      this.bidiClient = null;
    }
    if (this.launcher) {
      await this.launcher.close();
      this.launcher = null;
    }
    this.selectedTab = null;
    this.tabs = [];
  }
}
