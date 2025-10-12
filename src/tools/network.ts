/**
 * Network monitoring tools for Firefox DevTools MCP
 * Provides network request inspection capabilities
 */

import { z } from 'zod';
import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions
export const listNetworkRequestsTool = {
  name: 'list_network_requests',
  description:
    'List all network requests for the currently selected page since the last navigation. ' +
    'NOTE: Network monitoring must be started first using start_network_monitoring. ' +
    'Current BiDi MVP network monitoring has limitations compared to Chrome DevTools.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of requests to return. When omitted, returns all requests.'),
      pageIdx: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Page number to return (0-based). When omitted, returns the first page.'),
    },
  },
};

export const getNetworkRequestTool = {
  name: 'get_network_request',
  description:
    'Get detailed information about a specific network request by URL. ' +
    'You can get all requests by calling list_network_requests first. ' +
    'NOTE: Detailed request/response data may be limited in current BiDi MVP.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: z.string().describe('The URL of the request to get details for.'),
    },
    required: ['url'],
  },
};

export const startNetworkMonitoringTool = {
  name: 'start_network_monitoring',
  description:
    'Start monitoring network requests for the currently selected page. ' +
    'This must be called before list_network_requests will return data. ' +
    'Network monitoring will continue until stopped or page is navigated.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export const stopNetworkMonitoringTool = {
  name: 'stop_network_monitoring',
  description:
    'Stop monitoring network requests for the currently selected page. ' +
    'Clears all collected network request data.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

// Tool handlers
export async function handleListNetworkRequests(args: unknown): Promise<McpToolResponse> {
  try {
    const { pageSize, pageIdx } = (args as { pageSize?: number; pageIdx?: number }) || {};

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const requests = await firefox.getNetworkRequests();

    // Apply pagination if requested
    let paginatedRequests = requests;
    let hasMore = false;

    if (pageSize !== undefined) {
      const pageIndex = pageIdx || 0;
      const start = pageIndex * pageSize;
      const end = start + pageSize;

      paginatedRequests = requests.slice(start, end);
      hasMore = end < requests.length;
    }

    // Format requests for response
    const formattedRequests = paginatedRequests.map((req) => {
      const statusInfo = req.status
        ? `[${req.status}${req.statusText ? ' ' + req.statusText : ''}]`
        : '[pending]';
      return `${req.method} ${req.url} ${statusInfo}${req.isXHR ? ' (XHR)' : ''}`;
    });

    const summary = [
      `Found ${requests.length} network request(s)`,
      pageSize !== undefined
        ? `Showing page ${pageIdx || 0} (${paginatedRequests.length} requests)${hasMore ? ', more available' : ''}`
        : '',
      '',
      'Network Requests:',
      ...formattedRequests,
      '',
      'NOTE: Current BiDi MVP network monitoring has limitations. Some request details may not be available.',
      'Use get_network_request to get more details about a specific request.',
    ]
      .filter(Boolean)
      .join('\n');

    return successResponse(summary);
  } catch (error) {
    return errorResponse(
      `Failed to list network requests: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleGetNetworkRequest(args: unknown): Promise<McpToolResponse> {
  try {
    const { url } = args as { url: string };

    if (!url || typeof url !== 'string') {
      throw new Error('url parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const requests = await firefox.getNetworkRequests();
    const request = requests.find((req) => req.url === url);

    if (!request) {
      return errorResponse(
        `No network request found with URL: ${url}\n\n` +
          `Available URLs:\n${requests.map((r) => `- ${r.url}`).join('\n')}`
      );
    }

    // Format request details
    const details = [
      `Network Request Details:`,
      `URL: ${request.url}`,
      `Method: ${request.method}`,
      request.status !== undefined ? `Status: ${request.status}` : '',
      request.statusText !== undefined ? `Status Text: ${request.statusText}` : '',
      request.timestamp !== undefined
        ? `Timestamp: ${new Date(request.timestamp).toISOString()}`
        : '',
      request.resourceType !== undefined ? `Resource Type: ${request.resourceType}` : '',
      request.isXHR !== undefined ? `Is XHR: ${request.isXHR}` : '',
      '',
      'NOTE: Current BiDi MVP has limited support for detailed request/response data.',
      'Request and response headers/body may not be available in this implementation.',
    ]
      .filter(Boolean)
      .join('\n');

    return successResponse(details);
  } catch (error) {
    return errorResponse(
      `Failed to get network request: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleStartNetworkMonitoring(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    await firefox.startNetworkMonitoring();
    return successResponse(
      'Network monitoring started for the current page.\n\n' +
        'All network requests will now be recorded until monitoring is stopped or page is navigated.\n' +
        'Use list_network_requests to see collected requests.'
    );
  } catch (error) {
    return errorResponse(
      `Failed to start network monitoring: ${error instanceof Error ? error.message : String(error)}\n\n` +
        'NOTE: Network monitoring may not be supported in all Firefox versions or configurations.'
    );
  }
}

export async function handleStopNetworkMonitoring(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    await firefox.stopNetworkMonitoring();
    firefox.clearNetworkRequests();
    return successResponse('Network monitoring stopped and all collected request data cleared.');
  } catch (error) {
    return errorResponse(
      `Failed to stop network monitoring: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
