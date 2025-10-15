/**
 * Console event handling with lifecycle hooks
 */

import type { WebDriver } from 'selenium-webdriver';
import type { ConsoleMessage } from '../types.js';
import { logDebug } from '../../utils/logger.js';

export interface ConsoleEventsOptions {
  /** Callback triggered on navigation events (for auto-clear) */
  onNavigate?: () => void;
  /** Auto-clear console on navigation (default: true) */
  autoClearOnNavigate?: boolean;
}

export class ConsoleEvents {
  private consoleMessages: ConsoleMessage[] = [];
  private subscribed = false;
  private options: ConsoleEventsOptions;

  constructor(
    private driver: WebDriver,
    options: ConsoleEventsOptions = {}
  ) {
    this.options = {
      autoClearOnNavigate: true,
      ...options,
    };
  }

  /**
   * Subscribe to BiDi console events and navigation lifecycle
   */
  async subscribe(contextId?: string): Promise<void> {
    if (this.subscribed) {
      return;
    }

    const bidi = await this.driver.getBidi();
    await bidi.subscribe('log.entryAdded', contextId ? [contextId] : undefined);

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

        // Handle console messages
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

        // Handle navigation lifecycle events
        if (
          payload?.method === 'browsingContext.load' ||
          payload?.method === 'browsingContext.domContentLoaded'
        ) {
          if (this.options.autoClearOnNavigate) {
            this.clearMessages();
          }
          if (this.options.onNavigate) {
            this.options.onNavigate();
          }
        }
      } catch (err) {
        // ignore parse errors
      }
    });

    this.subscribed = true;
    logDebug('Console listener active with lifecycle hooks');
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
