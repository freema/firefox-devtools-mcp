/**
 * Network monitoring tools for Firefox DevTools MCP
 * Provides network request inspection capabilities
 */

import {
  successResponse,
  errorResponse,
  jsonResponse,
  truncateHeaders,
  previewExcerpt,
} from '../utils/response-helpers.js';
import { saveOutput } from '../utils/save-output.js';
import { defineModule } from './module.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions
export const listNetworkRequestsTool = {
  name: 'list_network_requests',
  description: 'List network requests. Returns IDs for get_network_request.',
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Max requests (default: 50)',
      },
      sinceMs: {
        type: 'number',
        description: 'Only last N ms',
      },
      urlContains: {
        type: 'string',
        description: 'URL filter (case-insensitive)',
      },
      method: {
        type: 'string',
        description: 'HTTP method filter',
      },
      status: {
        type: 'number',
        description: 'Exact status code',
      },
      statusMin: {
        type: 'number',
        description: 'Min status code',
      },
      statusMax: {
        type: 'number',
        description: 'Max status code',
      },
      isXHR: {
        type: 'boolean',
        description: 'XHR/fetch only',
      },
      resourceType: {
        type: 'string',
        description: 'Resource type filter',
      },
      sortBy: {
        type: 'string',
        enum: ['timestamp', 'duration', 'status'],
        description: 'Sort field (default: timestamp)',
      },
      detail: {
        type: 'string',
        enum: ['summary', 'min', 'full'],
        description: 'Detail level (default: summary)',
      },
      format: {
        type: 'string',
        enum: ['text', 'json'],
        description: 'Output format (default: text)',
      },
      saveTo: {
        type: ['boolean', 'string'],
        description:
          'Save matching requests to a file as JSON instead of returning them inline. Saves full untruncated headers by default; pass detail=summary or min for a lean form, or an explicit limit to cap how many are saved (default: all matching). Pass a file path, an existing directory (generated file inside), or true (generated file under ~/.firefox-devtools-mcp/output/). Relative paths resolve against the current working directory.',
      },
      preview: {
        type: 'number',
        description:
          'Number of characters of the saved output to return inline as a preview when saveTo is used. Omit for no preview.',
      },
    },
  },
};

export const getNetworkRequestTool = {
  name: 'get_network_request',
  description: 'Get request details by ID. URL lookup as fallback.',
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'Request ID from list_network_requests',
      },
      url: {
        type: 'string',
        description: 'URL fallback (may match multiple)',
      },
      format: {
        type: 'string',
        enum: ['text', 'json'],
        description: 'Output format (default: text)',
      },
      saveTo: {
        type: ['boolean', 'string'],
        description:
          'Save the request details with full untruncated headers to a file as JSON instead of returning them inline. Pass a file path, an existing directory (generated file inside), or true (generated file under ~/.firefox-devtools-mcp/output/). Relative paths resolve against the current working directory.',
      },
      preview: {
        type: 'number',
        description:
          'Number of characters of the saved output to return inline as a preview when saveTo is used. Omit for no preview.',
      },
    },
  },
};

// Tool handlers
export async function handleListNetworkRequests(args: unknown): Promise<McpToolResponse> {
  try {
    const {
      limit,
      sinceMs,
      urlContains,
      method,
      status,
      statusMin,
      statusMax,
      isXHR,
      resourceType,
      sortBy = 'timestamp',
      detail,
      format = 'text',
      saveTo,
      preview,
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
      saveTo?: boolean | string;
      preview?: number;
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

    if (saveTo) {
      // Full untruncated headers by default on save; an explicit summary/min
      // detail selects a lean form. An explicit limit selects the top-N by the
      // current sort; otherwise all matching requests are saved.
      const selected = limit !== undefined ? requests.slice(0, limit) : requests;
      const fileDetail = detail ?? 'full';
      const fileBody = JSON.stringify(
        {
          total: requests.length,
          saved: selected.length,
          detail: fileDetail,
          requests: selected.map((req) =>
            fileDetail === 'full'
              ? {
                  id: req.id,
                  url: req.url,
                  method: req.method,
                  status: req.status ?? null,
                  statusText: req.statusText ?? null,
                  resourceType: req.resourceType ?? null,
                  isXHR: req.isXHR ?? false,
                  timestamp: req.timestamp ?? null,
                  timings: req.timings ?? null,
                  requestHeaders: req.requestHeaders ?? null,
                  responseHeaders: req.responseHeaders ?? null,
                }
              : {
                  id: req.id,
                  url: req.url,
                  method: req.method,
                  status: req.status ?? null,
                  statusText: req.statusText ?? null,
                  resourceType: req.resourceType ?? null,
                  isXHR: req.isXHR ?? false,
                  duration: req.timings?.duration ?? null,
                }
          ),
        },
        null,
        2
      );
      const saved = await saveOutput(
        fileBody,
        saveTo === true ? undefined : saveTo,
        'network-requests'
      );
      let output = `Network requests saved to: ${saved.path} (${selected.length} of ${requests.length} matching, ${(saved.bytes / 1024).toFixed(1)}KB)`;
      const excerpt = previewExcerpt(fileBody, preview);
      if (excerpt) {
        output += '\nPreview:\n```json\n' + excerpt + '\n```';
      }
      return successResponse(output);
    }

    // Apply limit
    const effectiveLimit = limit ?? 50;
    const effectiveDetail = detail ?? 'summary';
    const limitedRequests = requests.slice(0, effectiveLimit);
    const hasMore = requests.length > effectiveLimit;

    // Format output based on detail level and format
    if (format === 'json') {
      // JSON format - return structured data based on detail level
      const responseData: any = {
        total: requests.length,
        showing: limitedRequests.length,
        hasMore,
        requests: [],
      };

      if (effectiveDetail === 'summary' || effectiveDetail === 'min') {
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
        // Full detail - apply header truncation to prevent token overflow
        responseData.requests = limitedRequests.map((req) => ({
          id: req.id,
          url: req.url,
          method: req.method,
          status: req.status,
          statusText: req.statusText,
          resourceType: req.resourceType,
          isXHR: req.isXHR,
          timings: req.timings || null,
          requestHeaders: truncateHeaders(req.requestHeaders),
          responseHeaders: truncateHeaders(req.responseHeaders),
        }));
      }

      return jsonResponse(responseData);
    }

    // Text format (default)
    if (effectiveDetail === 'summary') {
      const formattedRequests = limitedRequests.map((req) => {
        const statusInfo = req.status
          ? `[${req.status}${req.statusText ? ' ' + req.statusText : ''}]`
          : '[pending]';
        return `${req.id} | ${req.method} ${req.url} ${statusInfo}${req.isXHR ? ' (XHR)' : ''}`;
      });

      const header = `[network] ${requests.length} requests${hasMore ? ` (limit ${effectiveLimit})` : ''}\n`;
      return successResponse(header + formattedRequests.join('\n'));
    } else if (effectiveDetail === 'min') {
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
        `[network] ${requests.length} requests${hasMore ? ` (limit ${effectiveLimit})` : ''}\n` +
          JSON.stringify(minData, null, 2)
      );
    } else {
      // Full JSON including headers - apply truncation to prevent token overflow
      const fullData = limitedRequests.map((req) => ({
        id: req.id,
        url: req.url,
        method: req.method,
        status: req.status,
        statusText: req.statusText,
        resourceType: req.resourceType,
        isXHR: req.isXHR,
        timings: req.timings || null,
        requestHeaders: truncateHeaders(req.requestHeaders),
        responseHeaders: truncateHeaders(req.responseHeaders),
      }));

      return successResponse(
        `[network] ${requests.length} requests${hasMore ? ` (limit ${effectiveLimit})` : ''}\n` +
          JSON.stringify(fullData, null, 2)
      );
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function handleGetNetworkRequest(args: unknown): Promise<McpToolResponse> {
  try {
    const { id, url, format, saveTo, preview } = args as {
      id?: string;
      url?: string;
      format?: 'text' | 'json';
      saveTo?: boolean | string;
      preview?: number;
    };

    if (!id && !url) {
      return errorResponse('id or url required');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const requests = await firefox.getNetworkRequests();
    let request = null;

    // Primary path: lookup by ID
    if (id) {
      request = requests.find((req) => req.id === id);
      if (!request) {
        return errorResponse(`ID ${id} not found`);
      }
    } else if (url) {
      // Fallback: lookup by URL (with collision detection)
      const matches = requests.filter((req) => req.url === url);

      if (matches.length === 0) {
        return errorResponse(`URL not found: ${url}`);
      }

      if (matches.length > 1) {
        const ids = matches.map((req) => req.id).join(', ');
        return errorResponse(`Multiple matches, use id: ${ids}`);
      }

      request = matches[0];
    }

    if (!request) {
      return errorResponse('Request not found');
    }

    const fullDetails = {
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

    if (saveTo) {
      const fileBody = JSON.stringify(fullDetails, null, 2);
      const saved = await saveOutput(
        fileBody,
        saveTo === true ? undefined : saveTo,
        'network-request'
      );
      let output = `Request ${request.id} saved to: ${saved.path} (${(saved.bytes / 1024).toFixed(1)}KB)`;
      const excerpt = previewExcerpt(fileBody, preview);
      if (excerpt) {
        output += '\nPreview:\n```json\n' + excerpt + '\n```';
      }
      return successResponse(output);
    }

    // Apply header truncation to prevent token overflow
    const details = {
      ...fullDetails,
      requestHeaders: truncateHeaders(request.requestHeaders),
      responseHeaders: truncateHeaders(request.responseHeaders),
    };

    if (format === 'json') {
      return jsonResponse(details);
    }

    return successResponse(JSON.stringify(details, null, 2));
  } catch (error) {
    return errorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

export const module = defineModule({
  name: 'network',
  description: 'List and inspect network requests.',
  tools: [
    [listNetworkRequestsTool, handleListNetworkRequests],
    [getNetworkRequestTool, handleGetNetworkRequest],
  ],
});
