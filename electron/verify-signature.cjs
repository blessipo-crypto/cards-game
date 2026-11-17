'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

/**
 * @typedef {{ response: 'success' } | { response: 'failure'; message: string }} VerifyUpdateFileResult
 * @typedef {(publisherName: string[], targetPath: string) => Promise<VerifyUpdateFileResult>} VerifyUpdateFileAuthenticodeSignature
 */

/**
 * Normalizes a certificate Subject / SimpleName string for publisher matching.
 * Supports matching either exact Common Name ("Royal Velvet Suite") or CN= value inside Subject.
 * @param {string} subject
 * @param {string} simpleName
 * @param {string[]} expectedPublishers
 */
function matchesPublisher(subject, simpleName, expectedPublishers) {
  if (!Array.isArray(expectedPublishers) || expectedPublishers.length === 0) {
    return true;
  }

  const normalizedSimple = (simpleName || '').trim().toLowerCase();
  const normalizedSubject = (subject || '').trim().toLowerCase();

  return expectedPublishers.some((pub) => {
    const target = String(pub || '').trim().toLowerCase();
    if (!target) return false;
    if (normalizedSimple && normalizedSimple === target) return true;
    if (normalizedSubject === target) return true;
    // Match CN=<Publisher> inside X509 Distinguished Name
    const cnMatch = normalizedSubject.match(/(?:^|,\s*)cn=("([^"]+)"|([^,]+))/i);
    const extractedCn = (cnMatch && (cnMatch[2] || cnMatch[3]) ? (cnMatch[2] || cnMatch[3]).trim() : '');
    return Boolean(extractedCn && extractedCn === target);
  });
}

/**
 * Verifies the Authenticode digital signature, publisher identity, digest algorithm,
 * and RFC 3161 timestamp of a Windows executable or installer.
 *
 * Implements `VerifyUpdateFileAuthenticodeSignature`:
 * `(publisherName: string[], path: string) => Promise<VerifyUpdateFileResult>`
 *
 * @type {VerifyUpdateFileAuthenticodeSignature}
 */
async function verifyUpdateFileAuthenticodeSignature(publisherName, targetPath) {
  if (!targetPath || typeof targetPath !== 'string') {
    return { response: 'failure', message: 'Invalid executable path provided for signature verification.' };
  }

  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    return { response: 'failure', message: `Target file not found: ${resolvedPath}` };
  }

  if (process.platform !== 'win32') {
    return {
      response: 'failure',
      message: `Authenticode signature verification is only supported on Windows (current platform: ${process.platform}).`,
    };
  }

  const psScript = [
    '$ErrorActionPreference = "Stop"',
    '$sig = Get-AuthenticodeSignature -FilePath $env:RVS_VERIFY_TARGET',
    '$cert = $sig.SignerCertificate',
    '$ts = $sig.TimeStamperCertificate',
    '$obj = [ordered]@{',
    '  Status = [string]$sig.Status',
    '  StatusMessage = [string]$sig.StatusMessage',
    '  Subject = if ($cert) { [string]$cert.Subject } else { "" }',
    '  SimpleName = if ($cert) { [string]$cert.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false) } else { "" }',
    '  Thumbprint = if ($cert) { [string]$cert.Thumbprint } else { "" }',
    '  HashAlgorithm = if ($cert -and $cert.SignatureAlgorithm) { [string]$cert.SignatureAlgorithm.FriendlyName } else { "" }',
    '  HasTimestamp = ($null -ne $ts)',
    '}',
    '$obj | ConvertTo-Json -Compress',
  ].join('; ');

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      {
        env: { ...process.env, RVS_VERIFY_TARGET: resolvedPath },
        timeout: 15000,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = (stderr || error.message || 'Unknown PowerShell error').trim();
          resolve({
            response: 'failure',
            message: `Authenticode inspection failed: ${detail}`,
          });
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse((stdout || '').trim());
        } catch (parseErr) {
          resolve({
            response: 'failure',
            message: `Failed to parse Get-AuthenticodeSignature output: ${parseErr.message}`,
          });
          return;
        }

        if (parsed.Status !== 'Valid') {
          const reason = parsed.StatusMessage ? ` (${parsed.StatusMessage})` : '';
          resolve({
            response: 'failure',
            message: `Invalid Authenticode signature status "${parsed.Status}"${reason}`,
          });
          return;
        }

        const expectedPublishers = Array.isArray(publisherName) ? publisherName : [];
        if (!matchesPublisher(parsed.Subject, parsed.SimpleName, expectedPublishers)) {
          resolve({
            response: 'failure',
            message: `Publisher mismatch: signed by "${parsed.SimpleName || parsed.Subject}", expected one of [${expectedPublishers.join(', ')}].`,
          });
          return;
        }

        if (/sha1/i.test(parsed.HashAlgorithm || '')) {
          resolve({
            response: 'failure',
            message: `Weak signature algorithm "${parsed.HashAlgorithm}" detected; SHA-256 or stronger is required.`,
          });
          return;
        }

        if (!parsed.HasTimestamp) {
          resolve({
            response: 'failure',
            message: 'Missing RFC 3161 timestamp counter-signature on Authenticode certificate.',
          });
          return;
        }

        resolve({ response: 'success' });
      },
    );
  });
}

verifyUpdateFileAuthenticodeSignature.verifyUpdateFileAuthenticodeSignature =
  verifyUpdateFileAuthenticodeSignature;
verifyUpdateFileAuthenticodeSignature.default = verifyUpdateFileAuthenticodeSignature;

module.exports = verifyUpdateFileAuthenticodeSignature;

if (require.main === module) {
  const args = process.argv.slice(2);
  const fileArg = args[0];
  const publishers = args.slice(1);
  if (!fileArg) {
    console.error('Usage: node electron/verify-signature.cjs <exePath> [publisherName...]');
    process.exit(1);
  }
  verifyUpdateFileAuthenticodeSignature(publishers, fileArg).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.response === 'success' ? 0 : 1);
  });
}
