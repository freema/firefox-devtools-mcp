/**
 * Page/Tab/Window management
 */

import type { WebDriver } from 'selenium-webdriver';
import { log } from '../utils/logger.js';

export class PageManagement {
  constructor(
    private driver: WebDriver,
    private getCurrentContextId: () => string | null,
    private setCurrentContextId: (id: string) => void
  ) {}

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<void> {
    await this.driver.get(url);
    log(`Navigated to: ${url}`);
  }

  /**
   * Navigate back in history
   */
  async navigateBack(): Promise<void> {
    await this.driver.navigate().back();
  }

  /**
   * Navigate forward in history
   */
  async navigateForward(): Promise<void> {
    await this.driver.navigate().forward();
  }

  /**
   * Set viewport size
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.driver.manage().window().setRect({ width, height });
  }

  /**
   * Get all tabs (window handles)
   * TODO: In future, fetch actual URLs and titles via BiDi
   */
  getTabs(): Array<{ actor: string; title: string; url: string }> {
    const currentId = this.getCurrentContextId();
    return [
      {
        actor: currentId || '',
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
   * Refresh tabs metadata (no-op for now)
   */
  async refreshTabs(): Promise<void> {
    // No-op for now
  }

  /**
   * Select tab by index
   */
  async selectTab(index: number): Promise<void> {
    const handles = await this.driver.getAllWindowHandles();
    if (index >= 0 && index < handles.length) {
      await this.driver.switchTo().window(handles[index]!);
      this.setCurrentContextId(handles[index]!);
    }
  }

  /**
   * Create new page (tab)
   */
  async createNewPage(url: string): Promise<number> {
    await this.driver.switchTo().newWindow('tab');
    const handles = await this.driver.getAllWindowHandles();
    const newIdx = handles.length - 1;
    this.setCurrentContextId(handles[newIdx]!);
    await this.driver.get(url);
    return newIdx;
  }

  /**
   * Close tab by index
   */
  async closeTab(index: number): Promise<void> {
    const handles = await this.driver.getAllWindowHandles();
    if (index >= 0 && index < handles.length) {
      await this.driver.switchTo().window(handles[index]!);
      await this.driver.close();
      const remaining = await this.driver.getAllWindowHandles();
      if (remaining.length > 0) {
        await this.driver.switchTo().window(remaining[0]!);
        this.setCurrentContextId(remaining[0]!);
      }
    }
  }
}
