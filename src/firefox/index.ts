/**
 * Firefox Client - Public facade for modular Firefox automation
 */

import type { FirefoxLaunchOptions, ConsoleMessage } from './types.js';
import { FirefoxCore } from './core.js';
import { ConsoleEvents, NetworkEvents } from './events.js';
import { DomInteractions } from './dom.js';
import { PageManagement } from './pages.js';
import { SnapshotManager, type Snapshot } from './snapshot/index.js';

/**
 * Main Firefox Client facade
 * Delegates to modular components for clean separation of concerns
 */
export class FirefoxClient {
  private core: FirefoxCore;
  private consoleEvents: ConsoleEvents | null = null;
  private networkEvents: NetworkEvents | null = null;
  private dom: DomInteractions | null = null;
  private pages: PageManagement | null = null;
  private snapshot: SnapshotManager | null = null;

  constructor(options: FirefoxLaunchOptions) {
    this.core = new FirefoxCore(options);
  }

  /**
   * Connect and initialize all modules
   */
  async connect(): Promise<void> {
    await this.core.connect();

    const driver = this.core.getDriver();
    const currentContextId = this.core.getCurrentContextId();

    // Initialize snapshot manager first
    this.snapshot = new SnapshotManager(driver);

    // Initialize other modules
    this.consoleEvents = new ConsoleEvents(driver);
    this.networkEvents = new NetworkEvents(driver);

    // Initialize DOM with UID resolver callback
    this.dom = new DomInteractions(driver, (uid: string) =>
      this.snapshot!.resolveUidToElement(uid)
    );

    this.pages = new PageManagement(
      driver,
      () => this.core.getCurrentContextId(),
      (id: string) => this.core.setCurrentContextId(id)
    );

    // Subscribe to console and network events
    await this.consoleEvents.subscribe(currentContextId || undefined);
    await this.networkEvents.subscribe(currentContextId || undefined);
  }

  // ============================================================================
  // DOM / Evaluate
  // ============================================================================

  async evaluate(script: string): Promise<unknown> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.evaluate(script);
  }

  async getContent(): Promise<string> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.getContent();
  }

  async clickBySelector(selector: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.clickBySelector(selector);
  }

  async hoverBySelector(selector: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.hoverBySelector(selector);
  }

  async fillBySelector(selector: string, text: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.fillBySelector(selector, text);
  }

  async dragAndDropBySelectors(sourceSelector: string, targetSelector: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.dragAndDropBySelectors(sourceSelector, targetSelector);
  }

  async uploadFileBySelector(selector: string, filePath: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.uploadFileBySelector(selector, filePath);
  }

  // UID-based input methods (Task 21)

  async clickByUid(uid: string, dblClick = false): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.clickByUid(uid, dblClick);
  }

  async hoverByUid(uid: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.hoverByUid(uid);
  }

  async fillByUid(uid: string, value: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.fillByUid(uid, value);
  }

  async dragByUidToUid(fromUid: string, toUid: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.dragByUidToUid(fromUid, toUid);
  }

  async fillFormByUid(elements: Array<{ uid: string; value: string }>): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.fillFormByUid(elements);
  }

  async uploadFileByUid(uid: string, filePath: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.uploadFileByUid(uid, filePath);
  }

  // ============================================================================
  // Console
  // ============================================================================

  async getConsoleMessages(): Promise<ConsoleMessage[]> {
    if (!this.consoleEvents) {
      throw new Error('Not connected');
    }
    return this.consoleEvents.getMessages();
  }

  clearConsoleMessages(): void {
    if (!this.consoleEvents) {
      throw new Error('Not connected');
    }
    this.consoleEvents.clearMessages();
  }

  // ============================================================================
  // Pages / Navigation
  // ============================================================================

  async navigate(url: string): Promise<void> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    await this.pages.navigate(url);
    // Clear console and snapshot on navigation
    this.clearConsoleMessages();
    this.clearSnapshot();
  }

  async navigateBack(): Promise<void> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return await this.pages.navigateBack();
  }

  async navigateForward(): Promise<void> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return await this.pages.navigateForward();
  }

  async setViewportSize(width: number, height: number): Promise<void> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return await this.pages.setViewportSize(width, height);
  }

  async acceptDialog(promptText?: string): Promise<void> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return await this.pages.acceptDialog(promptText);
  }

  async dismissDialog(): Promise<void> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return await this.pages.dismissDialog();
  }

  getTabs(): Array<{ actor: string; title: string; url: string }> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return this.pages.getTabs();
  }

  getSelectedTabIdx(): number {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return this.pages.getSelectedTabIdx();
  }

  async refreshTabs(): Promise<void> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return await this.pages.refreshTabs();
  }

  async selectTab(index: number): Promise<void> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return await this.pages.selectTab(index);
  }

  async createNewPage(url: string): Promise<number> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return await this.pages.createNewPage(url);
  }

  async closeTab(index: number): Promise<void> {
    if (!this.pages) {
      throw new Error('Not connected');
    }
    return await this.pages.closeTab(index);
  }

  // ============================================================================
  // Network
  // ============================================================================

  async startNetworkMonitoring(): Promise<void> {
    if (!this.networkEvents) {
      throw new Error('Not connected');
    }
    this.networkEvents.startMonitoring();
  }

  async stopNetworkMonitoring(): Promise<void> {
    if (!this.networkEvents) {
      throw new Error('Not connected');
    }
    this.networkEvents.stopMonitoring();
  }

  async getNetworkRequests(): Promise<any[]> {
    if (!this.networkEvents) {
      throw new Error('Not connected');
    }
    return this.networkEvents.getRequests();
  }

  clearNetworkRequests(): void {
    if (!this.networkEvents) {
      throw new Error('Not connected');
    }
    this.networkEvents.clearRequests();
  }

  // ============================================================================
  // Snapshot
  // ============================================================================

  async takeSnapshot(): Promise<Snapshot> {
    if (!this.snapshot) {
      throw new Error('Not connected');
    }
    return await this.snapshot.takeSnapshot();
  }

  resolveUidToSelector(uid: string): string {
    if (!this.snapshot) {
      throw new Error('Not connected');
    }
    return this.snapshot.resolveUidToSelector(uid);
  }

  async resolveUidToElement(uid: string): Promise<any> {
    if (!this.snapshot) {
      throw new Error('Not connected');
    }
    return await this.snapshot.resolveUidToElement(uid);
  }

  clearSnapshot(): void {
    if (!this.snapshot) {
      throw new Error('Not connected');
    }
    this.snapshot.clear();
  }

  // ============================================================================
  // Screenshot (Task 22)
  // ============================================================================

  async takeScreenshotPage(): Promise<string> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.takeScreenshotPage();
  }

  async takeScreenshotByUid(uid: string): Promise<string> {
    if (!this.dom) {
      throw new Error('Not connected');
    }
    return await this.dom.takeScreenshotByUid(uid);
  }

  // ============================================================================
  // Internal / Advanced
  // ============================================================================

  /**
   * Get WebDriver instance (for advanced operations)
   * @internal
   */
  getDriver(): any {
    return this.core.getDriver();
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  async close(): Promise<void> {
    await this.core.close();
  }
}

// Re-export types
export type { Snapshot } from './snapshot/index.js';

// Re-export for backward compatibility
export { FirefoxClient as FirefoxDevTools };
