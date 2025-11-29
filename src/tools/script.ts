/**
 * JavaScript evaluation tool (currently disabled - see docs/future-features.md)
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

export const evaluateScriptTool = {
  name: 'evaluate_script',
  description: 'Execute JS function in page. Prefer UID tools for interactions.',
  inputSchema: {
    type: 'object',
    properties: {
      function: {
        type: 'string',
        description: 'JS function string, e.g. () => document.title',
      },
      args: {
        type: 'array',
        description: 'UIDs to pass as function arguments',
        items: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Element UID from snapshot',
            },
          },
          required: ['uid'],
        },
      },
      timeout: {
        type: 'number',
        description: 'Timeout in ms (default: 5000)',
      },
    },
    required: ['function'],
  },
};

// Constants
const MAX_FUNCTION_SIZE = 16 * 1024; // 16 KB
const DEFAULT_TIMEOUT = 5000; // 5 seconds

/**
 * Validate function string format
 */
function validateFunction(fnString: string): void {
  if (!fnString || typeof fnString !== 'string') {
    throw new Error('function parameter is required and must be a string');
  }

  if (fnString.length > MAX_FUNCTION_SIZE) {
    throw new Error(
      `Function too large (${fnString.length} bytes, max ${MAX_FUNCTION_SIZE} bytes). ` +
        'This tool is not designed for massive scripts.'
    );
  }

  // Check if it looks like a function or arrow function
  const trimmed = fnString.trim();
  const isFunctionLike =
    trimmed.startsWith('function') ||
    trimmed.startsWith('async function') ||
    trimmed.startsWith('(') ||
    trimmed.startsWith('async (');

  if (!isFunctionLike) {
    throw new Error(
      `Invalid function format. Expected a function or arrow function, got: "${trimmed.substring(0, 50)}...".\n\n` +
        'Valid examples:\n' +
        '  () => document.title\n' +
        '  async () => { return await fetch("/api") }\n' +
        '  (el) => el.innerText\n' +
        '  function() { return window.location.href }'
    );
  }
}

export async function handleEvaluateScript(args: unknown): Promise<McpToolResponse> {
  try {
    const {
      function: fnString,
      args: fnArgs,
      timeout,
    } = args as {
      function: string;
      args?: Array<{ uid: string }>;
      timeout?: number;
    };

    // Validate function
    validateFunction(fnString);

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();
    const driver = firefox.getDriver();

    if (!driver) {
      throw new Error('WebDriver not available');
    }

    const scriptTimeout = timeout ?? DEFAULT_TIMEOUT;

    // Prepare arguments: resolve UIDs to WebElements if provided
    const resolvedArgs: unknown[] = [];
    if (fnArgs && fnArgs.length > 0) {
      for (const arg of fnArgs) {
        try {
          const element = await firefox.resolveUidToElement(arg.uid);
          resolvedArgs.push(element);
        } catch (error) {
          const errorMsg = (error as Error).message;

          // Provide friendly error for stale UIDs
          if (
            errorMsg.includes('stale') ||
            errorMsg.includes('Snapshot') ||
            errorMsg.includes('UID')
          ) {
            throw new Error(
              `UID "${arg.uid}" is invalid or from an old snapshot.\n\n` +
                'The page may have changed since the snapshot was taken.\n' +
                'Please call take_snapshot to get fresh UIDs and try again.'
            );
          }

          throw new Error(`Failed to resolve UID "${arg.uid}": ${errorMsg}`);
        }
      }
    }

    // Unified execution path: use executeScript with optional args
    const evalCode = `
      const fn = ${fnString};
      const args = Array.from(arguments);
      const result = fn(...args);
      return result instanceof Promise ? result : Promise.resolve(result);
    `;

    // Set script timeout
    await driver.manage().setTimeouts({ script: scriptTimeout });

    // Execute with resolved args (empty array if no args)
    const result = await driver.executeScript(evalCode, ...resolvedArgs);

    // Format output
    let output = 'Script ran on page and returned:\n';
    output += '```json\n';
    output += JSON.stringify(result, null, 2);
    output += '\n```';

    return successResponse(output);
  } catch (error) {
    const errorMsg = (error as Error).message;

    // Enhance timeout errors
    if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
      const timeoutValue = (args as { timeout?: number })?.timeout ?? DEFAULT_TIMEOUT;
      return errorResponse(
        new Error(
          `Script execution timed out (exceeded ${timeoutValue}ms).\n\n` +
            'The function may contain an infinite loop or be waiting for a slow operation.\n' +
            'Try simplifying the script or increasing the timeout parameter.'
        )
      );
    }

    return errorResponse(error as Error);
  }
}
