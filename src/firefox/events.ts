/**
 * Event handling: console, network (future)
 */

import type { WebDriver } from 'selenium-webdriver';
import type { ConsoleMessage } from './types.js';
import { logDebug } from '../utils/logger.js';

export class ConsoleEvents {
  private consoleMessages: ConsoleMessage[] = [];
  private subscribed = false;

  constructor(private driver: WebDriver) {}

  /**
   * Subscribe to BiDi console events
   */
  async subscribe(contextId?: string): Promise<void> {
    if (this.subscribed) {
      return;
    }

    const bidi = await this.driver.getBidi();
    await bidi.subscribe('log.entryAdded', contextId ? [contextId] : undefined);

    const ws: any = bidi.socket;
    ws.on('message', (data: any) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload?.method === 'log.entryAdded') {
          const entry = payload.params;
          const message: ConsoleMessage = {
            level: (entry.level as ConsoleMessage['level']) || 'info',
            text: entry.text || (entry.args ? JSON.stringify(entry.args) : ''),
            timestamp: entry.timestamp || Date.now(),
            source: entry.source?.realm,
            args: entry.args,
          };
          this.consoleMessages.push(message);
          logDebug(`Console [${message.level}]: ${message.text}`);
        }
      } catch (err) {
        // ignore parse errors
      }
    });

    this.subscribed = true;
    logDebug('Console listener active');
  }

  /**
   * Get all collected console messages
   */
  getMessages(): ConsoleMessage[] {
    return [...this.consoleMessages];
  }

  /**
   * Clear console messages (e.g., on navigation)
   */
  clearMessages(): void {
    this.consoleMessages = [];
  }
}

/**
 * Network events (BiDi implementation)
 */
export class NetworkEvents {
  private networkRecords: Map<string, any> = new Map();
  private subscribed = false;
  private enabled = false;
  private requestStartTimes: Map<string, number> = new Map();

  constructor(private driver: WebDriver) {}

  /**
   * Subscribe to BiDi network events
   */
  async subscribe(contextId?: string): Promise<void> {
    if (this.subscribed) {
      return;
    }

    const bidi = await this.driver.getBidi();

    // Subscribe to network events
    await bidi.subscribe('network.beforeRequestSent', contextId ? [contextId] : undefined);
    await bidi.subscribe('network.responseStarted', contextId ? [contextId] : undefined);
    await bidi.subscribe('network.responseCompleted', contextId ? [contextId] : undefined);

    const ws: any = bidi.socket;
    ws.on('message', (data: any) => {
      if (!this.enabled) {
        return; // Only collect when explicitly enabled
      }

      try {
        const payload = JSON.parse(data.toString());

        // Handle beforeRequestSent
        if (payload?.method === 'network.beforeRequestSent') {
          const req = payload.params;
          const requestId = req.request?.request || req.requestId;

          if (!requestId) {
            return;
          }

          this.requestStartTimes.set(requestId, Date.now());

          const record = {
            id: requestId,
            url: req.request?.url || '',
            method: req.request?.method || 'GET',
            timestamp: Date.now(),
            resourceType: this.guessResourceType(req.request?.url || ''),
            isXHR: req.initiator?.type === 'xmlhttprequest' || req.initiator?.type === 'fetch',
            requestHeaders: this.parseHeaders(req.request?.headers || []),
            timings: {
              requestTime: Date.now(),
            },
          };

          this.networkRecords.set(requestId, record);
          logDebug(`Network request [${record.method}]: ${record.url}`);
        }

        // Handle responseStarted
        if (payload?.method === 'network.responseStarted') {
          const resp = payload.params;
          const requestId = resp.request?.request || resp.requestId;

          if (!requestId) {
            return;
          }

          const existing = this.networkRecords.get(requestId);
          if (existing) {
            existing.status = resp.response?.status;
            existing.statusText = resp.response?.statusText || '';
            existing.responseHeaders = this.parseHeaders(resp.response?.headers || []);
          }
        }

        // Handle responseCompleted
        if (payload?.method === 'network.responseCompleted') {
          const resp = payload.params;
          const requestId = resp.request?.request || resp.requestId;

          if (!requestId) {
            return;
          }

          const existing = this.networkRecords.get(requestId);
          const startTime = this.requestStartTimes.get(requestId);

          if (existing && startTime) {
            existing.timings.responseTime = Date.now();
            existing.timings.duration = Date.now() - startTime;

            if (!existing.status && resp.response?.status) {
              existing.status = resp.response.status;
              existing.statusText = resp.response.statusText || '';
            }
          }

          this.requestStartTimes.delete(requestId);
        }
      } catch (err) {
        // Ignore parse errors
      }
    });

    this.subscribed = true;
    logDebug('Network listener ready (call startMonitoring to enable)');
  }

  /**
   * Start collecting network requests
   */
  startMonitoring(): void {
    this.enabled = true;
    logDebug('Network monitoring started');
  }

  /**
   * Stop collecting network requests
   */
  stopMonitoring(): void {
    this.enabled = false;
    logDebug('Network monitoring stopped');
  }

  /**
   * Get all collected network requests
   */
  getRequests(): any[] {
    return Array.from(this.networkRecords.values());
  }

  /**
   * Clear network request buffer
   */
  clearRequests(): void {
    this.networkRecords.clear();
    this.requestStartTimes.clear();
    logDebug('Network requests cleared');
  }

  /**
   * Guess resource type from URL
   */
  private guessResourceType(url: string): string {
    const pathPart = url.split('?')[0];
    if (!pathPart) {
      return 'document';
    }

    const parts = pathPart.split('.');
    const ext = (parts.length > 1 ? parts[parts.length - 1] || '' : '').toLowerCase();

    if (['js', 'mjs'].includes(ext)) {
      return 'script';
    }
    if (['css'].includes(ext)) {
      return 'stylesheet';
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
      return 'image';
    }
    if (['woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
      return 'font';
    }
    if (['mp4', 'webm', 'ogg'].includes(ext)) {
      return 'media';
    }
    if (url.includes('/api/') || url.includes('.json')) {
      return 'xhr';
    }

    return 'document';
  }

  /**
   * Parse BiDi headers array to object
   */
  private parseHeaders(headers: any[]): Record<string, string> {
    const result: Record<string, string> = {};

    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.name && h.value) {
          result[h.name.toLowerCase()] = String(h.value);
        }
      }
    }

    return result;
  }
}
