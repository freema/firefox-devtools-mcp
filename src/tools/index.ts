/**
 * Central export for all MCP tools
 */

// Pages tools
export {
  listPagesTool,
  newPageTool,
  navigatePageTool,
  selectPageTool,
  closePageTool,
  handleListPages,
  handleNewPage,
  handleNavigatePage,
  handleSelectPage,
  handleClosePage,
} from './pages.js';

// Screenshot tools
export {
  takeScreenshotTool,
  takeSnapshotTool,
  handleTakeScreenshot,
  handleTakeSnapshot,
} from './screenshot.js';

// Script evaluation tools
export { evaluateScriptTool, handleEvaluateScript } from './script.js';

// Console tools
export { listConsoleMessagesTool, handleListConsoleMessages } from './console.js';

// Network tools
export {
  listNetworkRequestsTool,
  getNetworkRequestTool,
  startNetworkMonitoringTool,
  stopNetworkMonitoringTool,
  handleListNetworkRequests,
  handleGetNetworkRequest,
  handleStartNetworkMonitoring,
  handleStopNetworkMonitoring,
} from './network.js';

// Performance tools
export {
  performanceGetMetricsTool,
  performanceStartTraceTool,
  performanceStopTraceTool,
  handlePerformanceGetMetrics,
  handlePerformanceStartTrace,
  handlePerformanceStopTrace,
} from './performance.js';
