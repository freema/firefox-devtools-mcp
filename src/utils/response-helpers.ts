/**
 * Helper functions for creating MCP tool responses
 */

import type { McpToolResponse } from '../types/common.js';

// ============================================================================
// TOKEN LIMIT SAFEGUARDS
// ============================================================================

/**
 * Response size limits to prevent context overflow in LLM clients.
 * These limits are conservative estimates based on typical tokenization ratios.
 */
export const TOKEN_LIMITS = {
  /** Maximum characters for a single response (~12.5k tokens at ~4 chars/token) */
  MAX_RESPONSE_CHARS: 50_000,

  /** Maximum characters for screenshot base64 data (~10k tokens) */
  MAX_SCREENSHOT_CHARS: 40_000,

  /** Maximum characters per console message text */
  MAX_CONSOLE_MESSAGE_CHARS: 2_000,

  /** Maximum characters for network header values (per header) */
  MAX_HEADER_VALUE_CHARS: 500,

  /** Maximum total characters for all headers combined */
  MAX_HEADERS_TOTAL_CHARS: 5_000,

  /** Hard cap on snapshot lines (even if user requests more) */
  MAX_SNAPSHOT_LINES_CAP: 500,

  /** Warning threshold - show warning when response exceeds this */
  WARNING_THRESHOLD_CHARS: 30_000,
} as const;

/**
 * Estimate token count from character count.
 * Uses a conservative ratio of ~4 characters per token.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to a maximum length, adding truncation notice if needed.
 */
export function truncateText(
  text: string,
  maxChars: number,
  suffix = '\n\n[... truncated - exceeded size limit]'
): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars - suffix.length) + suffix;
}

/**
 * Truncate a response and add a warning header if it exceeds limits.
 */
export function safeguardResponse(text: string): string {
  const estimatedTokens = estimateTokens(text);

  // Add warning if response is large
  let result = text;
  if (text.length > TOKEN_LIMITS.WARNING_THRESHOLD_CHARS) {
    const warning = `⚠️ Large response (~${Math.round(estimatedTokens / 1000)}k tokens) - consider using filters to reduce output\n\n`;
    result = warning + text;
  }

  // Hard truncate if still too large
  if (result.length > TOKEN_LIMITS.MAX_RESPONSE_CHARS) {
    result = truncateText(result, TOKEN_LIMITS.MAX_RESPONSE_CHARS);
  }

  return result;
}

/**
 * Truncate headers object to fit within limits.
 */
export function truncateHeaders(
  headers: Record<string, string> | null | undefined
): Record<string, string> | null {
  if (!headers) {
    return null;
  }

  const result: Record<string, string> = {};
  let totalChars = 0;

  for (const [key, value] of Object.entries(headers)) {
    // Truncate individual header value
    const truncatedValue =
      value.length > TOKEN_LIMITS.MAX_HEADER_VALUE_CHARS
        ? value.slice(0, TOKEN_LIMITS.MAX_HEADER_VALUE_CHARS) + '...[truncated]'
        : value;

    // Check total size limit
    const entrySize = key.length + truncatedValue.length;
    if (totalChars + entrySize > TOKEN_LIMITS.MAX_HEADERS_TOTAL_CHARS) {
      result['__truncated__'] = 'Headers truncated due to size limit';
      break;
    }

    result[key] = truncatedValue;
    totalChars += entrySize;
  }

  return result;
}

export function successResponse(message: string): McpToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  };
}

export function errorResponse(error: Error | string): McpToolResponse {
  const message = error instanceof Error ? error.message : error;
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}

export function jsonResponse(data: unknown): McpToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
