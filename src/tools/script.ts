/**
 * JavaScript evaluation tools
 * Full implementation in task 08
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

export const evaluateScriptTool = {
  name: 'evaluate_script',
  description:
    'Evaluate a JavaScript function inside the currently selected page. Returns the response as JSON so returned values have to be JSON-serializable.',
  inputSchema: {
    type: 'object',
    properties: {
      function: {
        type: 'string',
        description: `A JavaScript function to run in the currently selected page.
Example without arguments: \`() => {
  return document.title
}\` or \`async () => {
  return await fetch("example.com")
}\`.
Example with arguments: \`(el) => {
  return el.innerText;
}\``,
      },
      args: {
        type: 'array',
        description: 'An optional list of arguments to pass to the function.',
        items: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'The uid of an element on the page from the page content snapshot',
            },
          },
          required: ['uid'],
        },
      },
    },
    required: ['function'],
  },
};

export async function handleEvaluateScript(args: unknown): Promise<McpToolResponse> {
  try {
    const { function: fnString, args: fnArgs } = args as {
      function: string;
      args?: Array<{ uid: string }>;
    };

    const { getContext } = await import('../index.js');
    const context = await getContext();

    // Build evaluation code
    let evalCode = '';

    // If args provided, we need to resolve UIDs to elements
    if (fnArgs && fnArgs.length > 0) {
      // Build code to find elements by UID
      const elementFinders = fnArgs.map((arg, idx) => {
        return `
          const arg${idx} = document.querySelector('[data-mcp-uid="${arg.uid}"]');
          if (!arg${idx}) {
            throw new Error('Element with uid "${arg.uid}" not found');
          }
        `;
      });

      const argNames = fnArgs.map((_, idx) => `arg${idx}`).join(', ');

      evalCode = `
        (async function() {
          ${elementFinders.join('\n')}
          const fn = ${fnString};
          const result = await fn(${argNames});
          return JSON.stringify(result);
        })()
      `;
    } else {
      // No args - simple function call
      evalCode = `
        (async function() {
          const fn = ${fnString};
          const result = await fn();
          return JSON.stringify(result);
        })()
      `;
    }

    const result = await context.evaluateScript<string>(evalCode);

    // Parse the JSON result
    let parsedResult: unknown;
    try {
      parsedResult = JSON.parse(result);
    } catch {
      // If not JSON, return as string
      parsedResult = result;
    }

    let output = 'Script ran on page and returned:\n';
    output += '```json\n';
    output += JSON.stringify(parsedResult, null, 2);
    output += '\n```';

    return successResponse(output);
  } catch (error) {
    return errorResponse(error as Error);
  }
}
