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

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    // If args provided, we need to resolve UIDs to WebElements first
    if (fnArgs && fnArgs.length > 0) {
      // Resolve UIDs to WebElements using the new resolver
      const elements = await Promise.all(
        fnArgs.map(async (arg) => {
          try {
            return await firefox.resolveUidToElement(arg.uid);
          } catch (error) {
            throw new Error(`Failed to resolve UID "${arg.uid}": ${(error as Error).message}`);
          }
        })
      );

      // Execute the function with resolved elements
      // We'll use executeScript which can handle WebElement arguments
      const driver = firefox.getDriver();

      if (!driver) {
        throw new Error('WebDriver not available');
      }

      const evalCode = `
        const fn = ${fnString};
        const args = Array.from(arguments);
        const result = fn(...args);
        return result instanceof Promise ? result : Promise.resolve(result);
      `;

      const result = await driver.executeScript(evalCode, ...elements);

      let output = 'Script ran on page and returned:\n';
      output += '```json\n';
      output += JSON.stringify(result, null, 2);
      output += '\n```';

      return successResponse(output);
    }

    // No args - simple function call
    const evalCode = `
      (async function() {
        const fn = ${fnString};
        const result = await fn();
        return JSON.stringify(result);
      })()
    `;

    const result = await firefox.evaluate(evalCode);

    // Parse the JSON result
    let parsedResult: unknown;
    try {
      parsedResult = JSON.parse(result as string);
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
