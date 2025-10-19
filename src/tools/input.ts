/**
 * UID-based input interaction tools
 * Require valid UIDs from take_snapshot
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

/**
 * Transform UID resolution errors into friendly messages
 */
function handleUidError(error: Error, uid: string): Error {
  const errorMsg = error.message;

  if (
    errorMsg.includes('stale') ||
    errorMsg.includes('Snapshot') ||
    errorMsg.includes('UID') ||
    errorMsg.includes('not found')
  ) {
    return new Error(
      `UID "${uid}" is stale or invalid.\n\n` +
        'The page may have changed since the snapshot was taken.\n' +
        'Please call take_snapshot to get fresh UIDs and try again.'
    );
  }

  return error;
}

// Tool definitions
export const clickByUidTool = {
  name: 'click_by_uid',
  description:
    'Click an element identified by its UID. Supports double-click via dblClick=true. TIP: Take a fresh snapshot if the UID becomes stale.',
  inputSchema: {
    type: 'object',
    properties: {
      uid: {
        type: 'string',
        description: 'The UID of the element to click',
      },
      dblClick: {
        type: 'boolean',
        description: 'If true, performs a double-click (default: false)',
      },
    },
    required: ['uid'],
  },
};

export const hoverByUidTool = {
  name: 'hover_by_uid',
  description:
    'Hover over an element identified by its UID. TIP: Take a fresh snapshot if the UID becomes stale.',
  inputSchema: {
    type: 'object',
    properties: {
      uid: {
        type: 'string',
        description: 'The UID of the element to hover over',
      },
    },
    required: ['uid'],
  },
};

export const fillByUidTool = {
  name: 'fill_by_uid',
  description:
    'Fill a text input or textarea identified by its UID. Keep values short and safe. TIP: Take a fresh snapshot if the UID becomes stale.',
  inputSchema: {
    type: 'object',
    properties: {
      uid: {
        type: 'string',
        description: 'The UID of the input element',
      },
      value: {
        type: 'string',
        description: 'The text value to fill into the input',
      },
    },
    required: ['uid', 'value'],
  },
};

export const dragByUidToUidTool = {
  name: 'drag_by_uid_to_uid',
  description:
    'Simulate HTML5 drag-and-drop from one UID to another using JS drag events. May not work with all custom libraries.',
  inputSchema: {
    type: 'object',
    properties: {
      fromUid: {
        type: 'string',
        description: 'The UID of the element to drag',
      },
      toUid: {
        type: 'string',
        description: 'The UID of the target element to drop onto',
      },
    },
    required: ['fromUid', 'toUid'],
  },
};

export const fillFormByUidTool = {
  name: 'fill_form_by_uid',
  description: 'Fill multiple form fields in one call using an array of {uid, value} pairs.',
  inputSchema: {
    type: 'object',
    properties: {
      elements: {
        type: 'array',
        description: 'Array of form field UIDs with their values',
        items: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'The UID of the form field',
            },
            value: {
              type: 'string',
              description: 'The value to fill',
            },
          },
          required: ['uid', 'value'],
        },
      },
    },
    required: ['elements'],
  },
};

export const uploadFileByUidTool = {
  name: 'upload_file_by_uid',
  description:
    'Upload a file into an <input type="file"> element identified by its UID. The file path must be accessible to the server.',
  inputSchema: {
    type: 'object',
    properties: {
      uid: {
        type: 'string',
        description: 'The UID of the file input element',
      },
      filePath: {
        type: 'string',
        description: 'Local filesystem path to the file to upload',
      },
    },
    required: ['uid', 'filePath'],
  },
};

// Handlers
export async function handleClickByUid(args: unknown): Promise<McpToolResponse> {
  try {
    const { uid, dblClick } = args as { uid: string; dblClick?: boolean };

    if (!uid || typeof uid !== 'string') {
      throw new Error('uid parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      await firefox.clickByUid(uid, dblClick);
      return successResponse(
        `✅ ${dblClick ? 'Double-clicked' : 'Clicked'} element with UID "${uid}"`
      );
    } catch (error) {
      throw handleUidError(error as Error, uid);
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleHoverByUid(args: unknown): Promise<McpToolResponse> {
  try {
    const { uid } = args as { uid: string };

    if (!uid || typeof uid !== 'string') {
      throw new Error('uid parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      await firefox.hoverByUid(uid);
      return successResponse(`✅ Hovered over element with UID "${uid}"`);
    } catch (error) {
      throw handleUidError(error as Error, uid);
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleFillByUid(args: unknown): Promise<McpToolResponse> {
  try {
    const { uid, value } = args as { uid: string; value: string };

    if (!uid || typeof uid !== 'string') {
      throw new Error('uid parameter is required and must be a string');
    }

    if (value === undefined || typeof value !== 'string') {
      throw new Error('value parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      await firefox.fillByUid(uid, value);
      return successResponse(
        `✅ Filled element with UID "${uid}"\nValue: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`
      );
    } catch (error) {
      throw handleUidError(error as Error, uid);
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleDragByUidToUid(args: unknown): Promise<McpToolResponse> {
  try {
    const { fromUid, toUid } = args as { fromUid: string; toUid: string };

    if (!fromUid || typeof fromUid !== 'string') {
      throw new Error('fromUid parameter is required and must be a string');
    }

    if (!toUid || typeof toUid !== 'string') {
      throw new Error('toUid parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      await firefox.dragByUidToUid(fromUid, toUid);
      return successResponse(`✅ Dragged element "${fromUid}" to "${toUid}"`);
    } catch (error) {
      // Check both UIDs for staleness
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('stale') || errorMsg.includes('Snapshot') || errorMsg.includes('UID')) {
        throw new Error(
          `One or both UIDs (from: "${fromUid}", to: "${toUid}") are stale or invalid.\n\n` +
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

export async function handleFillFormByUid(args: unknown): Promise<McpToolResponse> {
  try {
    const { elements } = args as { elements: Array<{ uid: string; value: string }> };

    if (!elements || !Array.isArray(elements) || elements.length === 0) {
      throw new Error('elements parameter is required and must be a non-empty array');
    }

    // Validate all elements
    for (const el of elements) {
      if (!el.uid || typeof el.uid !== 'string') {
        throw new Error(`Invalid element: uid is required and must be a string`);
      }
      if (el.value === undefined || typeof el.value !== 'string') {
        throw new Error(`Invalid element for uid "${el.uid}": value must be a string`);
      }
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      await firefox.fillFormByUid(elements);
      return successResponse(
        `✅ Filled ${elements.length} form field(s):\n` +
          elements
            .map(
              (el) =>
                `  - ${el.uid}: ${el.value.substring(0, 30)}${el.value.length > 30 ? '...' : ''}`
            )
            .join('\n')
      );
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('stale') || errorMsg.includes('Snapshot') || errorMsg.includes('UID')) {
        throw new Error(
          `One or more UIDs are stale or invalid.\n\n` +
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

export async function handleUploadFileByUid(args: unknown): Promise<McpToolResponse> {
  try {
    const { uid, filePath } = args as { uid: string; filePath: string };

    if (!uid || typeof uid !== 'string') {
      throw new Error('uid parameter is required and must be a string');
    }

    if (!filePath || typeof filePath !== 'string') {
      throw new Error('filePath parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      await firefox.uploadFileByUid(uid, filePath);
      return successResponse(`✅ Uploaded file to element with UID "${uid}"\nFile: ${filePath}`);
    } catch (error) {
      const errorMsg = (error as Error).message;

      // Check for UID staleness
      if (errorMsg.includes('stale') || errorMsg.includes('Snapshot') || errorMsg.includes('UID')) {
        throw handleUidError(error as Error, uid);
      }

      // Check for file input specific errors
      if (errorMsg.includes('not a file input') || errorMsg.includes('type="file"')) {
        throw new Error(
          `Element with UID "${uid}" is not an <input type="file"> element.\n\n` +
            'Please ensure the UID points to a file input element.'
        );
      }

      if (errorMsg.includes('hidden') || errorMsg.includes('not visible')) {
        throw new Error(
          `File input element with UID "${uid}" is hidden or not interactable.\n\n` +
            'Some file inputs are hidden and cannot be directly interacted with.'
        );
      }

      throw error;
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}
