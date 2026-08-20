import EventEmitter from 'node:events';
import { WebDriver } from 'selenium-webdriver';
import { logDebug } from '../utils/logger.js';

export class BiDiFacade extends EventEmitter {
  private listening = false;
  private nextCommandId = 1;

  constructor(private readonly driver: WebDriver) {
    super();
  }

  async subscribe(events: string | string[]) {
    const bidi = await this.driver.getBidi();
    if (!this.listening) {
      this.listenForEvents(bidi.socket);
      this.listening = true;
    }
    await bidi.subscribe(events);
  }

  async sendCommand(method: string, params: Record<string, any> = {}): Promise<any> {
    const bidi = await this.driver.getBidi();
    // bidi.socket is a Node.js `ws` WebSocket (EventEmitter-style), but typed as browser WebSocket
    const ws = bidi.socket as any;

    // Wait for WebSocket to be ready before sending
    await this.waitForWebSocketOpen(ws);

    const id = this.nextCommandId++;

    return new Promise((resolve, reject) => {
      const messageHandler = (data: any) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload.id === id) {
            ws.off('message', messageHandler);
            if (payload.error) {
              reject(new Error(`BiDi error: ${JSON.stringify(payload.error)}`));
            } else {
              resolve(payload.result);
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.on('message', messageHandler);

      const command = {
        id,
        method,
        params,
      };

      ws.send(JSON.stringify(command));

      setTimeout(() => {
        ws.off('message', messageHandler);
        reject(new Error(`BiDi command timeout: ${method}`));
      }, 10000);
    });
  }

  private listenForEvents(ws: any) {
    ws.on('message', (data: any) => {
      let payload: any;
      try {
        payload = JSON.parse(data.toString());
      } catch {
        // ignore parse errors
        return;
      }
      if (payload?.type === 'event' && payload.method) {
        try {
          this.emit(payload.method, payload.params);
        } catch (error) {
          logDebug(
            `Error emitting ${payload.method} event: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    });
  }

  /**
   * Wait for WebSocket to be in OPEN state
   */
  private async waitForWebSocketOpen(ws: any, timeout: number = 5000): Promise<void> {
    // Already open
    if (ws.readyState === 1) {
      return;
    }

    // Still connecting - wait for open event with timeout
    if (ws.readyState === 0) {
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          ws.off('open', onOpen);
          reject(new Error('Timeout waiting for WebSocket to open'));
        }, timeout);

        const onOpen = () => {
          clearTimeout(timeoutId);
          ws.off('open', onOpen);
          resolve();
        };
        ws.on('open', onOpen);
      });
    }

    throw new Error(`WebSocket is not open: readyState ${ws.readyState}`);
  }
}
