/**
 * Low-level Firefox RDP client
 * Implements core RDP protocol operations
 */

import { RdpTransport } from './transport.js';
import type {
  ActorId,
  RdpPacket,
  Tab,
  AttachResult,
  ConsoleMessage,
  NetworkRequest,
} from './types.js';
import { RdpError } from './types.js';
import { logDebug, logError } from '../utils/logger.js';

const REQUEST_TIMEOUT = 10000;

interface PendingRequest {
  resolve: (value: RdpPacket) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class FirefoxRdpClient {
  private transport: RdpTransport;
  private rootActor: ActorId | null = null;
  private pendingRequests = new Map<ActorId, PendingRequest[]>();
  private consoleMessages = new Map<ActorId, ConsoleMessage[]>();
  private listeningConsoleActors = new Set<ActorId>();
  private networkRequests = new Map<ActorId, NetworkRequest[]>();
  private networkMonitorActors = new Map<ActorId, ActorId>();
  private pendingTargetAvailableResolvers: Array<(packet: RdpPacket) => void> = [];
  private watcherActors = new Set<ActorId>(); // Track watcher actors

  constructor() {
    this.transport = new RdpTransport();
    this.transport.on('message', (packet: RdpPacket) => this.handleMessage(packet));
    this.transport.on('error', (err: Error) => logError('RDP client error', err));
  }

  async connect(host: string, port: number): Promise<void> {
    await this.transport.connect(host, port);

    // Perform root discovery
    try {
      await this.discoverRoot();
    } catch (err) {
      logError('Failed to discover root actor', err);
      throw new RdpError(
        'Failed to initialize RDP connection',
        'INIT_FAILED',
        undefined,
        undefined,
        err
      );
    }
  }

  private async discoverRoot(): Promise<void> {
    logDebug('Discovering root actor via listTabs...');

    const response = await this.sendRequest('root', { type: 'listTabs' });

    if (!response.from) {
      throw new Error('Failed to discover root actor. Use Firefox 100+');
    }

    this.rootActor = response.from;
    logDebug(`Root actor discovered: ${this.rootActor}`);
  }

  async listTabs(): Promise<Tab[]> {
    if (!this.rootActor) {
      throw new RdpError('Root actor not initialized', 'NO_ROOT_ACTOR');
    }

    const response = await this.sendRequest(this.rootActor, { type: 'listTabs' });

    if (!response.tabs || !Array.isArray(response.tabs)) {
      throw new RdpError(
        'Invalid listTabs response',
        'INVALID_RESPONSE',
        undefined,
        this.rootActor,
        response
      );
    }

    return response.tabs as Tab[];
  }

  async attachToTab(tabActor: ActorId): Promise<AttachResult> {
    logDebug(`Attaching to tab: ${tabActor}`);

    // Modern Firefox uses watcher/targets API
    const watcherResp = await this.sendRequest(tabActor, { type: 'getWatcher' });
    const watcherActor = watcherResp.actor as ActorId | undefined;

    if (!watcherActor) {
      throw new RdpError(
        'Failed to get watcher actor. Requires Firefox 100+',
        'NO_WATCHER',
        undefined,
        tabActor
      );
    }

    // Register watcher actor so we can route its events
    this.watcherActors.add(watcherActor);
    logDebug(`Registered watcher actor: ${watcherActor}`);

    // CRITICAL: Set up promise BEFORE calling watchTargets
    // This matches vscode-firefox-debug behavior
    const targetPromise = this.awaitTargetAvailable(10000);

    // Now call watchTargets - this will trigger target-available-form events
    await this.sendRequest(watcherActor, {
      type: 'watchTargets',
      targetType: 'frame',
    });

    // Wait for the target-available-form event
    const evt = await targetPromise;
    const target = (evt as any).target || {};

    const consoleActor = target.consoleActor as ActorId;
    const threadActor = target.threadActor as ActorId;

    if (!consoleActor) {
      throw new RdpError(
        'No consoleActor in target. Tab may be empty.',
        'NO_CONSOLE_ACTOR',
        undefined,
        tabActor
      );
    }

    logDebug(`Attached: consoleActor=${consoleActor}, threadActor=${threadActor || 'none'}`);

    return { consoleActor, threadActor: threadActor || '' };
  }

  async closeTab(tabActor: ActorId): Promise<void> {
    logDebug(`Closing tab: ${tabActor}`);

    try {
      await this.sendRequest(tabActor, {
        type: 'close',
      });
      logDebug(`Tab closed: ${tabActor}`);
    } catch (error) {
      // Tab might already be closed or detached
      logDebug(`Error closing tab (may be already closed): ${String(error)}`);
    }
  }

  async evaluateJS(consoleActor: ActorId, code: string): Promise<unknown> {
    logDebug(`Evaluating JS: ${code.substring(0, 100)}...`);

    const response = await this.sendRequest(consoleActor, {
      type: 'evaluateJSAsync',
      text: code,
    });

    // Handle evaluation result
    if (response.exception) {
      const exceptionMsg = String(response.exceptionMessage || JSON.stringify(response.exception));
      throw new RdpError(
        `JavaScript evaluation failed: ${exceptionMsg}`,
        'EVAL_EXCEPTION',
        exceptionMsg,
        consoleActor,
        response
      );
    }

    return response.result;
  }

  async getPageContent(_tabActor: ActorId, consoleActor: ActorId): Promise<string> {
    logDebug('Getting page content via evaluate');

    const code = `
      JSON.stringify({
        html: document.documentElement.outerHTML,
        title: document.title,
        url: window.location.href
      })
    `;

    const result = await this.evaluateJS(consoleActor, code);

    if (typeof result === 'string') {
      try {
        const parsed = JSON.parse(result);
        return parsed.html || '';
      } catch {
        return result;
      }
    }

    return String(result);
  }

  async startConsoleListening(consoleActor: ActorId): Promise<void> {
    if (this.listeningConsoleActors.has(consoleActor)) {
      logDebug(`Already listening to console actor: ${consoleActor}`);
      return;
    }

    logDebug(`Starting console listener for: ${consoleActor}`);

    // Start listening to console API calls
    await this.sendRequest(consoleActor, {
      type: 'startListeners',
      listeners: ['consoleAPICall', 'pageError'],
    });

    this.listeningConsoleActors.add(consoleActor);

    // Initialize console messages storage for this actor
    if (!this.consoleMessages.has(consoleActor)) {
      this.consoleMessages.set(consoleActor, []);
    }

    logDebug(`Console listener started for: ${consoleActor}`);
  }

  async stopConsoleListening(consoleActor: ActorId): Promise<void> {
    if (!this.listeningConsoleActors.has(consoleActor)) {
      return;
    }

    logDebug(`Stopping console listener for: ${consoleActor}`);

    try {
      await this.sendRequest(consoleActor, {
        type: 'stopListeners',
        listeners: ['consoleAPICall', 'pageError'],
      });
    } catch (error) {
      logDebug(`Error stopping console listeners: ${String(error)}`);
    }

    this.listeningConsoleActors.delete(consoleActor);
  }

  getConsoleMessages(consoleActor: ActorId): ConsoleMessage[] {
    return this.consoleMessages.get(consoleActor) || [];
  }

  clearConsoleMessages(consoleActor: ActorId): void {
    this.consoleMessages.set(consoleActor, []);
  }

  async startNetworkMonitoring(tabActor: ActorId): Promise<ActorId> {
    // Check if already monitoring this tab
    const existing = this.networkMonitorActors.get(tabActor);
    if (existing) {
      logDebug(`Already monitoring network for tab: ${tabActor}`);
      return existing;
    }

    logDebug(`Starting network monitoring for tab: ${tabActor}`);

    // Attach to tab to get network monitor actor
    const response = await this.sendRequest(tabActor, {
      type: 'attach',
    });

    // Extract network monitor actor from response
    const networkMonitorActor = response.networkMonitorActor as ActorId | undefined;

    if (!networkMonitorActor) {
      throw new RdpError(
        'No networkMonitorActor in attach response',
        'NETWORK_ATTACH_FAILED',
        undefined,
        tabActor,
        response
      );
    }

    // Start listening to network events
    await this.sendRequest(networkMonitorActor, {
      type: 'startListeners',
      listeners: ['NetworkActivity'],
    });

    this.networkMonitorActors.set(tabActor, networkMonitorActor);
    this.networkRequests.set(tabActor, []);

    logDebug(`Network monitoring started for tab: ${tabActor}`);
    return networkMonitorActor;
  }

  async stopNetworkMonitoring(tabActor: ActorId): Promise<void> {
    const networkMonitorActor = this.networkMonitorActors.get(tabActor);
    if (!networkMonitorActor) {
      return;
    }

    logDebug(`Stopping network monitoring for tab: ${tabActor}`);

    try {
      await this.sendRequest(networkMonitorActor, {
        type: 'stopListeners',
        listeners: ['NetworkActivity'],
      });
    } catch (error) {
      logDebug(`Error stopping network listeners: ${String(error)}`);
    }

    this.networkMonitorActors.delete(tabActor);
  }

  getNetworkRequests(tabActor: ActorId): NetworkRequest[] {
    return this.networkRequests.get(tabActor) || [];
  }

  clearNetworkRequests(tabActor: ActorId): void {
    this.networkRequests.set(tabActor, []);
  }

  async getNetworkRequestDetails(
    _networkMonitorActor: ActorId,
    requestActor: ActorId
  ): Promise<NetworkRequest | null> {
    try {
      logDebug(`Getting details for network request: ${requestActor}`);

      const response = await this.sendRequest(requestActor, {
        type: 'getRequestHeaders',
      });

      const headersResponse = await this.sendRequest(requestActor, {
        type: 'getResponseHeaders',
      });

      // Try to get response content (might fail for some requests)
      let responseBody: string | undefined;
      try {
        const contentResponse = await this.sendRequest(requestActor, {
          type: 'getResponseContent',
        });

        if (contentResponse.content) {
          const content = contentResponse.content as { text?: string };
          responseBody = content.text;
        }
      } catch (error) {
        logDebug(`Could not get response content: ${String(error)}`);
      }

      // Parse headers
      const requestHeaders: Record<string, string> = {};
      const responseHeaders: Record<string, string> = {};

      if (response.headers) {
        const headers = response.headers as Array<{ name: string; value: string }>;
        for (const h of headers) {
          requestHeaders[h.name] = h.value;
        }
      }

      if (headersResponse.headers) {
        const headers = headersResponse.headers as Array<{ name: string; value: string }>;
        for (const h of headers) {
          responseHeaders[h.name] = h.value;
        }
      }

      const networkRequest: NetworkRequest = {
        url: (response.url as string) || '',
        method: (response.method as string) || 'GET',
        requestHeaders,
        responseHeaders,
      };

      // Add optional properties only if they exist
      if (headersResponse.status !== undefined) {
        networkRequest.status = headersResponse.status as number;
      }
      if (headersResponse.statusText !== undefined) {
        networkRequest.statusText = headersResponse.statusText as string;
      }
      if (responseBody !== undefined) {
        networkRequest.responseBody = responseBody;
      }

      return networkRequest;
    } catch (error) {
      logError('Failed to get network request details', error);
      return null;
    }
  }

  private async sendRequest(actor: ActorId, packet: Omit<RdpPacket, 'to'>): Promise<RdpPacket> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const queue = this.pendingRequests.get(actor);
        if (queue) {
          const index = queue.findIndex((req) => req.resolve === resolve);
          if (index !== -1) {
            queue.splice(index, 1);
          }
        }
        reject(
          new RdpError(`Request timeout after ${REQUEST_TIMEOUT}ms`, 'TIMEOUT', undefined, actor)
        );
      }, REQUEST_TIMEOUT);

      const pendingRequest: PendingRequest = {
        resolve,
        reject,
        timeout,
      };

      if (!this.pendingRequests.has(actor)) {
        this.pendingRequests.set(actor, []);
      }
      this.pendingRequests.get(actor)!.push(pendingRequest);

      const fullPacket: RdpPacket = {
        ...packet,
        to: actor,
      };

      this.transport.send(fullPacket);
    });
  }

  private handleMessage(packet: RdpPacket): void {
    const from = packet.from;
    if (!from) {
      logDebug('Received packet without "from" field, ignoring');
      return;
    }

    // WATCHER ACTOR EVENTS: Check if this is from a watcher actor and has a type (event)
    if (this.watcherActors.has(from) && packet.type) {
      logDebug(
        `[WATCHER EVENT] ${packet.type} from ${from}`
      );

      // Handle target-available-form event
      if (packet.type === 'target-available-form') {
        const resolver = this.pendingTargetAvailableResolvers.shift();
        if (resolver) {
          logDebug('Resolving target-available-form promise');
          resolver(packet);
        } else {
          logDebug('Received target-available-form without waiter');
        }
        return;
      }

      // Handle target-destroyed-form event
      if (packet.type === 'target-destroyed-form') {
        logDebug('Received target-destroyed-form event');
        return;
      }

      // Other watcher events - log and continue
      logDebug(`Unhandled watcher event: ${packet.type}`);
    }

    // Special-case: Root actor emits an initial "init" event with applicationType
    // and other events like tabListChanged. These are unsolicited and MUST NOT
    // consume a pending request (e.g., for getRoot or listTabs), otherwise we
    // will mismatch responses (symptom: listTabs gets a getRoot-shaped payload
    // without "tabs"). This mirrors the behavior in vscode-firefox-debug.
    if (
      from === 'root' &&
      // Initial root init event
      ((packet as any).applicationType !== undefined ||
        // Known root events
        packet.type === 'tabListChanged' ||
        packet.type === 'addonListChanged' ||
        packet.type === 'forwardingCancelled')
    ) {
      logDebug(
        `Root event received (type=${packet.type || 'init'}), ignoring for request matching`
      );
      return;
    }

    // Check for console API call events
    if (packet.type === 'consoleAPICall') {
      this.handleConsoleMessage(from, packet);
      return;
    }

    // Check for page error events
    if (packet.type === 'pageError') {
      this.handlePageError(from, packet);
      return;
    }

    // Check for network events
    if (packet.type === 'networkEvent' || packet.type === 'networkEventUpdate') {
      this.handleNetworkEvent(from, packet);
      return;
    }

    // Check if this is a response to a pending request
    const queue = this.pendingRequests.get(from);
    if (!queue || queue.length === 0) {
      // Could be an unsolicited event (navigation, console, etc.)
      logDebug(`Unsolicited message from ${from}: ${packet.type || 'unknown'}`);
      return;
    }

    // Handle first pending request for this actor
    const pendingRequest = queue.shift()!;
    clearTimeout(pendingRequest.timeout);

    if (packet.error) {
      const errorMsg = String(packet.error);
      pendingRequest.reject(
        new RdpError(
          `RDP error: ${errorMsg}`,
          'RDP_ERROR',
          packet.message as string | undefined,
          from,
          packet
        )
      );
    } else {
      pendingRequest.resolve(packet);
    }
  }

  private async awaitTargetAvailable(timeoutMs = 8000): Promise<RdpPacket> {
    return new Promise<RdpPacket>((resolve, reject) => {
      const resolver = (packet: RdpPacket) => {
        clearTimeout(timer);
        resolve(packet);
      };
      const timer = setTimeout(() => {
        const idx = this.pendingTargetAvailableResolvers.indexOf(resolver);
        if (idx !== -1) {
          this.pendingTargetAvailableResolvers.splice(idx, 1);
        }
        reject(new RdpError('Timeout waiting for target-available-form', 'TIMEOUT'));
      }, timeoutMs);
      this.pendingTargetAvailableResolvers.push(resolver);
    });
  }

  private handleConsoleMessage(from: ActorId, packet: RdpPacket): void {
    const message = packet.message as
      | {
          level?: string;
          arguments?: unknown[];
          timeStamp?: number;
          filename?: string;
        }
      | undefined;

    if (!message) {
      return;
    }

    // Map Firefox levels to standard console levels
    const levelMap: Record<string, ConsoleMessage['level']> = {
      log: 'log',
      warn: 'warn',
      error: 'error',
      info: 'info',
      debug: 'debug',
      trace: 'trace',
    };

    const level = levelMap[message.level || 'log'] || 'log';

    // Extract text from arguments
    let text = '';
    if (message.arguments && Array.isArray(message.arguments)) {
      text = message.arguments
        .map((arg) => {
          if (typeof arg === 'string') {
            return arg;
          }
          if (arg && typeof arg === 'object') {
            // Handle object arguments (Firefox sends grip objects)
            const grip = arg as { type?: string; value?: unknown; preview?: unknown };
            if (grip.type === 'undefined') {
              return 'undefined';
            }
            if (grip.type === 'null') {
              return 'null';
            }
            if ('value' in grip) {
              return String(grip.value);
            }
            return JSON.stringify(arg);
          }
          return String(arg);
        })
        .join(' ');
    }

    const consoleMessage: ConsoleMessage = {
      level,
      text,
    };

    // Add optional properties only if they exist
    if (message.timeStamp !== undefined) {
      consoleMessage.timestamp = message.timeStamp;
    }
    if (message.filename !== undefined) {
      consoleMessage.source = message.filename;
    }
    if (message.arguments !== undefined) {
      consoleMessage.arguments = message.arguments;
    }

    // Store the console message
    const messages = this.consoleMessages.get(from) || [];
    messages.push(consoleMessage);
    this.consoleMessages.set(from, messages);

    logDebug(`Console [${level}]: ${text.substring(0, 100)}`);
  }

  private handlePageError(from: ActorId, packet: RdpPacket): void {
    const error = packet.pageError as
      | {
          errorMessage?: string;
          sourceName?: string;
          lineNumber?: number;
          timeStamp?: number;
        }
      | undefined;

    if (!error) {
      return;
    }

    const text = error.errorMessage || 'Unknown error';

    const consoleMessage: ConsoleMessage = {
      level: 'error',
      text,
    };

    // Add optional properties only if they exist
    if (error.timeStamp !== undefined) {
      consoleMessage.timestamp = error.timeStamp;
    }
    if (error.sourceName !== undefined) {
      consoleMessage.source = `${error.sourceName}:${error.lineNumber || 0}`;
    }

    // Store the error message
    const messages = this.consoleMessages.get(from) || [];
    messages.push(consoleMessage);
    this.consoleMessages.set(from, messages);

    logDebug(`Page Error: ${text}`);
  }

  private handleNetworkEvent(_from: ActorId, packet: RdpPacket): void {
    // Network events in Firefox RDP are complex and vary by version
    // For MVP, we'll store basic information from network events
    const eventType = packet.type;

    if (eventType === 'networkEvent') {
      // New network request started
      const eventActor = packet.eventActor as
        | {
            actor?: ActorId;
            url?: string;
            method?: string;
            isXHR?: boolean;
            cause?: { type?: string };
            startedDateTime?: number;
          }
        | undefined;

      if (eventActor?.url) {
        const networkRequest: NetworkRequest = {
          url: eventActor.url,
          method: eventActor.method || 'GET',
        };

        // Add optional properties only if they exist
        if (eventActor.isXHR !== undefined) {
          networkRequest.isXHR = eventActor.isXHR;
        }
        if (eventActor.cause?.type !== undefined) {
          networkRequest.cause = eventActor.cause.type;
        }
        if (eventActor.startedDateTime !== undefined) {
          networkRequest.timestamp = eventActor.startedDateTime;
        }

        // Find the tab actor for this network monitor
        for (const [tabActor, _monitorActor] of this.networkMonitorActors) {
          const requests = this.networkRequests.get(tabActor) || [];
          requests.push(networkRequest);
          this.networkRequests.set(tabActor, requests);
          logDebug(`Network request: ${networkRequest.method} ${networkRequest.url}`);
          break;
        }
      }
    } else if (eventType === 'networkEventUpdate') {
      // Network request updated (response received, etc.)
      // For MVP, we can ignore updates or enhance them later
      logDebug('Network event update received (not processed in MVP)');
    }
  }

  isConnected(): boolean {
    return this.transport.isConnected();
  }

  close(): void {
    this.transport.close();
    this.rootActor = null;
    // Clear all pending requests
    for (const queue of this.pendingRequests.values()) {
      for (const req of queue) {
        clearTimeout(req.timeout);
        req.reject(new Error('Connection closed'));
      }
    }
    this.pendingRequests.clear();
    // Clear console messages
    this.consoleMessages.clear();
    this.listeningConsoleActors.clear();
    // Clear network data
    this.networkRequests.clear();
    this.networkMonitorActors.clear();
  }
}
