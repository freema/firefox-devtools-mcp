/**
 * Network event handling with lifecycle hooks
 */

import type { WebDriver } from 'selenium-webdriver';
import { logDebug } from '../../utils/logger.js';

export interface NetworkEventsOptions {
  /** Callback triggered on navigation events (for auto-clear) */
  onNavigate?: () => void;
  /** Auto-clear network requests on navigation (default: true when monitoring is enabled) */
  autoClearOnNavigate?: boolean;
}

export class NetworkEvents {
  private networkRecords: Map<string, any> = new Map();
  private subscribed = false;
  private enabled = false;
  private requestStartTimes: Map<string, number> = new Map();
  private options: NetworkEventsOptions;

  constructor(
    private driver: WebDriver,
    options: NetworkEventsOptions = {}
  ) {
    this.options = {
      autoClearOnNavigate: true,
      ...options,
    };
  }

  /**
   * Subscribe to BiDi network events and navigation lifecycle
   * Enables monitoring by default (always-on capture)
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

    // Subscribe to navigation events for lifecycle hooks
    try {
      await bidi.subscribe('browsingContext.load', contextId ? [contextId] : undefined);
      await bidi.subscribe('browsingContext.domContentLoaded', contextId ? [contextId] : undefined);
    } catch (err) {
      logDebug(
        'Navigation events subscription skipped (may not be available in this Firefox version)'
      );
    }

    const ws: any = bidi.socket;
    ws.on('message', (data: any) => {
      try {
        const payload = JSON.parse(data.toString());

        // Handle navigation lifecycle events
        if (
          payload?.method === 'browsingContext.load' ||
          payload?.method === 'browsingContext.domContentLoaded'
        ) {
          // Only clear if monitoring is enabled and autoClear is on
          if (this.enabled && this.options.autoClearOnNavigate) {
            this.clearRequests();
          }
          if (this.options.onNavigate) {
            this.options.onNavigate();
          }
          return;
        }

        // Only collect network events when explicitly enabled
        if (!this.enabled) {
          return;
        }

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
    // Enable monitoring by default (always-on)
    this.enabled = true;
    logDebug('Network listener ready with lifecycle hooks (monitoring enabled by default)');
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
