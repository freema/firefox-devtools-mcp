/**
 * Screenshot tools for visual capture
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions
export const screenshotPageTool = {
  name: 'screenshot_page',
  description:
    'Capture a PNG screenshot of the current page and return it as a base64 string (without data: prefix). TIP: Use for visual verification rather than structural inspection.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const screenshotByUidTool = {
  name: 'screenshot_by_uid',
  description:
    'Capture a PNG screenshot of a specific element by UID and return it as a base64 string (without data: prefix). TIP: Take a fresh snapshot if the UID is stale.',
  inputSchema: {
    type: 'object',
    properties: {
      uid: {
        type: 'string',
        description: 'The UID of the element to screenshot',
      },
    },
    required: ['uid'],
  },
};

// Handlers
export async function handleScreenshotPage(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const base64Png = await firefox.takeScreenshotPage();

    // Validate base64 format
    if (!base64Png || typeof base64Png !== 'string') {
      throw new Error('Failed to capture screenshot: invalid data returned');
    }

    return successResponse(
      `📸 Page screenshot captured (${Math.round(base64Png.length / 1024)}KB)\n\n` +
        `Base64 PNG data:\n${base64Png}`
    );
  } catch (error) {
    return errorResponse(
      new Error(
        `Failed to capture page screenshot: ${(error as Error).message}\n\n` +
          'The page may not be fully loaded or accessible.'
      )
    );
  }
}

export async function handleScreenshotByUid(args: unknown): Promise<McpToolResponse> {
  try {
    const { uid } = args as { uid: string };

    if (!uid || typeof uid !== 'string') {
      throw new Error('uid parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      const base64Png = await firefox.takeScreenshotByUid(uid);

      // Validate base64 format
      if (!base64Png || typeof base64Png !== 'string') {
        throw new Error('Failed to capture screenshot: invalid data returned');
      }

      return successResponse(
        `📸 Element screenshot captured for UID "${uid}" (${Math.round(base64Png.length / 1024)}KB)\n\n` +
          `Base64 PNG data:\n${base64Png}`
      );
    } catch (error) {
      const errorMsg = (error as Error).message;

      // Friendly error for stale UIDs
      if (
        errorMsg.includes('stale') ||
        errorMsg.includes('Snapshot') ||
        errorMsg.includes('UID') ||
        errorMsg.includes('not found')
      ) {
        throw new Error(
          `UID "${uid}" is stale or invalid.\n\n` +
            'The page may have changed since the snapshot was taken.\n' +
            'Please call take_snapshot to get fresh UIDs and try again.'
        );
      }

      throw error;
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}
