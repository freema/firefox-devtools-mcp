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

// Script evaluation tools - DISABLED (see docs/future-features.md)
// export { evaluateScriptTool, handleEvaluateScript } from './script.js';

// Console tools
export {
  listConsoleMessagesTool,
  clearConsoleMessagesTool,
  handleListConsoleMessages,
  handleClearConsoleMessages,
} from './console.js';

// Network tools
export {
  listNetworkRequestsTool,
  getNetworkRequestTool,
  handleListNetworkRequests,
  handleGetNetworkRequest,
} from './network.js';

// Snapshot tools
export {
  takeSnapshotTool,
  resolveUidToSelectorTool,
  clearSnapshotTool,
  handleTakeSnapshot,
  handleResolveUidToSelector,
  handleClearSnapshot,
} from './snapshot.js';

// Input tools (UID-based interactions)
export {
  clickByUidTool,
  hoverByUidTool,
  fillByUidTool,
  dragByUidToUidTool,
  fillFormByUidTool,
  uploadFileByUidTool,
  handleClickByUid,
  handleHoverByUid,
  handleFillByUid,
  handleDragByUidToUid,
  handleFillFormByUid,
  handleUploadFileByUid,
} from './input.js';

// Screenshot tools
export {
  screenshotPageTool,
  screenshotByUidTool,
  handleScreenshotPage,
  handleScreenshotByUid,
} from './screenshot.js';

// Utility tools (dialogs, history, viewport)
export {
  acceptDialogTool,
  dismissDialogTool,
  navigateHistoryTool,
  setViewportSizeTool,
  handleAcceptDialog,
  handleDismissDialog,
  handleNavigateHistory,
  handleSetViewportSize,
} from './utilities.js';
