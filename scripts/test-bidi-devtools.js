#!/usr/bin/env node

/**
 * Test script for new BiDi-based FirefoxDevTools
 * Tests all main functionality with clean BiDi implementation
 */

import { FirefoxDevTools } from '../dist/index.js';

async function main() {
  console.log('🧪 Testing BiDi-based FirefoxDevTools...\n');

  const options = {
    firefoxPath: undefined, // Auto-detect
    headless: false,
    profilePath: undefined,
    viewport: { width: 1280, height: 720 },
    args: [],
    startUrl: 'https://www.centrum.cz/',
  };

  const firefox = new FirefoxDevTools(options);

  try {
    // 1. Connect
    console.log('📡 Connecting to Firefox via BiDi...');
    await firefox.connect();
    console.log('✅ Connected!\n');

    // 2. List tabs
    console.log('📄 Listing tabs...');
    await firefox.refreshTabs();
    const tabs = firefox.getTabs();
    console.log(`✅ Found ${tabs.length} tab(s):`);
    tabs.forEach((tab, idx) => {
      console.log(`   [${idx}] ${tab.title} - ${tab.url}`);
    });
    console.log();

    // 3. Wait for page to load
    console.log('⏳ Waiting 5 seconds for centrum.cz to load...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 4. Get page title
    console.log('📖 Getting page title via evaluate...');
    console.log('   Testing evaluate with simple expression...');
    const test1 = await firefox.evaluate('return 1 + 1');
    console.log(`   1 + 1 = ${test1}`);
    const test2 = await firefox.evaluate('return document.title');
    console.log(`   document.title = ${test2}`);
    const title = await firefox.evaluate('return document.title');
    console.log(`✅ Page title: ${title}\n`);

    // 5. Get console messages
    console.log('📝 Getting console messages...');
    const messages = await firefox.getConsoleMessages();
    console.log(`✅ Found ${messages.length} console message(s):\n`);

    messages.slice(0, 10).forEach((msg, idx) => {
      const levelEmoji = {
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[msg.level] || '📘';

      console.log(`   ${idx + 1}. ${levelEmoji} [${msg.level}] ${msg.text.substring(0, 100)}`);
    });

    if (messages.length > 10) {
      console.log(`   ... and ${messages.length - 10} more messages`);
    }
    console.log();

    // 6. Trigger our own console messages
    console.log('⚡ Triggering custom console messages...');
    await firefox.evaluate(`
      console.log('🎯 BiDi test log message!');
      console.warn('⚠️ BiDi test warning!');
      console.error('❌ BiDi test error!');
      console.info('ℹ️ BiDi test info!');
    `);
    console.log('✅ Console messages triggered\n');

    // Wait for messages to arrive
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 7. Get updated console messages
    console.log('📊 Updated console messages:');
    const updatedMessages = await firefox.getConsoleMessages();
    console.log(`   Total: ${updatedMessages.length} messages`);
    console.log(`   New messages since last check:`);

    updatedMessages.slice(messages.length).forEach((msg, idx) => {
      const levelEmoji = {
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[msg.level] || '📘';

      console.log(`   ${levelEmoji} [${msg.level}] ${msg.text}`);
    });
    console.log();

    // 8. Get performance metrics
    console.log('📊 Getting performance metrics...');
    const perfMetrics = await firefox.evaluate(`
      return JSON.stringify({
        timing: {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domInteractive: performance.timing.domInteractive - performance.timing.navigationStart
        },
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : null,
        resources: performance.getEntriesByType('resource').length
      })
    `);

    const metrics = JSON.parse(perfMetrics);
    console.log('✅ Performance Metrics:');
    console.log(`   DOM Content Loaded: ${metrics.timing.domContentLoaded}ms`);
    console.log(`   Page Load Complete: ${metrics.timing.loadComplete}ms`);
    console.log(`   DOM Interactive: ${metrics.timing.domInteractive}ms`);
    console.log(`   Resources Loaded: ${metrics.resources}`);

    if (metrics.memory) {
      console.log(`   JS Heap Used: ${(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   JS Heap Total: ${(metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }
    console.log();

    // 9. Navigate to another page
    console.log('🧭 Navigating to example.com...');
    await firefox.navigate('https://example.com');
    console.log('✅ Navigation completed');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const newTitle = await firefox.evaluate('return document.title');
    console.log(`✅ New page title: ${newTitle}\n`);

    // 10. Test tab management
    console.log('📑 Creating new tab...');
    const newTabIdx = await firefox.createNewPage('https://www.mozilla.org');
    console.log(`✅ Created new tab [${newTabIdx}]\n`);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // List all tabs
    await firefox.refreshTabs();
    const allTabs = firefox.getTabs();
    console.log('📄 All tabs:');
    allTabs.forEach((tab, idx) => {
      const marker = idx === firefox.getSelectedTabIdx() ? '👉' : '  ';
      console.log(`${marker} [${idx}] ${tab.title.substring(0, 50)} - ${tab.url}`);
    });
    console.log();

    // 11. Resize viewport (client utility)
    console.log('📐 Resizing viewport to 1024x600...');
    try {
      await firefox.setViewportSize(1024, 600);
      console.log('✅ Viewport resized\n');
    } catch (e) {
      console.log('⚠️ Skipping viewport resize test:', e.message);
    }

    // 12. Drag & drop via JS fallback
    console.log('🧲 Testing drag & drop (JS fallback)...');
    try {
      const dndPage = `data:text/html;charset=utf-8,<!doctype html><meta charset=utf-8><style>\n#drag{width:80px;height:80px;background:#08f;color:#fff;display:flex;align-items:center;justify-content:center}#drop{width:160px;height:100px;border:3px dashed #888;margin-left:16px;display:inline-flex;align-items:center;justify-content:center}#ok{color:green;font-weight:bold}\n</style>\n<div id=drag draggable=true>Drag</div><div id=drop>Drop here</div>\n<script>\nconst drop = document.getElementById('drop');\ndrop.addEventListener('drop', (e)=>{e.preventDefault();drop.innerHTML='<span id=ok>OK</span>';});\ndrop.addEventListener('dragover', (e)=>e.preventDefault());\n</script>`;
      await firefox.navigate(dndPage);
      await firefox.dragAndDropBySelectors('#drag', '#drop');
      // Verify
      const ok = await firefox.evaluate("return !!document.querySelector('#ok')");
      console.log(ok ? '✅ Drag & drop worked\n' : '❌ Drag & drop failed\n');
    } catch (e) {
      console.log('⚠️ Skipping drag & drop test:', e.message);
    }

    // 13. File upload: sendKeys + JS unhide
    console.log('📁 Testing file upload (sendKeys)...');
    try {
      const fs = await import('node:fs/promises');
      const os = await import('node:os');
      const path = await import('node:path');
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bidi-test-'));
      const filePath = path.join(tmp, 'hello.txt');
      await fs.writeFile(filePath, 'hello bidi');

      const uploadPage = `data:text/html;charset=utf-8,<!doctype html><meta charset=utf-8>\n<style>#file{display:none}</style>\n<label for=file>Pick file</label>\n<input id=file type=file>\n<script>document.getElementById('file').addEventListener('change',()=>{document.body.setAttribute('data-ok','1')});</script>`;
      await firefox.navigate(uploadPage);
      await firefox.uploadFileBySelector('#file', filePath);
      const ok = await firefox.evaluate("return document.body.getAttribute('data-ok') === '1'");
      console.log(ok ? '✅ File upload worked\n' : '❌ File upload failed\n');
    } catch (e) {
      console.log('⚠️ Skipping file upload test:', e.message);
    }

    // 14. Network monitoring
    console.log('🌐 Testing network monitoring...');
    try {
      // Start monitoring BEFORE navigation
      await firefox.startNetworkMonitoring();
      console.log('   Network monitoring started');

      // Small delay to ensure listener is ready
      await new Promise((r) => setTimeout(r, 100));

      // Navigate to a page with resources
      await firefox.navigate('https://example.com');

      // Wait for page load and network activity
      await new Promise((r) => setTimeout(r, 3000));

      // Get network requests
      const requests = await firefox.getNetworkRequests();
      console.log(`✅ Captured ${requests.length} network request(s):`);

      // Show first 5 requests
      requests.slice(0, 5).forEach((req, idx) => {
        const statusEmoji = req.status >= 400 ? '❌' : req.status >= 300 ? '⚠️' : '✅';
        console.log(`   ${idx + 1}. ${statusEmoji} [${req.method}] ${req.status || '?'} ${req.url.substring(0, 80)}`);
        if (req.resourceType) {
          console.log(`      Type: ${req.resourceType}`);
        }
        if (req.timings?.duration) {
          console.log(`      Duration: ${req.timings.duration}ms`);
        }
      });

      if (requests.length > 5) {
        console.log(`   ... and ${requests.length - 5} more requests`);
      }

      // Stop monitoring
      await firefox.stopNetworkMonitoring();
      console.log('   Network monitoring stopped');

      // Clear requests
      firefox.clearNetworkRequests();
      const clearedRequests = await firefox.getNetworkRequests();
      console.log(`✅ Cleared requests (now: ${clearedRequests.length})\n`);
    } catch (e) {
      console.log('⚠️ Network monitoring test failed:', e.message, '\n');
    }

    // 15. History navigation
    console.log('↩️ Testing back/forward navigation...');
    try {
      await firefox.navigate('https://example.com');
      await new Promise((r) => setTimeout(r, 1000));
      await firefox.navigate('https://www.mozilla.org');
      await new Promise((r) => setTimeout(r, 1000));
      await firefox.navigateBack();
      const titleBack = await firefox.evaluate('return document.title');
      console.log('   Back title:', titleBack);
      await firefox.navigateForward();
      const titleFwd = await firefox.evaluate('return document.title');
      console.log('   Forward title:', titleFwd);
      console.log('✅ History navigation tested\n');
    } catch (e) {
      console.log('⚠️ Skipping history test:', e.message);
    }

    // 16. Snapshot tests
    console.log('📸 Testing snapshot functionality...');
    try {
      // Navigate to example.com for simple snapshot
      await firefox.navigate('https://example.com');
      await new Promise((r) => setTimeout(r, 2000));

      // Take first snapshot
      console.log('   Taking first snapshot...');
      const snapshot1 = await firefox.takeSnapshot();
      console.log(`✅ Snapshot taken! (ID: ${snapshot1.json.snapshotId})`);
      console.log(`   Elements with UIDs: ${Object.keys(snapshot1.json.root).length}`);
      console.log(`   First few lines of text output:`);
      const lines = snapshot1.text.split('\n').slice(0, 10);
      lines.forEach(line => console.log(`   ${line}`));
      if (snapshot1.text.split('\n').length > 10) {
        console.log(`   ... and ${snapshot1.text.split('\n').length - 10} more lines`);
      }

      // Test UID resolution
      console.log('\n   Testing UID resolution...');
      const firstUid = snapshot1.json.root.uid;
      const selector = firefox.resolveUidToSelector(firstUid);
      console.log(`   ✅ UID ${firstUid} resolves to selector: ${selector}`);

      // Test element resolution
      const element = await firefox.resolveUidToElement(firstUid);
      console.log(`   ✅ UID ${firstUid} resolves to WebElement: ${!!element}`);

      // Test staleness detection
      console.log('\n   Testing staleness detection...');
      await firefox.navigate('https://www.mozilla.org');
      await new Promise((r) => setTimeout(r, 2000));

      try {
        firefox.resolveUidToSelector(firstUid);
        console.log('   ❌ Staleness detection failed - should have thrown error');
      } catch (e) {
        console.log(`   ✅ Staleness detected correctly: ${e.message}`);
      }

      // Take new snapshot after navigation
      console.log('\n   Taking snapshot after navigation...');
      const snapshot2 = await firefox.takeSnapshot();
      console.log(`   ✅ New snapshot taken! (ID: ${snapshot2.json.snapshotId})`);
      console.log(`   Old snapshot ID: ${snapshot1.json.snapshotId}, New: ${snapshot2.json.snapshotId}`);

      // Test same-origin iframe (using data: URL)
      console.log('\n   Testing iframe support...');
      const iframePage = `data:text/html;charset=utf-8,<!doctype html>
<html><head><title>Iframe Test</title></head><body>
<h1>Main Page</h1>
<p>This is the main page</p>
<iframe srcdoc="<h2>Iframe Content</h2><p>This is inside the iframe</p>"></iframe>
</body></html>`;
      await firefox.navigate(iframePage);
      await new Promise((r) => setTimeout(r, 1000));

      const snapshot3 = await firefox.takeSnapshot();
      console.log(`   ✅ Snapshot with iframe taken!`);
      const hasIframe = JSON.stringify(snapshot3.json).includes('isIframe');
      console.log(`   ${hasIframe ? '✅' : '❌'} Iframe detected in snapshot: ${hasIframe}`);

      console.log('\n✅ Snapshot tests completed!\n');
    } catch (e) {
      console.log('⚠️ Snapshot test failed:', e.message);
      if (e.stack) console.log(e.stack);
    }

    // 17. Screenshot tests (Task 22)
    console.log('📷 Testing screenshot functionality...');
    try {
      // Navigate to example.com
      await firefox.navigate('https://example.com');
      await new Promise((r) => setTimeout(r, 2000));

      // Test 1: Full page screenshot
      console.log('   Taking full page screenshot...');
      const pageScreenshot = await firefox.takeScreenshotPage();
      console.log(`   ✅ Page screenshot captured (${pageScreenshot.length} chars base64)`);

      // Validate base64 PNG
      const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(pageScreenshot);
      const isPNG = pageScreenshot.startsWith('iVBOR');
      console.log(`   ${isValidBase64 ? '✅' : '❌'} Valid base64: ${isValidBase64}`);
      console.log(`   ${isPNG ? '✅' : '❌'} PNG format: ${isPNG}`);

      // Test 2: Element screenshot by UID
      console.log('\n   Taking element screenshot by UID...');
      const snapshot = await firefox.takeSnapshot();

      // Find first heading or paragraph
      const targetNode = snapshot.json.root.children?.find(
        (n) => n.tag === 'h1' || n.tag === 'p'
      );

      if (targetNode && targetNode.uid) {
        console.log(`   Found element: <${targetNode.tag}> with UID ${targetNode.uid}`);
        const elementScreenshot = await firefox.takeScreenshotByUid(targetNode.uid);
        console.log(`   ✅ Element screenshot captured (${elementScreenshot.length} chars base64)`);

        const isValidBase64Elem = /^[A-Za-z0-9+/=]+$/.test(elementScreenshot);
        const isPNGElem = elementScreenshot.startsWith('iVBOR');
        console.log(`   ${isValidBase64Elem ? '✅' : '❌'} Valid base64: ${isValidBase64Elem}`);
        console.log(`   ${isPNGElem ? '✅' : '❌'} PNG format: ${isPNGElem}`);

        // Compare sizes (element should be smaller than page)
        if (elementScreenshot.length < pageScreenshot.length) {
          console.log('   ✅ Element screenshot is smaller than page screenshot');
        } else {
          console.log('   ⚠️ Element screenshot size: unexpected (could be fullpage fallback)');
        }
      } else {
        console.log('   ⚠️ No suitable element found for screenshot test');
      }

      console.log('\n✅ Screenshot tests completed!\n');
    } catch (e) {
      console.log('⚠️ Screenshot test failed:', e.message);
      if (e.stack) console.log(e.stack);
    }

    // 18. Dialog handling tests (Task 23)
    console.log('💬 Testing dialog handling...');
    try {
      // Test 1: Alert dialog
      console.log('   Testing alert dialog...');
      await firefox.navigate('about:blank');
      await firefox.evaluate('setTimeout(() => alert("Test alert!"), 100)');
      await new Promise((r) => setTimeout(r, 200));
      await firefox.acceptDialog();
      console.log('   ✅ Alert dialog accepted');

      // Test 2: Confirm dialog - accept
      console.log('\n   Testing confirm dialog (accept)...');
      await firefox.evaluate('setTimeout(() => { window.confirmResult = confirm("Test confirm?"); }, 100)');
      await new Promise((r) => setTimeout(r, 200));
      await firefox.acceptDialog();
      const confirmAccepted = await firefox.evaluate('return window.confirmResult');
      console.log(`   ${confirmAccepted ? '✅' : '❌'} Confirm accepted: ${confirmAccepted}`);

      // Test 3: Confirm dialog - dismiss
      console.log('\n   Testing confirm dialog (dismiss)...');
      await firefox.evaluate('setTimeout(() => { window.confirmResult2 = confirm("Test confirm 2?"); }, 100)');
      await new Promise((r) => setTimeout(r, 200));
      await firefox.dismissDialog();
      const confirmDismissed = await firefox.evaluate('return window.confirmResult2');
      console.log(`   ${!confirmDismissed ? '✅' : '❌'} Confirm dismissed: ${!confirmDismissed}`);

      // Test 4: Prompt dialog with text
      console.log('\n   Testing prompt dialog...');
      await firefox.evaluate('setTimeout(() => { window.promptResult = prompt("Enter your name:"); }, 100)');
      await new Promise((r) => setTimeout(r, 200));
      await firefox.acceptDialog('John Doe');
      const promptResult = await firefox.evaluate('return window.promptResult');
      console.log(`   ${promptResult === 'John Doe' ? '✅' : '❌'} Prompt result: ${promptResult}`);

      // Test 5: Error handling - no dialog
      console.log('\n   Testing error handling (no dialog)...');
      try {
        await firefox.acceptDialog();
        console.log('   ❌ Should have thrown error for missing dialog');
      } catch (e) {
        console.log(`   ✅ Error caught correctly: ${e.message}`);
      }

      console.log('\n✅ Dialog handling tests completed!\n');
    } catch (e) {
      console.log('⚠️ Dialog test failed:', e.message);
      if (e.stack) console.log(e.stack);
    }

    console.log('✅ All BiDi DevTools tests completed! 🎉\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    console.log('🧹 Closing connection...');
    await firefox.close();
    console.log('✅ Done');
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
