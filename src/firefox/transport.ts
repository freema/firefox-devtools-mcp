/**
 * Firefox RDP TCP transport with byte-precise JSON framing
 */

import { Socket } from 'net';
import { EventEmitter } from 'events';
import type { RdpPacket } from './types.js';
import { logDebug, logError } from '../utils/logger.js';

const DEFAULT_CONNECT_TIMEOUT = 5000;
const COLON = ':'.charCodeAt(0);

export class RdpTransport extends EventEmitter {
  private socket: Socket | null = null;
  private buffer: Buffer = Buffer.alloc(0);
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
        if (!socket.connecting && !this.connected) {
          cleanup();
        }
      });

      socket.connect(port, host);
    });
  }

  private handleData(chunk: Buffer): void {
    // Accumulate bytes
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Process all complete messages
    while (this.buffer.length > 0) {
      // Find header delimiter ':'
      const colonIndex = this.indexOfColon(this.buffer);
      if (colonIndex === -1) {
        // Need more data for header
        return;
      }

      // Parse ASCII length
      const lengthStr = this.buffer.subarray(0, colonIndex).toString('ascii');
      const bodyLength = parseInt(lengthStr, 10);
      if (!Number.isFinite(bodyLength) || bodyLength < 0) {
        logError('Invalid RDP packet length', new Error(`Invalid length: ${lengthStr}`));
        // Desync: drop buffer to recover
        this.buffer = Buffer.alloc(0);
        return;
      }

      const bodyStart = colonIndex + 1;
      const bodyEnd = bodyStart + bodyLength;

      if (this.buffer.length < bodyEnd) {
        // Not enough bytes for the full JSON body yet
        return;
      }

      const bodyBuf = this.buffer.subarray(bodyStart, bodyEnd);
      // Slice remaining bytes for next iteration
      this.buffer = this.buffer.subarray(bodyEnd);

      try {
        const packetJson = bodyBuf.toString('utf8');
        const packet = JSON.parse(packetJson) as RdpPacket;
        logDebug(`RDP recv: ${JSON.stringify(packet)}`);
        this.emit('message', packet);
      } catch (err) {
        logError('Failed to parse RDP packet', err);
        // Continue parsing subsequent messages (best effort)
      }
    }
  }

  private indexOfColon(buf: Buffer): number {
    // Find a colon such that all preceding bytes are ASCII digits (length header)
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] !== COLON) {
        continue;
      }
      let digits = true;
      for (let j = 0; j < i; j++) {
        const c = buf[j];
        if (c === undefined || c < 0x30 || c > 0x39) {
          digits = false;
          break;
        }
      }
      if (digits && i > 0) {
        return i;
      }
    }
    return -1;
  }

  send(packet: RdpPacket): void {
    if (!this.socket || !this.connected) {
      throw new Error('Transport not connected');
    }

    const json = JSON.stringify(packet);
    const msgBuf = Buffer.from(json, 'utf8');

    logDebug(`RDP send: ${JSON.stringify(packet)}`);
    // Write header in ASCII, then body bytes
    this.socket.write(`${msgBuf.length}:`, 'ascii');
    this.socket.write(msgBuf);
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
    this.buffer = Buffer.alloc(0);
  }
}
