/**
 * High-level Firefox DevTools API
 * Manages tab state and provides convenient methods
 */

import { FirefoxRdpClient } from './rdp-client.js';
import { FirefoxLauncher } from './launcher.js';
import type {
  Tab,
  ActorId,
  FirefoxLaunchOptions,
  ConsoleMessage,
  NetworkRequest,
} from './types.js';
import { logDebug, log } from '../utils/logger.js';

interface SelectedTab {
  tab: Tab;
  tabActor: ActorId;
  consoleActor: ActorId;
  threadActor: ActorId;
}

export class FirefoxDevTools {
  private client: FirefoxRdpClient;
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
      logDebug(
        `Attempting to connect to Firefox RDP at ${this.options.rdpHost}:${this.options.rdpPort}...`
      );
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

    // Initialize: list tabs
    await this.refreshTabs();
    logDebug(`Initialized with ${this.tabs.length} tab(s)`);

    // If first tab is about:blank, wait 5s for navigation to complete
    if (this.tabs.length > 0 && this.tabs[0]?.url === 'about:blank') {
      logDebug('First tab is about:blank, waiting 5s for navigation...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await this.refreshTabs();
      logDebug(`After wait: first tab URL is now ${this.tabs[0]?.url}`);
    }

    // Only auto-select if there's a tab with actual content
    if (this.tabs.length > 0) {
      const firstTab = this.tabs[0];
      if (firstTab?.url && firstTab.url !== 'about:blank') {
        try {
          await this.selectTab(0);
        } catch (error) {
          logDebug(`Could not auto-select first tab: ${String(error)}`);
        }
      } else {
        logDebug('First tab is empty (about:blank), skipping auto-select');
      }
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

      try {
        const attachResult = await this.client.attachToTab(tab.actor);

        this.selectedTab = {
          tab,
          tabActor: tab.actor,
          consoleActor: attachResult.consoleActor,
          threadActor: attachResult.threadActor,
        };

        // Start console listening
        await this.client.startConsoleListening(attachResult.consoleActor);

        logDebug(`Successfully attached to tab ${idx}`);
      } catch (attachError: any) {
        // If tab is empty, mark as selected but without attachment
        if (attachError.code === 'NO_CONSOLE_ACTOR' || attachError.code === 'ATTACH_TIMEOUT') {
          logDebug(`Tab ${idx} is empty or not ready, skipping attach`);
          this.selectedTabIdx = idx;
          this.selectedTab = null;
          throw attachError; // Re-throw so caller knows
        }
        throw attachError;
      }
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
    const currentTabIdx = this.selectedTabIdx;
    const currentTab = this.tabs[currentTabIdx];

    if (!currentTab) {
      throw new Error('No tab available for navigation');
    }

    // Check if tab is empty (about:blank)
    if (!this.selectedTab || currentTab.url === 'about:blank' || !currentTab.url) {
      throw new Error(
        'Cannot navigate empty tab (about:blank). ' +
          'Please use new_page tool to create a new tab with URL, ' +
          'or close this empty tab and work with tabs that have content.'
      );
    }

    // Normal navigation for attached tabs
    const selected = this.getSelectedTab();
    this.client.clearConsoleMessages(selected.consoleActor);

    const navCode = `window.location.href = ${JSON.stringify(url)};`;
    await this.client.evaluateJS(selected.consoleActor, navCode);

    log(`Navigation initiated to: ${url}`);

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.refreshTabs();

    try {
      await this.selectTab(this.selectedTabIdx);
    } catch (error) {
      logDebug(`Re-attach after navigation: ${String(error)}`);
    }
  }

  private async createNewTab(): Promise<number> {
    logDebug('Creating new tab via window.open()...');

    // Get current selected tab for opening new one
    const currentTab = this.getSelectedTab();

    // Use window.open to create new tab
    const openTabCode = `window.open('about:blank', '_blank'); 'tab_opened';`;
    await this.client.evaluateJS(currentTab.consoleActor, openTabCode);

    // Wait for new tab to appear
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Find the new tab
    const oldActors = this.tabs.map((t) => t.actor);
    await this.refreshTabs();

    const newTab = this.tabs.find((t) => !oldActors.includes(t.actor));
    if (!newTab) {
      throw new Error('Failed to detect new tab after window.open()');
    }

    const newIdx = this.tabs.indexOf(newTab);
    logDebug(`New tab created at index [${newIdx}]`);

    return newIdx;
  }

  async createNewPage(url: string): Promise<number> {
    log(`Creating new tab and navigating to: ${url}`);

    // Step 1: Create empty tab
    const tabIdx = await this.createNewTab();

    // Step 2: Select it
    await this.selectTab(tabIdx);

    // Step 3: Navigate to URL
    await this.navigate(url);

    log(`Created and navigated tab [${tabIdx}] to: ${url}`);
    return tabIdx;
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

  isConnected(): boolean {
    return this.client.isConnected();
  }

  async close(): Promise<void> {
    this.client.close();
    if (this.launcher) {
      await this.launcher.close();
      this.launcher = null;
    }
    this.selectedTab = null;
    this.tabs = [];
  }
}
