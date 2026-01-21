/**
 * Unit tests for NetworkEvents header parsing
 */

import { describe, it, expect } from 'vitest';

// Test the header parsing logic that handles BiDi format
// BiDi returns headers as: { name: "header-name", value: { type: "string", value: "actual-value" } }
// Or sometimes as: { name: "header-name", value: "actual-value" }

/**
 * Replica of the parseHeaders logic for testing
 */
function parseHeaders(headers: any[]): Record<string, string> {
  const result: Record<string, string> = {};

  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (h.name && h.value !== undefined) {
        // BiDi returns header values as { type: "string", value: "actual value" }
        const value = h.value;
        if (typeof value === 'string') {
          result[h.name.toLowerCase()] = value;
        } else if (value && typeof value === 'object' && 'value' in value) {
          result[h.name.toLowerCase()] = String(value.value);
        } else {
          result[h.name.toLowerCase()] = String(value);
        }
      }
    }
  }

  return result;
}

describe('NetworkEvents Header Parsing', () => {
  describe('parseHeaders', () => {
    it('should parse simple string header values', () => {
      const headers = [
        { name: 'Content-Type', value: 'text/html' },
        { name: 'Accept', value: 'application/json' },
      ];

      const result = parseHeaders(headers);

      expect(result['content-type']).toBe('text/html');
      expect(result['accept']).toBe('application/json');
    });

    it('should parse BiDi object header values with type and value', () => {
      // This is how WebDriver BiDi actually returns headers
      const headers = [
        { name: 'Content-Type', value: { type: 'string', value: 'text/html; charset=utf-8' } },
        { name: 'User-Agent', value: { type: 'string', value: 'Mozilla/5.0' } },
        { name: 'Accept', value: { type: 'string', value: 'text/html,application/xhtml+xml' } },
      ];

      const result = parseHeaders(headers);

      expect(result['content-type']).toBe('text/html; charset=utf-8');
      expect(result['user-agent']).toBe('Mozilla/5.0');
      expect(result['accept']).toBe('text/html,application/xhtml+xml');
    });

    it('should NOT return [object Object] for BiDi header values', () => {
      const headers = [
        { name: 'Host', value: { type: 'string', value: 'www.example.com' } },
      ];

      const result = parseHeaders(headers);

      expect(result['host']).toBe('www.example.com');
      expect(result['host']).not.toBe('[object Object]');
    });

    it('should handle mixed header value formats', () => {
      const headers = [
        { name: 'Simple', value: 'plain-string' },
        { name: 'BiDi', value: { type: 'string', value: 'bidi-value' } },
      ];

      const result = parseHeaders(headers);

      expect(result['simple']).toBe('plain-string');
      expect(result['bidi']).toBe('bidi-value');
    });

    it('should lowercase header names', () => {
      const headers = [
        { name: 'Content-TYPE', value: 'text/html' },
        { name: 'X-Custom-HEADER', value: { type: 'string', value: 'custom' } },
      ];

      const result = parseHeaders(headers);

      expect(result['content-type']).toBe('text/html');
      expect(result['x-custom-header']).toBe('custom');
    });

    it('should return empty object for non-array input', () => {
      expect(parseHeaders(null as any)).toEqual({});
      expect(parseHeaders(undefined as any)).toEqual({});
      expect(parseHeaders('not-an-array' as any)).toEqual({});
    });

    it('should skip headers without name or value', () => {
      const headers = [
        { name: 'Valid', value: 'value' },
        { name: 'NoValue' },
        { value: 'no-name' },
        { name: 'Empty', value: '' },
      ];

      const result = parseHeaders(headers);

      expect(result['valid']).toBe('value');
      expect(result['novalue']).toBeUndefined();
      expect(result['empty']).toBe('');
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('should handle numeric values in BiDi format', () => {
      const headers = [
        { name: 'Content-Length', value: { type: 'string', value: 12345 } },
      ];

      const result = parseHeaders(headers);

      expect(result['content-length']).toBe('12345');
    });

    it('should handle empty headers array', () => {
      expect(parseHeaders([])).toEqual({});
    });
  });
});
