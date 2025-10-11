/**
 * Firefox WebDriver BiDi client
 * Implements BiDi protocol for screenshot and browsing context management
 */

import type WebSocket from 'ws';
import WS from 'ws';
import { logDebug, logError, log } from '../utils/logger.js';

interface BiDiCommand {
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface BiDiResponse {
  id?: number;
  result?: Record<string, unknown>;
  error?: {
    error: string;
    message: string;
    stacktrace?: string;
  };
  method?: string;
  params?: Record<string, unknown>;
}

interface BrowsingContext {
  context: string;
  url: string;
  children: BrowsingContext[];
  parent?: string;
}

interface ScreenshotOptions {
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  origin?: 'viewport' | 'document';
}

export class FirefoxBiDiClient {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private ws: WebSocket | null = null;
  private commandId = 0;
  private pendingCommands = new Map<
    number,
    {
      resolve: (value: BiDiResponse) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private selectedContextId: string | null = null;

  async connect(host: string, port: number): Promise<void> {
    // BiDi uses WebSocket, typically on the same port as RDP but via /session path
    // Firefox Remote Agent listens on ws://host:port/
    const wsUrl = `ws://${host}:${port}/`;

    logDebug(`Connecting to BiDi WebSocket: ${wsUrl}`);

    return new Promise((resolve, reject) => {
      this.ws = new WS(wsUrl);

      this.ws.on('open', () => {
        log(`Connected to Firefox BiDi at ${wsUrl}`);
        resolve();
      });

      this.ws.on('error', (error: Error) => {
        logError('BiDi WebSocket error', error);
        reject(error);
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as BiDiResponse;
          this.handleMessage(message);
        } catch (error) {
          logError('Failed to parse BiDi message', error);
        }
      });

      this.ws.on('close', () => {
        logDebug('BiDi WebSocket closed');
        this.ws = null;
      });
    });
  }

  async getTree(): Promise<{ contexts: BrowsingContext[] }> {
    logDebug('Getting browsing context tree');

    const response = await this.sendCommand('browsingContext.getTree', {});

    if (!response.result?.contexts) {
      throw new Error('Invalid getTree response');
    }

    return { contexts: response.result.contexts as BrowsingContext[] };
  }

  async selectContextByUrl(url: string): Promise<string | null> {
    const tree = await this.getTree();

    // Find context matching URL
    const findContext = (contexts: BrowsingContext[]): string | null => {
      for (const context of contexts) {
        if (context.url === url) {
          this.selectedContextId = context.context;
          logDebug(`Selected BiDi context: ${this.selectedContextId} (${url})`);
          return context.context;
        }
        if (context.children.length > 0) {
          const found = findContext(context.children);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    return findContext(tree.contexts);
  }

  async selectFirstContext(): Promise<string | null> {
    const tree = await this.getTree();

    if (tree.contexts.length > 0 && tree.contexts[0]) {
      this.selectedContextId = tree.contexts[0].context;
      logDebug(`Selected first BiDi context: ${this.selectedContextId}`);
      return this.selectedContextId;
    }

    return null;
  }

  getSelectedContextId(): string | null {
    return this.selectedContextId;
  }

  async captureScreenshot(
    contextId?: string,
    options?: ScreenshotOptions
  ): Promise<{ data: string }> {
    const targetContextId = contextId || this.selectedContextId;

    if (!targetContextId) {
      throw new Error('No browsing context selected for screenshot');
    }

    logDebug(`Capturing screenshot for context: ${targetContextId}`);

    const params: Record<string, unknown> = {
      context: targetContextId,
    };

    if (options?.clip) {
      params.clip = {
        type: 'box',
        x: options.clip.x,
        y: options.clip.y,
        width: options.clip.width,
        height: options.clip.height,
      };
    }

    if (options?.origin) {
      params.origin = options.origin;
    }

    const response = await this.sendCommand('browsingContext.captureScreenshot', params);

    if (!response.result?.data) {
      throw new Error('Invalid captureScreenshot response');
    }

    logDebug(`Screenshot captured: ${String(response.result.data).substring(0, 50)}... (base64)`);

    return { data: response.result.data as string };
  }

  private async sendCommand(
    method: string,
    params: Record<string, unknown>
  ): Promise<BiDiResponse> {
    if (!this.ws || this.ws.readyState !== WS.OPEN) {
      throw new Error('BiDi WebSocket not connected');
    }

    const id = ++this.commandId;
    const command: BiDiCommand = { id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error(`BiDi command timeout: ${method}`));
      }, 10000);

      this.pendingCommands.set(id, { resolve, reject, timeout });

      const message = JSON.stringify(command);
      this.ws!.send(message);

      logDebug(`Sent BiDi command: ${method} (id: ${id})`);
    });
  }

  private handleMessage(message: BiDiResponse): void {
    // Handle command response
    if (message.id !== undefined) {
      const pending = this.pendingCommands.get(message.id);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingCommands.delete(message.id);

        if (message.error) {
          pending.reject(
            new Error(`BiDi error: ${message.error.error} - ${message.error.message}`)
          );
        } else {
          pending.resolve(message);
        }
      }
      return;
    }

    // Handle events (we might not need these for now)
    if (message.method) {
      logDebug(`BiDi event: ${message.method}`);
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WS.OPEN;
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear pending commands
    for (const pending of this.pendingCommands.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('BiDi connection closed'));
    }
    this.pendingCommands.clear();
  }
}
