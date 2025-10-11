/**
 * Firefox RDP TCP transport with JSON framing
 */

import { Socket } from 'net';
import { EventEmitter } from 'events';
import type { RdpPacket } from './types.js';
import { logDebug, logError } from '../utils/logger.js';

const DEFAULT_CONNECT_TIMEOUT = 5000;
const PACKET_DELIMITER = ':';

export class RdpTransport extends EventEmitter {
  private socket: Socket | null = null;
  private buffer = '';
  private connected = false;

  async connect(host: string, port: number, timeout = DEFAULT_CONNECT_TIMEOUT): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      this.socket = socket;

      const cleanup = () => {
        socket.removeAllListeners('connect');
        socket.removeAllListeners('data');
        socket.removeAllListeners('error');
        socket.removeAllListeners('close');
      };

      const timeoutHandle = setTimeout(() => {
        socket.destroy();
        cleanup();
        reject(new Error(`Connection timeout after ${timeout}ms. Is Firefox RDP server running?`));
      }, timeout);

      socket.once('connect', () => {
        clearTimeout(timeoutHandle);
        this.connected = true;
        logDebug(`Connected to Firefox RDP at ${host}:${port}`);
        // Keep data/close listeners for the lifetime of the socket
        resolve();
      });

      socket.on('data', (data) => {
        this.handleData(data);
      });

      socket.once('error', (err) => {
        clearTimeout(timeoutHandle);
        this.connected = false;
        logError('RDP transport error', err);
        this.emit('error', err);
        cleanup();
        reject(err);
      });

      socket.once('close', () => {
        this.connected = false;
        logDebug('RDP connection closed');
        this.emit('close');
        // If we closed before establishing a connection, reject to let callers fallback to auto-launch
        if (!socket.connecting && !this.connected) {
          cleanup();
          // Only reject if connect() hasn't resolved yet
          // Note: if 'connect' already fired, the promise is resolved and close is just lifecycle.
        }
      });

      socket.connect(port, host);
    });
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString('utf-8');

    // Firefox RDP uses length-prefixed JSON messages: "<length>:<json>"
    while (this.buffer.length > 0) {
      const delimiterIndex = this.buffer.indexOf(PACKET_DELIMITER);
      if (delimiterIndex === -1) {
        // Not enough data yet
        break;
      }

      const lengthStr = this.buffer.substring(0, delimiterIndex);
      const length = parseInt(lengthStr, 10);

      if (Number.isNaN(length)) {
        logError('Invalid RDP packet length', new Error(`Invalid length: ${lengthStr}`));
        this.buffer = ''; // Reset buffer on error
        break;
      }

      const packetStart = delimiterIndex + 1;
      const packetEnd = packetStart + length;

      if (this.buffer.length < packetEnd) {
        // Not enough data yet
        break;
      }

      const packetData = this.buffer.substring(packetStart, packetEnd);
      this.buffer = this.buffer.substring(packetEnd);

      try {
        const packet = JSON.parse(packetData) as RdpPacket;
        logDebug(`RDP recv: ${JSON.stringify(packet)}`);
        this.emit('message', packet);
      } catch (err) {
        logError('Failed to parse RDP packet', err);
      }
    }
  }

  send(packet: RdpPacket): void {
    if (!this.socket || !this.connected) {
      throw new Error('Transport not connected');
    }

    const json = JSON.stringify(packet);
    const length = Buffer.byteLength(json, 'utf-8');
    const message = `${length}:${json}`;

    logDebug(`RDP send: ${JSON.stringify(packet)}`);
    this.socket.write(message, 'utf-8');
  }

  isConnected(): boolean {
    return this.connected;
  }

  close(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.buffer = '';
  }
}
