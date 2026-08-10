#!/usr/bin/env node
/**
 * Builds the firefox-devtools-mcp .mcpb bundle (Claude Desktop extension).
 * Assembles a staging directory with dist/, production node_modules and
 * manifest.json, then runs `mcpb pack` on it.
 */

import { readFileSync, writeFileSync, existsSync, cpSync, mkdtempSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.mcpb.json'), 'utf8'));

console.log('Building server...');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

const stagingDir = mkdtempSync(resolve(tmpdir(), 'firefox-devtools-mcpb-'));

try {
  cpSync(resolve(root, 'dist'), resolve(stagingDir, 'dist'), { recursive: true });
  for (const file of ['README.md', 'LICENSE-MIT', 'LICENSE-APACHE', 'package.json', 'package-lock.json']) {
    cpSync(resolve(root, file), resolve(stagingDir, file));
  }

  console.log('Installing production dependencies...');
  execSync('npm ci --omit=dev', { cwd: stagingDir, stdio: 'inherit' });

  writeFileSync(
    resolve(stagingDir, 'manifest.json'),
    JSON.stringify({ ...manifest, version: pkg.version }, null, 2) + '\n'
  );

  const outDir = resolve(root, 'dist-mcpb');
  if (!existsSync(outDir)) {
    execSync(`mkdir -p ${outDir}`);
  }
  const outFile = resolve(outDir, `firefox-devtools-mcp-${pkg.version}.mcpb`);

  console.log('Packing .mcpb bundle...');
  execSync(`npx mcpb pack "${stagingDir}" "${outFile}"`, {
    cwd: root,
    stdio: 'inherit',
  });

  console.log(`Written ${outFile}`);
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
}
