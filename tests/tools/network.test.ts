/**
 * Unit tests for network tools
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listNetworkRequestsTool, getNetworkRequestTool } from '../../src/tools/network.js';

describe('Network Tools', () => {
  describe('Tool Definitions', () => {
    it('should have correct tool names', () => {
      expect(listNetworkRequestsTool.name).toBe('list_network_requests');
      expect(getNetworkRequestTool.name).toBe('get_network_request');
    });

    it('should have valid descriptions', () => {
      expect(listNetworkRequestsTool.description).toContain('network');
      expect(getNetworkRequestTool.description).toContain('request');
    });

    it('should have valid input schemas', () => {
      expect(listNetworkRequestsTool.inputSchema.type).toBe('object');
      expect(getNetworkRequestTool.inputSchema.type).toBe('object');
    });
  });

  describe('Schema Properties', () => {
    it('listNetworkRequestsTool should have filtering options', () => {
      const { properties } = listNetworkRequestsTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.urlContains).toBeDefined();
      expect(properties?.method).toBeDefined();
      expect(properties?.resourceType).toBeDefined();
      expect(properties?.status).toBeDefined();
      expect(properties?.statusMin).toBeDefined();
      expect(properties?.statusMax).toBeDefined();
    });

    it('listNetworkRequestsTool should have limit and sorting options', () => {
      const { properties } = listNetworkRequestsTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.limit).toBeDefined();
      expect(properties?.sortBy).toBeDefined();
      expect(properties?.sortBy.enum).toContain('timestamp');
    });

    it('getNetworkRequestTool should have id or url options', () => {
      const { properties } = getNetworkRequestTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.url).toBeDefined();
    });

    it('format property should have enum values', () => {
      const { properties } = listNetworkRequestsTool.inputSchema;
      expect(properties?.format).toBeDefined();
      expect(properties?.format.enum).toContain('text');
      expect(properties?.format.enum).toContain('json');
    });

    it('listNetworkRequestsTool should have optional saveTo and preview', () => {
      const { properties } = listNetworkRequestsTool.inputSchema;
      expect(properties?.saveTo).toBeDefined();
      expect(properties?.saveTo.type).toEqual(['boolean', 'string']);
      expect(properties?.preview.type).toBe('number');
    });

    it('getNetworkRequestTool should have optional saveTo and preview', () => {
      const { properties } = getNetworkRequestTool.inputSchema;
      expect(properties?.saveTo).toBeDefined();
      expect(properties?.saveTo.type).toEqual(['boolean', 'string']);
      expect(properties?.preview.type).toBe('number');
    });

    it('should not mark saveTo or preview as required', () => {
      expect(
        (listNetworkRequestsTool.inputSchema as { required?: string[] }).required
      ).toBeUndefined();
      expect(
        (getNetworkRequestTool.inputSchema as { required?: string[] }).required
      ).toBeUndefined();
    });
  });

  describe('Handler: saveTo behavior', () => {
    const LONG_HEADER = 'z'.repeat(600);
    const REQUESTS = [
      {
        id: 'r1',
        url: 'https://example.test/one',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        resourceType: 'document',
        isXHR: false,
        timestamp: 1700000000000,
        timings: { duration: 12 },
        requestHeaders: { 'x-big': LONG_HEADER },
        responseHeaders: { 'content-type': 'text/html' },
      },
      {
        id: 'r2',
        url: 'https://example.test/two',
        method: 'POST',
        status: 201,
        statusText: 'Created',
        resourceType: 'xhr',
        isXHR: true,
        timestamp: 1700000001000,
        timings: { duration: 34 },
        requestHeaders: { 'x-small': 'ok' },
        responseHeaders: {},
      },
    ];
    let tempDir: string;

    beforeEach(() => {
      tempDir = join(tmpdir(), `network-test-${Date.now()}`);

      vi.doMock('../../src/index.js', () => ({
        getFirefox: vi.fn().mockResolvedValue({
          getNetworkRequests: vi.fn().mockResolvedValue(REQUESTS),
        }),
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should save all requests with full untruncated headers', async () => {
      const { handleListNetworkRequests } = await import('../../src/tools/network.js');
      const filePath = join(tempDir, 'network.json');
      const result = await handleListNetworkRequests({ saveTo: filePath });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('saved to:');
      const raw = readFileSync(filePath, 'utf8');
      expect(raw).toContain(LONG_HEADER);
      expect(raw).not.toContain('...[truncated]');
      expect(raw).not.toContain('__truncated__');
    });

    it('should ignore limit when saving to a file', async () => {
      const { handleListNetworkRequests } = await import('../../src/tools/network.js');
      const filePath = join(tempDir, 'network.json');
      await handleListNetworkRequests({ saveTo: filePath, limit: 1 });

      const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
      expect(parsed.requests).toHaveLength(2);
      expect(parsed.total).toBe(2);
    });

    it('should save a single request with raw headers by id', async () => {
      const { handleGetNetworkRequest } = await import('../../src/tools/network.js');
      const filePath = join(tempDir, 'request.json');
      const result = await handleGetNetworkRequest({ id: 'r1', saveTo: filePath });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('Request r1 saved to:');
      const raw = readFileSync(filePath, 'utf8');
      expect(raw).toContain(LONG_HEADER);
      expect(raw).not.toContain('...[truncated]');
    });
  });
});
