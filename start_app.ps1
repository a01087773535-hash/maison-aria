# Maison Aria - Store OS Launcher (PowerShell)
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  MAISON ARIA - Store OS Launcher (PowerShell)" -ForegroundColor Cyan
Write-Host "  folder: $PSScriptRoot" -ForegroundColor DarkCyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1) Node check
try {
  $nodeV = node -v
  Write-Host "[OK] Node.js detected: $nodeV" -ForegroundColor Green
} catch {
  Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
  Write-Host "        Install Node.js LTS from https://nodejs.org/" -ForegroundColor Yellow
  Read-Host "Press Enter to close"
  exit 1
}

# 2) server.js check
if (-not (Test-Path "server.js")) {
  Write-Host "[ERROR] server.js not found in this folder." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

# 3) install deps if needed
if (-not (Test-Path "node_modules")) {
  Write-Host "[INFO] Installing dependencies (first run only)..." -ForegroundColor Yellow
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
  }
} else {
  Write-Host "[OK] node_modules found." -ForegroundColor Green
}

# 4) run
Write-Host ""
Write-Host "[RUN] Starting Maison Aria Store OS ..." -ForegroundColor Green
Write-Host "      Open your browser:  http://localhost:3000" -ForegroundColor Green
Write-Host "      (Press Ctrl+C to stop)" -ForegroundColor DarkGray
Write-Host "------------------------------------------------------------"
npm start

Write-Host ""
Write-Host "Server exited." -ForegroundColor Yellow
Read-Host "Press Enter to close"
