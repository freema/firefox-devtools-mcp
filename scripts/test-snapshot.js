#!/usr/bin/env node

/**
 * Test snapshot functionality
 */

import { FirefoxDevTools } from '../dist/index.js';

async function main() {
  console.log('🧪 Testing Snapshot + UID mapping...\n');

  const options = {
    firefoxPath: undefined,
    headless: false,
    profilePath: undefined,
    viewport: { width: 1280, height: 720 },
    args: [],
    startUrl: 'about:blank',
  };

  const firefox = new FirefoxDevTools(options);

  try {
    console.log('📡 Connecting...');
    await firefox.connect();
    console.log('✅ Connected\n');

    // Navigate to a simple test page
    console.log('🧭 Navigating to example.com...');
    await firefox.navigate('https://example.com');
    await new Promise((r) => setTimeout(r, 2000));
    console.log('✅ Navigation completed\n');

    // Take snapshot
    console.log('📸 Taking snapshot...');
    const snapshot = await firefox.takeSnapshot();
    console.log(`✅ Snapshot created with ID: ${snapshot.json.snapshotId}`);
    console.log(`   Total elements: ${snapshot.text.split('\n').length - 1}\n`);

    // Save snapshot to file for debugging
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    await fs.mkdir('./temp', { recursive: true });
    const snapshotPath = path.join('temp', 'snapshot-example.txt');
    await fs.writeFile(snapshotPath, snapshot.text);
    console.log(`💾 Snapshot saved to: ${snapshotPath}\n`);

    // Show first 20 lines of snapshot
    console.log('📄 Snapshot preview (first 20 lines):');
    console.log('─'.repeat(80));
    const lines = snapshot.text.split('\n');
    lines.slice(0, 20).forEach((line) => {
      console.log(line);
    });
    if (lines.length > 20) {
      console.log(`... and ${lines.length - 20} more lines`);
    }
    console.log('─'.repeat(80));
    console.log();

    // Test UID resolution
    console.log('🔍 Testing UID resolution...');
    const firstUid = snapshot.json.root.uid;
    console.log(`   First UID: ${firstUid}`);

    const selector = firefox.resolveUidToSelector(firstUid);
    console.log(`   Resolved selector: ${selector}`);

    // Verify element exists
    const elementExists = await firefox.evaluate(
      `return !!document.querySelector('${selector}')`,
    );
    console.log(`   Element exists: ${elementExists ? '✅' : '❌'}\n`);

    // Find an interactive element (link or button)
    let interactiveUid = null;
    function findInteractive(node) {
      if (node.tag === 'a' && node.href) {
        return node.uid;
      }
      for (const child of node.children) {
        const found = findInteractive(child);
        if (found) return found;
      }
      return null;
    }

    interactiveUid = findInteractive(snapshot.json.root);

    if (interactiveUid) {
      console.log('🔗 Found interactive element:');
      const interactiveSelector = firefox.resolveUidToSelector(interactiveUid);
      console.log(`   UID: ${interactiveUid}`);
      console.log(`   Selector: ${interactiveSelector}`);

      const elementInfo = await firefox.evaluate(`
        const el = document.querySelector('${interactiveSelector}');
        return {
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 50),
          href: el.href || null
        };
      `);
      console.log(`   Tag: ${elementInfo.tag}`);
      console.log(`   Text: "${elementInfo.text}"`);
      if (elementInfo.href) {
        console.log(`   Href: ${elementInfo.href}`);
      }
      console.log();
    }

    // Test navigation clears snapshot
    console.log('🧭 Testing snapshot clearing on navigation...');
    await firefox.navigate('https://www.mozilla.org');
    await new Promise((r) => setTimeout(r, 2000));
    console.log('✅ Navigated to mozilla.org\n');

    // Old UID should not work
    console.log('🔍 Verifying old UID is invalid...');
    try {
      firefox.resolveUidToSelector(firstUid);
      console.log('❌ ERROR: Old UID still works (should be cleared)\n');
    } catch (err) {
      console.log(`✅ Old UID correctly invalidated: ${err.message}\n`);
    }

    // Take new snapshot
    console.log('📸 Taking new snapshot after navigation...');
    const snapshot2 = await firefox.takeSnapshot();
    console.log(`✅ New snapshot created with ID: ${snapshot2.json.snapshotId}`);
    console.log(`   Total elements: ${snapshot2.text.split('\n').length - 1}\n`);

    // Save mozilla snapshot
    const snapshot2Path = path.join('temp', 'snapshot-mozilla.txt');
    await fs.writeFile(snapshot2Path, snapshot2.text);
    console.log(`💾 Mozilla snapshot saved to: ${snapshot2Path}\n`);

    // Show first 15 lines
    console.log('📄 New snapshot preview (first 15 lines):');
    console.log('─'.repeat(80));
    const lines2 = snapshot2.text.split('\n');
    lines2.slice(0, 15).forEach((line) => {
      console.log(line);
    });
    if (lines2.length > 15) {
      console.log(`... and ${lines2.length - 15} more lines`);
    }
    console.log('─'.repeat(80));
    console.log();

    console.log('✅ All snapshot tests completed! 🎉\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    console.log('🧹 Closing...');
    await firefox.close();
    console.log('✅ Done');
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
