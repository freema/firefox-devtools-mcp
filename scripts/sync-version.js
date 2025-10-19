#!/usr/bin/env node
/**
 * Sync SERVER_VERSION in src/config/constants.ts with package.json version
 *
 * This script runs automatically when you use `npm version`
 * via the "version" lifecycle hook in package.json
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const constantsPath = path.join(rootDir, 'src/config/constants.ts');

try {
  // Read package.json
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const newVersion = pkg.version;

  // Read constants.ts
  let content = fs.readFileSync(constantsPath, 'utf-8');

  // Replace SERVER_VERSION
  const updated = content.replace(
    /export const SERVER_VERSION = '[^']+';/,
    `export const SERVER_VERSION = '${newVersion}';`
  );

  // Check if anything changed
  if (updated === content) {
    console.log(`⚠️  Warning: SERVER_VERSION was already ${newVersion}`);
  } else {
    // Write updated file
    fs.writeFileSync(constantsPath, updated, 'utf-8');
    console.log(`✅ Synced SERVER_VERSION to ${newVersion}`);
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Failed to sync version:', error.message);
  process.exit(1);
}
