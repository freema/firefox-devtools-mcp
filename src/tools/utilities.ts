/**
 * Page utility tools (dialogs, history, viewport)
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions - Dialogs
export const acceptDialogTool = {
  name: 'accept_dialog',
  description:
    'Accept the active browser dialog (alert/confirm/prompt). For prompts, you may provide promptText. Returns an error if no dialog is open.',
  inputSchema: {
    type: 'object',
    properties: {
      promptText: {
        type: 'string',
        description: 'Text to enter in a prompt dialog (optional, only for prompt dialogs)',
      },
    },
  },
};

export const dismissDialogTool = {
  name: 'dismiss_dialog',
  description:
    'Dismiss the active browser dialog (alert/confirm/prompt). Returns an error if no dialog is open.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

// Tool definitions - History
export const navigateHistoryTool = {
  name: 'navigate_history',
  description:
    "Navigate the selected tab's history back or forward. NOTE: After navigation, UIDs from previous snapshots are stale—take a new snapshot before UID-based actions.",
  inputSchema: {
    type: 'object',
    properties: {
      direction: {
        type: 'string',
        enum: ['back', 'forward'],
        description: 'Direction to navigate in history',
      },
    },
    required: ['direction'],
  },
};

// Tool definitions - Viewport
export const setViewportSizeTool = {
  name: 'set_viewport_size',
  description:
    'Set the browser viewport size (width x height in pixels). In some modes (e.g., headless), the actual size may vary slightly.',
  inputSchema: {
    type: 'object',
    properties: {
      width: {
        type: 'number',
        description: 'Viewport width in pixels',
      },
      height: {
        type: 'number',
        description: 'Viewport height in pixels',
      },
    },
    required: ['width', 'height'],
  },
};

// Handlers - Dialogs
export async function handleAcceptDialog(args: unknown): Promise<McpToolResponse> {
  try {
    const { promptText } = (args as { promptText?: string }) || {};

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      await firefox.acceptDialog(promptText);
      let message = '✅ Dialog accepted';
      if (promptText) {
        message += ` with text: "${promptText}"`;
      }
      return successResponse(message);
    } catch (error) {
      const errorMsg = (error as Error).message;

      // Friendly error for no active dialog
      if (errorMsg.includes('no such alert') || errorMsg.includes('No dialog')) {
        throw new Error(
          'No active dialog found.\n\n' +
            'Dialogs must be accepted shortly after they appear. ' +
            'Make sure a dialog is currently visible on the page.'
        );
      }

      throw error;
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleDismissDialog(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      await firefox.dismissDialog();
      return successResponse('✅ Dialog dismissed/cancelled');
    } catch (error) {
      const errorMsg = (error as Error).message;

      // Friendly error for no active dialog
      if (errorMsg.includes('no such alert') || errorMsg.includes('No dialog')) {
        throw new Error(
          'No active dialog found.\n\n' +
            'Dialogs must be dismissed shortly after they appear. ' +
            'Make sure a dialog is currently visible on the page.'
        );
      }

      throw error;
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}

// Handlers - History
export async function handleNavigateHistory(args: unknown): Promise<McpToolResponse> {
  try {
    const { direction } = args as { direction: 'back' | 'forward' };

    if (!direction || (direction !== 'back' && direction !== 'forward')) {
      throw new Error('direction parameter is required and must be "back" or "forward"');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    if (direction === 'back') {
      await firefox.navigateBack();
    } else {
      await firefox.navigateForward();
    }

    return successResponse(
      `✅ Navigated ${direction} in history\n\n` +
        '⚠️  UIDs from previous snapshots are now stale. ' +
        'Call take_snapshot before using UID-based actions.'
    );
  } catch (error) {
    return errorResponse(
      new Error(
        `Failed to navigate ${(args as { direction: string }).direction || 'in history'}: ${(error as Error).message}\n\n` +
          'The page may not have history in this direction available.'
      )
    );
  }
}

// Handlers - Viewport
export async function handleSetViewportSize(args: unknown): Promise<McpToolResponse> {
  try {
    const { width, height } = args as { width: number; height: number };

    if (typeof width !== 'number' || width <= 0) {
      throw new Error('width parameter is required and must be a positive number');
    }

    if (typeof height !== 'number' || height <= 0) {
      throw new Error('height parameter is required and must be a positive number');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    await firefox.setViewportSize(width, height);

    return successResponse(
      `✅ Viewport size set to ${width}x${height} pixels\n\n` +
        'NOTE: Actual viewport may differ slightly in some browser modes (e.g., headless).'
    );
  } catch (error) {
    return errorResponse(
      new Error(
        `Failed to set viewport size: ${(error as Error).message}\n\n` +
          'Some browser configurations may not support precise viewport sizing.'
      )
    );
  }
}
