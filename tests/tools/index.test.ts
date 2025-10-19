/**
 * Unit tests for tools index exports
 */

import { describe, it, expect } from 'vitest';
import * as tools from '../../src/tools/index.js';

describe('Tools Index', () => {
  describe('Pages Tools', () => {
    it('should export listPagesTool', () => {
      expect(tools.listPagesTool).toBeDefined();
      expect(tools.listPagesTool.name).toBe('list_pages');
    });

    it('should export newPageTool', () => {
      expect(tools.newPageTool).toBeDefined();
      expect(tools.newPageTool.name).toBe('new_page');
    });

    it('should export navigatePageTool', () => {
      expect(tools.navigatePageTool).toBeDefined();
      expect(tools.navigatePageTool.name).toBe('navigate_page');
    });

    it('should export selectPageTool', () => {
      expect(tools.selectPageTool).toBeDefined();
      expect(tools.selectPageTool.name).toBe('select_page');
    });

    it('should export closePageTool', () => {
      expect(tools.closePageTool).toBeDefined();
      expect(tools.closePageTool.name).toBe('close_page');
    });

    it('should export page handlers', () => {
      expect(tools.handleListPages).toBeDefined();
      expect(typeof tools.handleListPages).toBe('function');
      expect(tools.handleNewPage).toBeDefined();
      expect(typeof tools.handleNewPage).toBe('function');
      expect(tools.handleNavigatePage).toBeDefined();
      expect(typeof tools.handleNavigatePage).toBe('function');
      expect(tools.handleSelectPage).toBeDefined();
      expect(typeof tools.handleSelectPage).toBe('function');
      expect(tools.handleClosePage).toBeDefined();
      expect(typeof tools.handleClosePage).toBe('function');
    });
  });

  describe('Console Tools', () => {
    it('should export listConsoleMessagesTool', () => {
      expect(tools.listConsoleMessagesTool).toBeDefined();
      expect(tools.listConsoleMessagesTool.name).toBe('list_console_messages');
    });

    it('should export clearConsoleMessagesTool', () => {
      expect(tools.clearConsoleMessagesTool).toBeDefined();
      expect(tools.clearConsoleMessagesTool.name).toBe('clear_console_messages');
    });

    it('should export console handlers', () => {
      expect(tools.handleListConsoleMessages).toBeDefined();
      expect(typeof tools.handleListConsoleMessages).toBe('function');
      expect(tools.handleClearConsoleMessages).toBeDefined();
      expect(typeof tools.handleClearConsoleMessages).toBe('function');
    });
  });

  describe('Network Tools', () => {
    it('should export listNetworkRequestsTool', () => {
      expect(tools.listNetworkRequestsTool).toBeDefined();
      expect(tools.listNetworkRequestsTool.name).toBe('list_network_requests');
    });

    it('should export getNetworkRequestTool', () => {
      expect(tools.getNetworkRequestTool).toBeDefined();
      expect(tools.getNetworkRequestTool.name).toBe('get_network_request');
    });

    it('should export network handlers', () => {
      expect(tools.handleListNetworkRequests).toBeDefined();
      expect(typeof tools.handleListNetworkRequests).toBe('function');
      expect(tools.handleGetNetworkRequest).toBeDefined();
      expect(typeof tools.handleGetNetworkRequest).toBe('function');
    });
  });

  describe('Snapshot Tools', () => {
    it('should export takeSnapshotTool', () => {
      expect(tools.takeSnapshotTool).toBeDefined();
      expect(tools.takeSnapshotTool.name).toBe('take_snapshot');
    });

    it('should export resolveUidToSelectorTool', () => {
      expect(tools.resolveUidToSelectorTool).toBeDefined();
      expect(tools.resolveUidToSelectorTool.name).toBe('resolve_uid_to_selector');
    });

    it('should export clearSnapshotTool', () => {
      expect(tools.clearSnapshotTool).toBeDefined();
      expect(tools.clearSnapshotTool.name).toBe('clear_snapshot');
    });

    it('should export snapshot handlers', () => {
      expect(tools.handleTakeSnapshot).toBeDefined();
      expect(typeof tools.handleTakeSnapshot).toBe('function');
      expect(tools.handleResolveUidToSelector).toBeDefined();
      expect(typeof tools.handleResolveUidToSelector).toBe('function');
      expect(tools.handleClearSnapshot).toBeDefined();
      expect(typeof tools.handleClearSnapshot).toBe('function');
    });
  });

  describe('Input Tools', () => {
    it('should export clickByUidTool', () => {
      expect(tools.clickByUidTool).toBeDefined();
      expect(tools.clickByUidTool.name).toBe('click_by_uid');
    });

    it('should export hoverByUidTool', () => {
      expect(tools.hoverByUidTool).toBeDefined();
      expect(tools.hoverByUidTool.name).toBe('hover_by_uid');
    });

    it('should export fillByUidTool', () => {
      expect(tools.fillByUidTool).toBeDefined();
      expect(tools.fillByUidTool.name).toBe('fill_by_uid');
    });

    it('should export dragByUidToUidTool', () => {
      expect(tools.dragByUidToUidTool).toBeDefined();
      expect(tools.dragByUidToUidTool.name).toBe('drag_by_uid_to_uid');
    });

    it('should export fillFormByUidTool', () => {
      expect(tools.fillFormByUidTool).toBeDefined();
      expect(tools.fillFormByUidTool.name).toBe('fill_form_by_uid');
    });

    it('should export uploadFileByUidTool', () => {
      expect(tools.uploadFileByUidTool).toBeDefined();
      expect(tools.uploadFileByUidTool.name).toBe('upload_file_by_uid');
    });

    it('should export input handlers', () => {
      expect(tools.handleClickByUid).toBeDefined();
      expect(typeof tools.handleClickByUid).toBe('function');
      expect(tools.handleHoverByUid).toBeDefined();
      expect(typeof tools.handleHoverByUid).toBe('function');
      expect(tools.handleFillByUid).toBeDefined();
      expect(typeof tools.handleFillByUid).toBe('function');
      expect(tools.handleDragByUidToUid).toBeDefined();
      expect(typeof tools.handleDragByUidToUid).toBe('function');
      expect(tools.handleFillFormByUid).toBeDefined();
      expect(typeof tools.handleFillFormByUid).toBe('function');
      expect(tools.handleUploadFileByUid).toBeDefined();
      expect(typeof tools.handleUploadFileByUid).toBe('function');
    });
  });

  describe('Screenshot Tools', () => {
    it('should export screenshotPageTool', () => {
      expect(tools.screenshotPageTool).toBeDefined();
      expect(tools.screenshotPageTool.name).toBe('screenshot_page');
    });

    it('should export screenshotByUidTool', () => {
      expect(tools.screenshotByUidTool).toBeDefined();
      expect(tools.screenshotByUidTool.name).toBe('screenshot_by_uid');
    });

    it('should export screenshot handlers', () => {
      expect(tools.handleScreenshotPage).toBeDefined();
      expect(typeof tools.handleScreenshotPage).toBe('function');
      expect(tools.handleScreenshotByUid).toBeDefined();
      expect(typeof tools.handleScreenshotByUid).toBe('function');
    });
  });

  describe('Utility Tools', () => {
    it('should export acceptDialogTool', () => {
      expect(tools.acceptDialogTool).toBeDefined();
      expect(tools.acceptDialogTool.name).toBe('accept_dialog');
    });

    it('should export dismissDialogTool', () => {
      expect(tools.dismissDialogTool).toBeDefined();
      expect(tools.dismissDialogTool.name).toBe('dismiss_dialog');
    });

    it('should export navigateHistoryTool', () => {
      expect(tools.navigateHistoryTool).toBeDefined();
      expect(tools.navigateHistoryTool.name).toBe('navigate_history');
    });

    it('should export setViewportSizeTool', () => {
      expect(tools.setViewportSizeTool).toBeDefined();
      expect(tools.setViewportSizeTool.name).toBe('set_viewport_size');
    });

    it('should export utility handlers', () => {
      expect(tools.handleAcceptDialog).toBeDefined();
      expect(typeof tools.handleAcceptDialog).toBe('function');
      expect(tools.handleDismissDialog).toBeDefined();
      expect(typeof tools.handleDismissDialog).toBe('function');
      expect(tools.handleNavigateHistory).toBeDefined();
      expect(typeof tools.handleNavigateHistory).toBe('function');
      expect(tools.handleSetViewportSize).toBeDefined();
      expect(typeof tools.handleSetViewportSize).toBe('function');
    });
  });
});
