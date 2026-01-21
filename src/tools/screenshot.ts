/**
 * Screenshot tools for visual capture
 */

import { successResponse, errorResponse, TOKEN_LIMITS } from '../utils/response-helpers.js';
import { handleUidError } from '../utils/uid-helpers.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions
export const screenshotPageTool = {
  name: 'screenshot_page',
  description: 'Capture page screenshot as base64 PNG.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const screenshotByUidTool = {
  name: 'screenshot_by_uid',
  description: 'Capture element screenshot by UID as base64 PNG.',
  inputSchema: {
    type: 'object',
    properties: {
      uid: {
        type: 'string',
        description: 'Element UID from snapshot',
      },
    },
    required: ['uid'],
  },
};

/**
 * Build screenshot response with size safeguards.
 */
function buildScreenshotResponse(base64Png: string, label: string): McpToolResponse {
  const sizeKB = Math.round(base64Png.length / 1024);

  // Check if screenshot exceeds size limit
  if (base64Png.length > TOKEN_LIMITS.MAX_SCREENSHOT_CHARS) {
    const truncatedData = base64Png.slice(0, TOKEN_LIMITS.MAX_SCREENSHOT_CHARS);
    return successResponse(`📸 ${label} (${sizeKB}KB) [truncated]\n${truncatedData}`);
  }

  // Add warning for large screenshots
  const warn = base64Png.length > TOKEN_LIMITS.WARNING_THRESHOLD_CHARS ? ' [large]' : '';
  return successResponse(`📸 ${label} (${sizeKB}KB)${warn}\n${base64Png}`);
}

// Handlers
export async function handleScreenshotPage(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const base64Png = await firefox.takeScreenshotPage();

    if (!base64Png || typeof base64Png !== 'string') {
      throw new Error('Invalid screenshot data');
    }

    return buildScreenshotResponse(base64Png, 'page');
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleScreenshotByUid(args: unknown): Promise<McpToolResponse> {
  try {
    const { uid } = args as { uid: string };

    if (!uid || typeof uid !== 'string') {
      throw new Error('uid required');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      const base64Png = await firefox.takeScreenshotByUid(uid);

      if (!base64Png || typeof base64Png !== 'string') {
        throw new Error('Invalid screenshot data');
      }

      return buildScreenshotResponse(base64Png, uid);
    } catch (error) {
      throw handleUidError(error as Error, uid);
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}
