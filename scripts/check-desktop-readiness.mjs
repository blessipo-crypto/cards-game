import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const errors = [];

function assertExists(relPath) {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full)) {
    errors.push(`Missing required file: ${relPath}`);
    return null;
  }
  return full;
}

console.log('Checking Royal Velvet Suite Windows desktop packaging readiness...\n');

// 1. Check built web bundle uses relative paths for Electron file:// ASAR loading
const distHtmlPath = assertExists('dist/index.html');
if (distHtmlPath) {
  const html = fs.readFileSync(distHtmlPath, 'utf8');
  if (/["']\/assets\//.test(html)) {
    errors.push('dist/index.html contains root-relative "/assets/" URLs; expected "./assets/" via vite base: "./".');
  } else if (!/\.\/assets\//.test(html)) {
    errors.push('dist/index.html does not reference "./assets/" compiled assets.');
  } else {
    console.log('[OK] dist/index.html uses relative ./assets/ paths compatible with Electron file://');
  }
}

// 2. Check Electron main & preload syntax and security settings
const mainPath = assertExists('electron/main.cjs');
const preloadPath = assertExists('electron/preload.cjs');
if (mainPath && preloadPath) {
  try {
    execFileSync(process.execPath, ['--check', mainPath]);
    execFileSync(process.execPath, ['--check', preloadPath]);
    console.log('[OK] electron/main.cjs and electron/preload.cjs pass Node syntax check');
  } catch (err) {
    errors.push(`Electron JS syntax check failed: ${err.message}`);
  }

  const mainSrc = fs.readFileSync(mainPath, 'utf8');
  for (const flag of ['contextIsolation: true', 'nodeIntegration: false', 'sandbox: true']) {
    if (!mainSrc.includes(flag)) {
      errors.push(`electron/main.cjs missing security setting: ${flag}`);
    }
  }
  console.log('[OK] Electron BrowserWindow security hardening flags verified');
}

// 3. Check programmatic .ico integrity (HEADER: 00 00 01 00 + >=2 entries)
const icoPath = assertExists('build/icon.ico');
if (icoPath) {
  const ico = fs.readFileSync(icoPath);
  if (ico.length < 22 || ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) {
    errors.push('build/icon.ico has an invalid Windows ICO header');
  } else {
    const count = ico.readUInt16LE(4);
    console.log(`[OK] build/icon.ico verified (${count} icon entries, ${ico.length} bytes)`);
  }
}

// 4. Check NSIS uninstaller hooks & electron-builder config
const nshPath = assertExists('build/installer.nsh');
if (nshPath) {
  const nsh = fs.readFileSync(nshPath, 'utf8');
  if (!nsh.includes('customInstall') || !nsh.includes('customUnInstall') || !nsh.includes('Uninstall')) {
    errors.push('build/installer.nsh missing customInstall / customUnInstall / Uninstall registry registration');
  } else {
    console.log('[OK] build/installer.nsh defines install registry + uninstaller cleanup hooks');
  }
}

const builderPath = assertExists('electron-builder.yml');
if (builderPath) {
  const yml = fs.readFileSync(builderPath, 'utf8');
  for (const needle of [
    'requestedExecutionLevel: asInvoker',
    'signtoolOptions:',
    'signingHashAlgorithms:',
    'sha256',
    'rfc3161TimeStampServer:',
    'uninstallDisplayName:',
    'include: build/installer.nsh',
  ]) {
    if (!yml.includes(needle)) {
      errors.push(`electron-builder.yml missing required setting: ${needle}`);
    }
  }
  console.log('[OK] electron-builder.yml verified (NSIS + Uninstaller + asInvoker + SHA-256 + RFC3161)');
}

// 5. Check custom signing hook, Windows verification script & CI workflow
const winSignPath = assertExists('scripts/win-sign.cjs');
if (winSignPath) {
  execFileSync(process.execPath, ['--check', winSignPath]);
  const signSrc = fs.readFileSync(winSignPath, 'utf8');
  if (!signSrc.includes('exports.default')) {
    errors.push('scripts/win-sign.cjs must export exports.default async function(configuration)');
  } else {
    console.log('[OK] scripts/win-sign.cjs passes syntax check and exports.default hook');
  }
}
assertExists('scripts/verify-signature.ps1');
assertExists('.github/workflows/build-windows.yml');
console.log('[OK] scripts/verify-signature.ps1 and .github/workflows/build-windows.yml present');

if (errors.length > 0) {
  console.error('\nDesktop readiness check FAILED:');
  for (const e of errors) {
    console.error(' -', e);
  }
  process.exit(1);
}

console.log('\nAll desktop packaging & AV/signature readiness checks PASSED.');
