<#
.SYNOPSIS
  Verifies Authenticode SHA-256 signatures, computes SHA-256 checksums,
  and runs a local Windows Defender antivirus pre-flight scan on built .exe artifacts.
#>
param(
  [string]$DistDir = "dist-win",
  [switch]$AllowUnsigned
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $DistDir)) {
  Write-Error "Build output directory '$DistDir' was not found. Run 'npm run pack:win' first."
  exit 1
}

$exeFiles = Get-ChildItem -Path $DistDir -Recurse -Filter "*.exe" | Sort-Object FullName
if ($exeFiles.Count -eq 0) {
  Write-Error "No .exe artifacts found under '$DistDir'."
  exit 1
}

Write-Host "`n=== 1. Authenticode Digital Signature Inspection ===" -ForegroundColor Cyan
$unsignedCount = 0
$invalidCount = 0
$hashLines = @()

foreach ($file in $exeFiles) {
  $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $relPath = Resolve-Path -Relative $file.FullName
  $hashLines += "$hash  $relPath"

  $sig = Get-AuthenticodeSignature -FilePath $file.FullName
  Write-Host ("[{0}] {1}" -f $sig.Status, $relPath)

  if ($sig.Status -eq "Valid") {
    $subject = $sig.SignerCertificate.Subject
    $algo = $sig.SignerCertificate.SignatureAlgorithm.FriendlyName
    $hasTimestamp = $null -ne $sig.TimeStamperCertificate
    Write-Host "   Signer    : $subject"
    Write-Host "   Algorithm : $algo | Timestamped: $hasTimestamp"
    if (-not $hasTimestamp) {
      Write-Warning "   Missing RFC 3161 timestamp! Signatures without a timestamp expire when the certificate expires."
    }
  } elseif ($sig.Status -eq "NotSigned") {
    $unsignedCount++
    Write-Warning "   Executable is NOT signed. Unsigned EXEs trigger Windows SmartScreen warnings."
  } else {
    $invalidCount++
    Write-Error "   Invalid signature status '$($sig.Status)': $($sig.StatusMessage)"
  }
}

$checksumFile = Join-Path $DistDir "SHA256SUMS.txt"
$hashLines | Set-Content -Path $checksumFile -Encoding UTF8
Write-Host "`nWrote checksum manifest: $checksumFile" -ForegroundColor Green

Write-Host "`n=== 2. Windows Defender Local Antivirus Scan ===" -ForegroundColor Cyan
$defenderCli = Join-Path $env:ProgramFiles "Windows Defender\MpCmdRun.exe"
if (Test-Path $defenderCli) {
  & $defenderCli -Scan -ScanType 3 -File (Resolve-Path $DistDir).Path
  $scanExit = $LASTEXITCODE
  if ($scanExit -eq 0) {
    Write-Host "Windows Defender scan passed with 0 detections." -ForegroundColor Green
  } elseif ($scanExit -eq 2) {
    Write-Error "Windows Defender detected a threat in '$DistDir' (exit code 2)."
    exit 2
  } else {
    Write-Warning "MpCmdRun.exe exited with code $scanExit (Defender service may be disabled on this runner). Run locally on Windows to verify."
  }
} else {
  Write-Warning "MpCmdRun.exe not found at '$defenderCli'. Skipping local Defender scan."
}

Write-Host "`n=== 3. Release Policy Summary ===" -ForegroundColor Cyan
if ($invalidCount -gt 0) {
  Write-Error "Signature verification failed due to $invalidCount invalid signature(s)."
  exit 1
}

if ($unsignedCount -gt 0 -and -not $AllowUnsigned) {
  Write-Error "Found $unsignedCount unsigned executable(s). Set WIN_CSC_LINK and WIN_CSC_KEY_PASSWORD (OV/EV certificate) for production release, or pass -AllowUnsigned for dev checks."
  exit 2
}

Write-Host "Desktop signature & AV hygiene verification complete." -ForegroundColor Green
