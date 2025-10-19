/**
 * Performance monitoring tools (not exported - see docs/future-features.md)
 * Kept for reference: limitations and alternatives documented within
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions
export const performanceGetMetricsTool = {
  name: 'performance_get_metrics',
  description:
    'Get performance metrics for the currently selected page using Navigation Timing API. ' +
    'Full performance profiling is not available via WebDriver BiDi. ' +
    'Use Firefox DevTools UI for advanced profiling.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export const performanceStartTraceTool = {
  name: 'performance_start_trace',
  description:
    'DEPRECATED: Performance tracing is not supported in WebDriver BiDi. ' +
    'This tool exists for API compatibility but will return a "not supported" message. ' +
    'Use Firefox DevTools UI Performance panel for detailed performance profiling.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      categories: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Trace categories (not used in Firefox - for API compatibility only)',
      },
    },
  },
};

export const performanceStopTraceTool = {
  name: 'performance_stop_trace',
  description:
    'DEPRECATED: Performance tracing is not supported in WebDriver BiDi. ' +
    'This tool exists for API compatibility but will return a "not supported" message.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

// Tool handlers
export async function handlePerformanceGetMetrics(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    // Use Navigation Timing API to get basic performance metrics
    const code = `
      JSON.stringify({
        navigation: performance.getEntriesByType('navigation')[0] || null,
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null,
        timing: performance.timing ? {
          navigationStart: performance.timing.navigationStart,
          domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd,
          loadEventEnd: performance.timing.loadEventEnd,
          domComplete: performance.timing.domComplete,
          domInteractive: performance.timing.domInteractive,
          responseEnd: performance.timing.responseEnd,
          requestStart: performance.timing.requestStart,
          connectEnd: performance.timing.connectEnd,
          connectStart: performance.timing.connectStart,
          domainLookupEnd: performance.timing.domainLookupEnd,
          domainLookupStart: performance.timing.domainLookupStart
        } : null
      })
    `;

    const result = await firefox.evaluate(code);
    const metrics = JSON.parse(result as string) as {
      navigation: {
        domContentLoadedEventEnd?: number;
        domContentLoadedEventStart?: number;
        domComplete?: number;
        domInteractive?: number;
        duration?: number;
        loadEventEnd?: number;
        loadEventStart?: number;
        responseEnd?: number;
        requestStart?: number;
      } | null;
      memory: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      } | null;
      timing: {
        navigationStart: number;
        domContentLoadedEventEnd: number;
        loadEventEnd: number;
        domComplete: number;
        domInteractive: number;
        responseEnd: number;
        requestStart: number;
        connectEnd: number;
        connectStart: number;
        domainLookupEnd: number;
        domainLookupStart: number;
      } | null;
    };

    // Format metrics for display
    const lines: string[] = ['Performance Metrics (Navigation Timing API):', ''];

    if (metrics.navigation) {
      lines.push('Navigation:');
      if (metrics.navigation.duration !== undefined) {
        lines.push(`  Total Duration: ${Math.round(metrics.navigation.duration)}ms`);
      }
      if (metrics.navigation.domInteractive !== undefined) {
        lines.push(`  DOM Interactive: ${Math.round(metrics.navigation.domInteractive)}ms`);
      }
      if (metrics.navigation.domComplete !== undefined) {
        lines.push(`  DOM Complete: ${Math.round(metrics.navigation.domComplete)}ms`);
      }
      if (
        metrics.navigation.domContentLoadedEventEnd !== undefined &&
        metrics.navigation.domContentLoadedEventStart !== undefined
      ) {
        lines.push(
          `  DOMContentLoaded: ${Math.round(metrics.navigation.domContentLoadedEventEnd - metrics.navigation.domContentLoadedEventStart)}ms`
        );
      }
      if (
        metrics.navigation.loadEventEnd !== undefined &&
        metrics.navigation.loadEventStart !== undefined
      ) {
        lines.push(
          `  Load Event: ${Math.round(metrics.navigation.loadEventEnd - metrics.navigation.loadEventStart)}ms`
        );
      }
      lines.push('');
    }

    if (metrics.timing) {
      const t = metrics.timing;
      lines.push('Detailed Timing:');
      lines.push(`  DNS Lookup: ${Math.round(t.domainLookupEnd - t.domainLookupStart)}ms`);
      lines.push(`  TCP Connection: ${Math.round(t.connectEnd - t.connectStart)}ms`);
      lines.push(`  Request Time: ${Math.round(t.responseEnd - t.requestStart)}ms`);
      lines.push(`  DOM Processing: ${Math.round(t.domComplete - t.domContentLoadedEventEnd)}ms`);
      lines.push('');
    }

    if (metrics.memory) {
      lines.push('Memory Usage:');
      lines.push(`  Used Heap: ${(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      lines.push(`  Total Heap: ${(metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      lines.push(`  Heap Limit: ${(metrics.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
      lines.push('');
    }

    lines.push(
      'NOTE: This is a basic implementation using Navigation Timing API.',
      'For detailed performance profiling, use Firefox DevTools Performance panel.',
      'Advanced tracing (like Chrome DevTools) is not available via WebDriver BiDi.'
    );

    return successResponse(lines.join('\n'));
  } catch (error) {
    return errorResponse(
      `Failed to get performance metrics: ${error instanceof Error ? error.message : String(error)}\n\n` +
        'Ensure the page has finished loading before requesting metrics.'
    );
  }
}

export async function handlePerformanceStartTrace(_args: unknown): Promise<McpToolResponse> {
  return errorResponse(
    'Performance tracing is not supported in WebDriver BiDi.\n\n' +
      'Unlike Chrome DevTools Protocol, WebDriver BiDi does not provide ' +
      'detailed performance tracing capabilities. For advanced performance profiling:\n\n' +
      '1. Use Firefox DevTools Performance panel (F12 → Performance tab)\n' +
      '2. Use performance_get_metrics for basic Navigation Timing data\n' +
      '3. Use Firefox Profiler (https://profiler.firefox.com/) for advanced profiling\n\n' +
      'This tool exists for API compatibility with Chrome-based tools but cannot provide ' +
      'the same functionality in Firefox.'
  );
}

export async function handlePerformanceStopTrace(_args: unknown): Promise<McpToolResponse> {
  return errorResponse(
    'Performance tracing is not supported in WebDriver BiDi.\n\n' +
      'See performance_start_trace documentation for alternatives.'
  );
}
