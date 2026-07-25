/**
 * Privileged context management tools for MCP
 * Requires MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1
 */

import {
  successResponse,
  errorResponse,
  truncateText,
  TOKEN_LIMITS,
} from '../utils/response-helpers.js';
import { validateFunction } from '../utils/js-validation.js';
import { remoteValueToNative } from '../utils/remote-value.js';
import { saveOutput } from '../utils/save-output.js';
import { defineModule } from './module.js';
// list_extensions lives with the other extension tools in webextension.ts, but
// it needs parent access (AddonManager), so it is registered here under the
// privileged module rather than the unprivileged webextension module.
import { listExtensionsTool, handleListExtensions } from './webextension.js';
import type { McpToolResponse } from '../types/common.js';

export const listPrivilegedContextsTool = {
  name: 'list_privileged_contexts',
  description:
    'List privileged (privileged) browsing contexts. Requires MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 env var. Use restart_firefox with env parameter to enable.',
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const selectPrivilegedContextTool = {
  name: 'select_privileged_context',
  description:
    'Select a privileged browsing context by ID and set WebDriver Classic context to "chrome" . Requires MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 env var.',
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      contextId: {
        type: 'string',
        description: 'Privileged browsing context ID from list_privileged_contexts',
      },
    },
    required: ['contextId'],
  },
};

export const evaluatePrivilegedScriptTool = {
  name: 'evaluate_privileged_script',
  description:
    'Execute JS function in the current privileged context. Requires MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 env var. Use select_privileged_context first to target a chrome context.',
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      function: {
        type: 'string',
        description: 'JS function string, e.g. () => Services.prefs.getBoolPref("foo")',
      },
      saveTo: {
        type: ['boolean', 'string'],
        description:
          'Save the result to a file as JSON instead of returning it inline. Pass a file path, an existing directory (generated file inside), or true (generated file under ~/.firefox-devtools-mcp/output/). Relative paths resolve against the current working directory.',
      },
      preview: {
        type: 'number',
        description:
          'Number of characters of the saved result to return inline as a preview when saveTo is used. Omit for no preview.',
      },
    },
    required: ['function'],
  },
};

function formatContextList(contexts: any[]): string {
  if (contexts.length === 0) {
    return 'No privileged contexts found';
  }

  const lines: string[] = [`${contexts.length} privileged contexts`];
  for (const ctx of contexts) {
    const id = ctx.context;
    const url = ctx.url || '(no url)';
    const children = ctx.children ? ` [${ctx.children.length} children]` : '';
    lines.push(`  ${id}: ${url}${children}`);
  }
  return lines.join('\n');
}

export async function handleListPrivilegedContexts(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const result = await firefox.sendBiDiCommand('browsingContext.getTree', {
      'moz:scope': 'chrome',
    });

    const contexts = result.contexts || [];

    return successResponse(formatContextList(contexts));
  } catch (error) {
    if (error instanceof Error && error.message.includes('UnsupportedOperationError')) {
      return errorResponse(
        new Error(
          'Privileged context access not enabled. Set MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 environment variable and restart Firefox.'
        )
      );
    }
    return errorResponse(error as Error);
  }
}

export async function handleSelectPrivilegedContext(args: unknown): Promise<McpToolResponse> {
  try {
    const { contextId } = args as { contextId: string };

    if (!contextId || typeof contextId !== 'string') {
      throw new Error('contextId parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const driver = firefox.getDriver();
    await driver.switchTo().window(contextId);

    try {
      await driver.setContext('chrome');
    } catch {
      return errorResponse(
        new Error(
          `Switched to context ${contextId} but failed to set Marionette privileged context. Your Firefox build may not support privileged context or MOZ_REMOTE_ALLOW_SYSTEM_ACCESS is not set.`
        )
      );
    }

    // Update tracked context so helper tools (set_firefox_prefs, list_extensions)
    // restore to this context instead of the old content context.
    firefox.setCurrentContextId(contextId);

    return successResponse(
      `Switched to privileged context: ${contextId} (Marionette context set to privileged)`
    );
  } catch (error) {
    return errorResponse(error as Error);
  }
}

const EvaluateResultType = {
  Exception: 'exception',
  Success: 'success',
};

export async function handleEvaluatePrivilegedScript(args: unknown): Promise<McpToolResponse> {
  try {
    const {
      function: fnString,
      saveTo,
      preview,
    } = args as {
      function: string;
      saveTo?: boolean | string;
      preview?: number;
    };

    validateFunction(fnString);

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const result = await firefox.sendBiDiCommand('script.callFunction', {
      functionDeclaration: fnString,
      awaitPromise: true,
      arguments: [],
      target: { context: firefox.getCurrentContextId() },
    });

    if (result.type === EvaluateResultType.Success) {
      // JSON.stringify returns undefined for an undefined script result
      const json = JSON.stringify(remoteValueToNative(result.result), null, 2) ?? 'undefined';

      if (saveTo) {
        const saved = await saveOutput(
          json,
          saveTo === true ? undefined : saveTo,
          'evaluate-privileged'
        );
        let output = `Script ran in chrome context. Result saved to: ${saved.path} (${(saved.bytes / 1024).toFixed(1)}KB)`;
        if (preview !== undefined && preview > 0) {
          const previewChars = Math.min(Math.max(preview, 50), TOKEN_LIMITS.MAX_RESPONSE_CHARS);
          output += '\nPreview:\n```json\n' + truncateText(json, previewChars) + '\n```';
        }
        return successResponse(output);
      }

      return successResponse(
        'Script ran in chrome context and returned:\n```json\n' + json + '\n```'
      );
    } else if (result.type === EvaluateResultType.Exception) {
      const exceptionDetails = result.exceptionDetails;
      return errorResponse(
        new Error(
          `Script execution failed: ${exceptionDetails.text}\n\n` +
            '```json\n' +
            JSON.stringify(remoteValueToNative(exceptionDetails.exception), null, 2) +
            '\n```'
        )
      );
    } else {
      return errorResponse(`Unexpected script.callFunction result type: ${result.type}`);
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export const module = defineModule({
  name: 'privileged',
  description: 'Access privileged ("chrome") contexts and list extensions.',
  privileged: true,
  tools: [
    [listPrivilegedContextsTool, handleListPrivilegedContexts],
    [selectPrivilegedContextTool, handleSelectPrivilegedContext],
    [evaluatePrivilegedScriptTool, handleEvaluatePrivilegedScript],
    [listExtensionsTool, handleListExtensions],
  ],
});
