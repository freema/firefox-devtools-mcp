/**
 * Helper functions for creating MCP tool responses
 */

import type { McpToolResponse } from '../types/common.js';

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
