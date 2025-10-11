/**
 * Screenshot tools
 * Full implementation in task 07
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

export const takeScreenshotTool = {
  name: 'take_screenshot',
  description: 'Take a screenshot of the page or element',
  inputSchema: {
    type: 'object',
    properties: {
      fullPage: {
        type: 'boolean',
        description: 'If true, takes a screenshot of the full page',
      },
      format: {
        type: 'string',
        enum: ['png', 'jpeg', 'webp'],
        description: 'Screenshot format (default: png)',
      },
      quality: {
        type: 'number',
        description: 'Compression quality for JPEG and WebP formats (0-100)',
      },
      uid: {
        type: 'string',
        description:
          'The uid of an element on the page from the page content snapshot. If omitted takes a page screenshot.',
      },
      filePath: {
        type: 'string',
        description:
          'The absolute path, or a path relative to the current working directory, to save the screenshot to instead of attaching it to the response.',
      },
    },
  },
};

export const takeSnapshotTool = {
  name: 'take_snapshot',
  description: 'Take a text snapshot of the currently selected page with UIDs',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handleTakeScreenshot(args: unknown): Promise<McpToolResponse> {
  try {
    const { fullPage, format, quality, uid, filePath } = args as {
      fullPage?: boolean;
      format?: 'png' | 'jpeg' | 'webp';
      quality?: number;
      uid?: string;
      filePath?: string;
    };

    // Validate: uid and fullPage are mutually exclusive
    if (uid && fullPage) {
      throw new Error('Providing both "uid" and "fullPage" is not allowed.');
    }

    const { getContext } = await import('../index.js');
    const context = await getContext();

    const screenshotFormat = format || 'png';
    const isFullPage = fullPage || false;

    // Handle element screenshot if uid is provided
    let clip: { x: number; y: number; width: number; height: number } | undefined;

    if (uid) {
      // Get element bounding box via evaluate
      const clipCode = `
        (function() {
          // Find element by uid (from snapshot)
          const uidAttr = 'data-mcp-uid';
          const element = document.querySelector('[' + uidAttr + '="${uid}"]');
          if (!element) {
            throw new Error('Element with uid "${uid}" not found');
          }

          const rect = element.getBoundingClientRect();
          const devicePixelRatio = window.devicePixelRatio || 1;

          return JSON.stringify({
            x: Math.round(rect.left * devicePixelRatio),
            y: Math.round(rect.top * devicePixelRatio),
            width: Math.round(rect.width * devicePixelRatio),
            height: Math.round(rect.height * devicePixelRatio)
          });
        })();
      `;

      try {
        const result = await context.evaluateScript<string>(clipCode);
        clip = JSON.parse(result) as { x: number; y: number; width: number; height: number };
      } catch (error) {
        throw new Error(`Failed to get element bounds for uid "${uid}": ${String(error)}`);
      }
    }

    // Take screenshot
    const screenshotOptions: {
      format: 'png' | 'jpeg' | 'webp';
      fullPage: boolean;
      quality?: number;
      clip?: { x: number; y: number; width: number; height: number };
    } = {
      format: screenshotFormat,
      fullPage: isFullPage,
    };

    if (quality !== undefined) {
      screenshotOptions.quality = quality;
    }

    if (clip !== undefined) {
      screenshotOptions.clip = clip;
    }

    const buffer = await context.takeScreenshot(screenshotOptions);

    // Build response message
    let message = '';
    if (uid) {
      message = `Took a screenshot of node with uid "${uid}".\n`;
    } else if (isFullPage) {
      message = 'Took a screenshot of the full current page.\n';
    } else {
      message = "Took a screenshot of the current page's viewport.\n";
    }

    // Handle file saving
    if (filePath) {
      const { filename } = await context.saveFile(buffer, filePath);
      message += `Saved screenshot to ${filename}.`;
      return successResponse(message);
    }

    // Save to temporary file for large screenshots (>2MB)
    if (buffer.length >= 2_000_000) {
      const { filename } = await context.saveTemporaryFile(
        buffer,
        `image/${screenshotFormat}` as 'image/png' | 'image/jpeg' | 'image/webp'
      );
      message += `Saved screenshot to ${filename}.`;
      return successResponse(message);
    }

    // Return base64-encoded image for small screenshots
    const base64Image = buffer.toString('base64');
    message += `Screenshot size: ${(buffer.length / 1024).toFixed(2)} KB\n`;
    message += `Format: ${screenshotFormat}\n`;
    message += `\nBase64 data (first 100 chars): ${base64Image.substring(0, 100)}...`;

    return successResponse(message);
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleTakeSnapshot(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getContext } = await import('../index.js');
    const context = await getContext();

    // Get page content via evaluate and tag elements with UIDs
    const snapshotCode = `
      (function() {
        // Build a simple DOM tree snapshot with UIDs
        // Also add data-mcp-uid attributes for screenshot support
        let uidCounter = 0;
        const uidMap = new WeakMap();
        const uidAttr = 'data-mcp-uid';

        function getUid(element) {
          if (!uidMap.has(element)) {
            const uid = uidCounter++;
            uidMap.set(element, uid);
            // Set attribute for element screenshot support
            element.setAttribute(uidAttr, String(uid));
          }
          return uidMap.get(element);
        }

        function buildSnapshot(element, depth = 0) {
          if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return null;
          }

          const uid = getUid(element);
          const tagName = element.tagName.toLowerCase();
          const id = element.id ? ' id="' + element.id + '"' : '';
          const className = element.className && typeof element.className === 'string'
            ? ' class="' + element.className + '"'
            : '';

          // Get text content (trimmed, first 50 chars)
          const textContent = element.textContent || '';
          const trimmedText = textContent.trim().substring(0, 50);
          const text = trimmedText ? ' text="' + trimmedText.replace(/"/g, '\\\\"') + '"' : '';

          const indent = '  '.repeat(depth);
          let result = indent + '<' + tagName + id + className + ' uid=' + uid + text + '>\\n';

          // Recursively process children (limit to first 10 children to avoid huge output)
          const children = Array.from(element.children).slice(0, 10);
          for (const child of children) {
            const childSnapshot = buildSnapshot(child, depth + 1);
            if (childSnapshot) {
              result += childSnapshot;
            }
          }

          return result;
        }

        return buildSnapshot(document.documentElement);
      })();
    `;

    const snapshot = await context.evaluateScript<string>(snapshotCode);

    if (!snapshot || typeof snapshot !== 'string') {
      return successResponse('📄 Page snapshot:\n\n(empty or unavailable)');
    }

    return successResponse(
      `📄 Page snapshot:\n\n${snapshot}\n\n` +
        `Note: UIDs are assigned to each element and can be used with take_screenshot's uid parameter.\n` +
        `This is a simplified DOM snapshot (not accessibility tree like Chrome MCP).`
    );
  } catch (error) {
    return errorResponse(error as Error);
  }
}
