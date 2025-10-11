/**
 * MCP Context - Bridge between tools and Firefox DevTools
 * Provides unified interface for MCP tools
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FirefoxDevTools } from './firefox/devtools.js';
import type { FirefoxLaunchOptions } from './firefox/types.js';
import { log, logDebug, logError } from './utils/logger.js';

export interface PageInfo {
  idx: number;
  title: string;
  url: string;
  selected: boolean;
}

export class McpContext {
  private firefox: FirefoxDevTools;

  private constructor(options: FirefoxLaunchOptions) {
    this.firefox = new FirefoxDevTools(options);
  }

  static async create(options: FirefoxLaunchOptions): Promise<McpContext> {
    const context = new McpContext(options);
    await context.firefox.connect();
    return context;
  }

  // Page management
  async getPages(): Promise<PageInfo[]> {
    await this.firefox.refreshTabs();
    const tabs = this.firefox.getTabs();
    const selectedIdx = this.firefox.getSelectedTabIdx();

    return tabs.map((tab, idx) => ({
      idx,
      title: tab.title || 'Untitled',
      url: tab.url || 'about:blank',
      selected: idx === selectedIdx,
    }));
  }

  getSelectedPageIdx(): number {
    return this.firefox.getSelectedTabIdx();
  }

  async setSelectedPageIdx(idx: number): Promise<void> {
    await this.firefox.selectTab(idx);
  }

  async getSelectedPage(): Promise<PageInfo> {
    const pages = await this.getPages();
    const selectedIdx = this.getSelectedPageIdx();
    const page = pages[selectedIdx];
    if (!page) {
      throw new Error('No page selected');
    }
    return page;
  }

  // Navigation
  async navigatePage(url: string): Promise<void> {
    await this.firefox.navigate(url);
  }

  async createNewPage(url: string): Promise<number> {
    return await this.firefox.createNewTab(url);
  }

  async closePage(idx: number): Promise<void> {
    await this.firefox.closeTab(idx);
  }

  // Script evaluation
  async evaluateScript<T = unknown>(code: string): Promise<T> {
    const result = await this.firefox.evaluate(code);
    return result as T;
  }

  // Page content
  async getPageContent(): Promise<string> {
    return await this.firefox.getContent();
  }

  // Temporary file storage (for screenshots)
  async saveTemporaryFile(
    data: Uint8Array | Buffer,
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  ): Promise<{ filename: string }> {
    try {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'firefox-devtools-mcp-'));

      const extension = this.getExtensionFromMimeType(mimeType);
      const filename = path.join(dir, `screenshot.${extension}`);

      await fs.writeFile(filename, data);
      logDebug(`Saved temporary file: ${filename}`);

      return { filename };
    } catch (err) {
      logError('Failed to save temporary file', err);
      throw new Error('Could not save temporary file', { cause: err });
    }
  }

  async saveFile(data: Uint8Array | Buffer, filename: string): Promise<{ filename: string }> {
    try {
      const filePath = path.resolve(filename);
      await fs.writeFile(filePath, data);
      log(`Saved file: ${filePath}`);
      return { filename: filePath };
    } catch (err) {
      logError('Failed to save file', err);
      throw new Error('Could not save file', { cause: err });
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'image/png':
        return 'png';
      case 'image/jpeg':
        return 'jpeg';
      case 'image/webp':
        return 'webp';
      default:
        throw new Error(`Unknown mime type: ${mimeType}`);
    }
  }

  async getConsoleMessages(): Promise<
    Array<{ level: string; text: string; timestamp?: number; source?: string }>
  > {
    const messages = await this.firefox.getConsoleMessages();

    // Format console messages for MCP response
    return messages.map((msg) => {
      const formatted: { level: string; text: string; timestamp?: number; source?: string } = {
        level: msg.level,
        text: msg.text,
      };

      // Add optional properties only if they exist
      if (msg.timestamp !== undefined) {
        formatted.timestamp = msg.timestamp;
      }
      if (msg.source !== undefined) {
        formatted.source = msg.source;
      }

      return formatted;
    });
  }

  async startNetworkMonitoring(): Promise<void> {
    await this.firefox.startNetworkMonitoring();
  }

  async stopNetworkMonitoring(): Promise<void> {
    await this.firefox.stopNetworkMonitoring();
  }

  async getNetworkRequests(): Promise<
    Array<{
      url: string;
      method: string;
      status?: number;
      statusText?: string;
      timestamp?: number;
      resourceType?: string;
      isXHR?: boolean;
    }>
  > {
    const requests = await this.firefox.getNetworkRequests();

    // Format network requests for MCP response
    return requests.map((req) => {
      const formatted: {
        url: string;
        method: string;
        status?: number;
        statusText?: string;
        timestamp?: number;
        resourceType?: string;
        isXHR?: boolean;
      } = {
        url: req.url,
        method: req.method,
      };

      // Add optional properties only if they exist
      if (req.status !== undefined) {
        formatted.status = req.status;
      }
      if (req.statusText !== undefined) {
        formatted.statusText = req.statusText;
      }
      if (req.timestamp !== undefined) {
        formatted.timestamp = req.timestamp;
      }
      if (req.resourceType !== undefined) {
        formatted.resourceType = req.resourceType;
      }
      if (req.isXHR !== undefined) {
        formatted.isXHR = req.isXHR;
      }

      return formatted;
    });
  }

  clearNetworkRequests(): void {
    this.firefox.clearNetworkRequests();
  }

  async takeScreenshot(
    options: {
      format?: 'png' | 'jpeg' | 'webp';
      quality?: number;
      fullPage?: boolean;
      clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    } = {}
  ): Promise<Buffer> {
    return await this.firefox.takeScreenshot(options);
  }

  // Cleanup
  async close(): Promise<void> {
    await this.firefox.close();
  }

  isConnected(): boolean {
    return this.firefox.isConnected();
  }
}
