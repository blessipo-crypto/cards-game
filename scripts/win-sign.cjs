'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, execSync } = require('node:child_process');

/**
 * Locate Windows SDK signtool.exe or fallback to PATH.
 */
function findSignTool() {
  if (process.env.SIGNTOOL_PATH && fs.existsSync(process.env.SIGNTOOL_PATH)) {
    return process.env.SIGNTOOL_PATH;
  }

  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const kitsRoot = path.join(programFilesX86, 'Windows Kits', '10', 'bin');
  if (fs.existsSync(kitsRoot)) {
    const versions = fs
      .readdirSync(kitsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d+\./.test(d.name))
      .map((d) => d.name)
      .sort()
      .reverse();

    for (const ver of versions) {
      const candidate = path.join(kitsRoot, ver, 'x64', 'signtool.exe');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return 'signtool.exe';
}

/**
 * Resolve WIN_CSC_LINK / CSC_LINK either as an existing .pfx file path
 * or as a base64-encoded PFX payload (with or without data URI prefix).
 */
function resolvePfxCertificate(cscLink) {
  const trimmed = cscLink.trim();
  if (fs.existsSync(trimmed)) {
    return { pfxPath: path.resolve(trimmed), isTemp: false };
  }

  const base64Payload = trimmed.replace(/^data:application\/x-pkcs12;base64,/i, '');
  const tempPath = path.join(
    os.tmpdir(),
    `rvs-codesign-${process.pid}-${Date.now()}.pfx`,
  );
  fs.writeFileSync(tempPath, Buffer.from(base64Payload, 'base64'), { mode: 0o600 });
  return { pfxPath: tempPath, isTemp: true };
}

/**
 * electron-builder custom Windows code-signing hook (`win.signtoolOptions.sign`).
 * Supports:
 *  1. External HSM / Cloud Signing CLI via WIN_SIGN_TOOL_CMD (supports {file} placeholder)
 *  2. Standard OV/EV Authenticode PFX via WIN_CSC_LINK + WIN_CSC_KEY_PASSWORD
 *  3. Graceful unsigned passthrough when no cert is configured (unless REQUIRE_CODE_SIGN=true)
 *
 * @param {import('electron-builder').CustomWindowsSignTaskConfiguration} configuration
 */
exports.default = async function signWindowsBinary(configuration) {
  const targetPath = configuration && configuration.path;
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }

  const hashAlg = (configuration.hash || 'sha256').toLowerCase();
  const timestampServer =
    process.env.RFC3161_TIMESTAMP_SERVER || 'http://timestamp.digicert.com';

  // Option 1: External cloud HSM / Azure Trusted Signing / DigiCert KeyLocker command
  const customCmd = process.env.WIN_SIGN_TOOL_CMD;
  if (customCmd && customCmd.trim()) {
    const cmd = customCmd.includes('{file}')
      ? customCmd.replaceAll('{file}', `"${targetPath}"`)
      : `${customCmd} "${targetPath}"`;
    console.log(`[win-sign] Signing ${path.basename(targetPath)} via WIN_SIGN_TOOL_CMD...`);
    execSync(cmd, { stdio: 'inherit' });
    return;
  }

  // Option 2: Standard Authenticode .pfx certificate
  const cscLink = process.env.WIN_CSC_LINK || process.env.CSC_LINK || '';
  const cscPassword = process.env.WIN_CSC_KEY_PASSWORD || process.env.CSC_KEY_PASSWORD || '';

  if (!cscLink.trim()) {
    if (process.env.REQUIRE_CODE_SIGN === 'true') {
      throw new Error(
        `Code signing is required (REQUIRE_CODE_SIGN=true), but WIN_CSC_LINK / WIN_SIGN_TOOL_CMD is not set for ${targetPath}.`,
      );
    }
    console.log(
      `[win-sign] No WIN_CSC_LINK or WIN_SIGN_TOOL_CMD set; skipping signing for ${path.basename(targetPath)}.`,
    );
    return;
  }

  if (process.platform !== 'win32') {
    throw new Error('signtool.exe Authenticode signing must run on Windows.');
  }

  const signtool = findSignTool();
  const { pfxPath, isTemp } = resolvePfxCertificate(cscLink);

  try {
    const args = [
      'sign',
      '/f',
      pfxPath,
    ];

    if (cscPassword) {
      args.push('/p', cscPassword);
    }

    if (configuration.isNest) {
      args.push('/as');
    }

    args.push(
      '/fd',
      hashAlg,
      '/tr',
      timestampServer,
      '/td',
      'sha256',
      '/d',
      'Royal Velvet Suite',
      targetPath,
    );

    console.log(
      `[win-sign] Signing ${path.basename(targetPath)} (${hashAlg.toUpperCase()} + RFC3161)...`,
    );
    execFileSync(signtool, args, { stdio: 'inherit' });
  } finally {
    if (isTemp && fs.existsSync(pfxPath)) {
      fs.unlinkSync(pfxPath);
    }
  }
};
