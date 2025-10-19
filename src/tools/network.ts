/**
 * Network monitoring tools for Firefox DevTools MCP
 * Provides network request inspection capabilities
 */

import { successResponse, errorResponse, jsonResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions
export const listNetworkRequestsTool = {
  name: 'list_network_requests',
  description:
    'List recent network requests across all tabs. Network capture is always on. Use filters (limit, sinceMs, urlContains, method, status, resourceType) and detail (summary|min|full) to control output. Each entry includes a stable id for use with get_network_request.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of requests to return (default: 50)',
      },
      sinceMs: {
        type: 'number',
        description: 'Return only requests newer than N milliseconds ago',
      },
      urlContains: {
        type: 'string',
        description: 'Filter requests by URL substring (case-insensitive)',
      },
      method: {
        type: 'string',
        description: 'Filter by HTTP method (GET, POST, etc., case-insensitive)',
      },
      status: {
        type: 'number',
        description: 'Filter by exact HTTP status code',
      },
      statusMin: {
        type: 'number',
        description: 'Filter by minimum HTTP status code',
      },
      statusMax: {
        type: 'number',
        description: 'Filter by maximum HTTP status code',
      },
      isXHR: {
        type: 'boolean',
        description: 'Filter by XHR/fetch requests only',
      },
      resourceType: {
        type: 'string',
        description: 'Filter by resource type (case-insensitive)',
      },
      sortBy: {
        type: 'string',
        enum: ['timestamp', 'duration', 'status'],
        description: 'Sort requests by field (default: timestamp descending)',
      },
      detail: {
        type: 'string',
        enum: ['summary', 'min', 'full'],
        description:
          'Output detail level: summary (default), min (compact JSON), full (includes headers)',
      },
      format: {
        type: 'string',
        enum: ['text', 'json'],
        description: 'Output format: text (default, human-readable) or json (structured data)',
      },
    },
  },
};

export const getNetworkRequestTool = {
  name: 'get_network_request',
  description:
    'Get detailed information about a network request by id (recommended). URL lookup is available as a fallback but may match multiple requests.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'The request ID from list_network_requests (recommended)',
      },
      url: {
        type: 'string',
        description: 'The URL of the request (fallback, may match multiple requests)',
      },
      format: {
        type: 'string',
        enum: ['text', 'json'],
        description: 'Output format: text (default) or json (structured data)',
      },
    },
  },
};

// Tool handlers
export async function handleListNetworkRequests(args: unknown): Promise<McpToolResponse> {
  try {
    const {
      limit = 50,
      sinceMs,
      urlContains,
      method,
      status,
      statusMin,
      statusMax,
      isXHR,
      resourceType,
      sortBy = 'timestamp',
      detail = 'summary',
      format = 'text',
    } = (args as {
      limit?: number;
      sinceMs?: number;
      urlContains?: string;
      method?: string;
      status?: number;
      statusMin?: number;
      statusMax?: number;
      isXHR?: boolean;
      resourceType?: string;
      sortBy?: 'timestamp' | 'duration' | 'status';
      detail?: 'summary' | 'min' | 'full';
      format?: 'text' | 'json';
    }) || {};

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    let requests = await firefox.getNetworkRequests();

    // Apply time filter
    if (sinceMs !== undefined) {
      const cutoffTime = Date.now() - sinceMs;
      requests = requests.filter((req) => req.timestamp && req.timestamp >= cutoffTime);
    }

    // Apply filters
    if (urlContains) {
      const urlLower = urlContains.toLowerCase();
      requests = requests.filter((req) => req.url.toLowerCase().includes(urlLower));
    }

    if (method) {
      const methodUpper = method.toUpperCase();
      requests = requests.filter((req) => req.method.toUpperCase() === methodUpper);
    }

    if (status !== undefined) {
      requests = requests.filter((req) => req.status === status);
    }

    if (statusMin !== undefined) {
      requests = requests.filter((req) => req.status !== undefined && req.status >= statusMin);
    }

    if (statusMax !== undefined) {
      requests = requests.filter((req) => req.status !== undefined && req.status <= statusMax);
    }

    if (isXHR !== undefined) {
      requests = requests.filter((req) => req.isXHR === isXHR);
    }

    if (resourceType) {
      const typeLower = resourceType.toLowerCase();
      requests = requests.filter((req) => req.resourceType?.toLowerCase() === typeLower);
    }

    // Sort requests
    if (sortBy === 'timestamp') {
      requests.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (sortBy === 'duration') {
      requests.sort((a, b) => (b.timings?.duration || 0) - (a.timings?.duration || 0));
    } else if (sortBy === 'status') {
      requests.sort((a, b) => (a.status || 0) - (b.status || 0));
    }

    // Apply limit
    const limitedRequests = requests.slice(0, limit);
    const hasMore = requests.length > limit;

    // Format output based on detail level and format
    if (format === 'json') {
      // JSON format - return structured data based on detail level
      const responseData: any = {
        total: requests.length,
        showing: limitedRequests.length,
        hasMore,
        requests: [],
      };

      if (detail === 'summary' || detail === 'min') {
        responseData.requests = limitedRequests.map((req) => ({
          id: req.id,
          url: req.url,
          method: req.method,
          status: req.status,
          statusText: req.statusText,
          resourceType: req.resourceType,
          isXHR: req.isXHR,
          duration: req.timings?.duration,
        }));
      } else {
        // Full detail
        responseData.requests = limitedRequests.map((req) => ({
          id: req.id,
          url: req.url,
          method: req.method,
          status: req.status,
          statusText: req.statusText,
          resourceType: req.resourceType,
          isXHR: req.isXHR,
          timings: req.timings || null,
          requestHeaders: req.requestHeaders || null,
          responseHeaders: req.responseHeaders || null,
        }));
      }

      return jsonResponse(responseData);
    }

    // Text format (default)
    if (detail === 'summary') {
      const formattedRequests = limitedRequests.map((req) => {
        const statusInfo = req.status
          ? `[${req.status}${req.statusText ? ' ' + req.statusText : ''}]`
          : '[pending]';
        return `${req.id} | ${req.method} ${req.url} ${statusInfo}${req.isXHR ? ' (XHR)' : ''}`;
      });

      const summary = [
        `Found ${requests.length} network request(s)${hasMore ? ` (showing first ${limit})` : ''}`,
        '',
        'Network Requests:',
        ...formattedRequests,
        '',
        'TIP: Use the request ID (first column) with get_network_request for full details.',
      ].join('\n');

      return successResponse(summary);
    } else if (detail === 'min') {
      // Compact JSON
      const minData = limitedRequests.map((req) => ({
        id: req.id,
        url: req.url,
        method: req.method,
        status: req.status,
        statusText: req.statusText,
        resourceType: req.resourceType,
        isXHR: req.isXHR,
        duration: req.timings?.duration,
      }));

      return successResponse(
        `Found ${requests.length} requests${hasMore ? ` (showing first ${limit})` : ''}\n\n` +
          JSON.stringify(minData, null, 2)
      );
    } else {
      // Full JSON including headers
      const fullData = limitedRequests.map((req) => ({
        id: req.id,
        url: req.url,
        method: req.method,
        status: req.status,
        statusText: req.statusText,
        resourceType: req.resourceType,
        isXHR: req.isXHR,
        timings: req.timings || null,
        requestHeaders: req.requestHeaders || null,
        responseHeaders: req.responseHeaders || null,
      }));

      return successResponse(
        `Found ${requests.length} requests${hasMore ? ` (showing first ${limit})` : ''}\n\n` +
          JSON.stringify(fullData, null, 2)
      );
    }
  } catch (error) {
    return errorResponse(
      `Failed to list network requests: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleGetNetworkRequest(args: unknown): Promise<McpToolResponse> {
  try {
    const {
      id,
      url,
      format = 'text',
    } = args as { id?: string; url?: string; format?: 'text' | 'json' };

    if (!id && !url) {
      return errorResponse(
        'Either "id" or "url" parameter is required.\n\n' +
          'TIP: Call list_network_requests first and use the returned ID for reliable lookup.'
      );
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const requests = await firefox.getNetworkRequests();
    let request = null;

    // Primary path: lookup by ID
    if (id) {
      request = requests.find((req) => req.id === id);
      if (!request) {
        return errorResponse(
          `No network request found with ID: ${id}\n\n` +
            'TIP: The request may have been cleared. Call list_network_requests to see available requests.'
        );
      }
    } else if (url) {
      // Fallback: lookup by URL (with collision detection)
      const matches = requests.filter((req) => req.url === url);

      if (matches.length === 0) {
        return errorResponse(
          `No network request found with URL: ${url}\n\n` +
            'TIP: Use list_network_requests to see available requests.'
        );
      }

      if (matches.length > 1) {
        const matchInfo = matches
          .map((req) => `  - ID: ${req.id} | ${req.method} [${req.status || 'pending'}]`)
          .join('\n');
        return errorResponse(
          `Multiple requests (${matches.length}) found with URL: ${url}\n\n` +
            'Please use one of these IDs with the "id" parameter:\n' +
            matchInfo
        );
      }

      request = matches[0];
    }

    if (!request) {
      return errorResponse('Request not found');
    }

    // Format request details
    const details = {
      id: request.id,
      url: request.url,
      method: request.method,
      status: request.status ?? null,
      statusText: request.statusText ?? null,
      resourceType: request.resourceType ?? null,
      isXHR: request.isXHR ?? false,
      timestamp: request.timestamp ?? null,
      timings: request.timings ?? null,
      requestHeaders: request.requestHeaders ?? null,
      responseHeaders: request.responseHeaders ?? null,
    };

    if (format === 'json') {
      return jsonResponse(details);
    }

    return successResponse('Network Request Details:\n\n' + JSON.stringify(details, null, 2));
  } catch (error) {
    return errorResponse(
      `Failed to get network request: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
