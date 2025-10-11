/**
 * Console tools
 * Full implementation in task 08
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

export const listConsoleMessagesTool = {
  name: 'list_console_messages',
  description:
    'List all console messages for the currently selected page since the last navigation',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handleListConsoleMessages(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getContext } = await import('../index.js');
    const context = await getContext();

    const messages = await context.getConsoleMessages();

    if (messages.length === 0) {
      return successResponse('No console messages found for the currently selected page.');
    }

    // Format messages as text
    let output = `Console messages (${messages.length} total):\n\n`;

    for (const msg of messages) {
      const level = msg.level.toUpperCase();
      const timestamp = msg.timestamp ? new Date(msg.timestamp).toISOString() : '';
      const source = msg.source ? ` [${msg.source}]` : '';
      const time = timestamp ? `[${timestamp}] ` : '';

      output += `${time}[${level}]${source} ${msg.text}\n`;
    }

    return successResponse(output);
  } catch (error) {
    return errorResponse(error as Error);
  }
}
