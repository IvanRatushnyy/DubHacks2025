# Heroku CLI Installation Script for Windows
# This script downloads and installs the Heroku CLI

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Heroku CLI Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Heroku is already installed
$herokuInstalled = Get-Command heroku -ErrorAction SilentlyContinue

if ($herokuInstalled) {
    Write-Host "Heroku CLI is already installed!" -ForegroundColor Green
    heroku --version
    Write-Host ""
    Write-Host "If you want to reinstall, uninstall it first from Windows Settings." -ForegroundColor Yellow
    exit 0
}

Write-Host "Heroku CLI is not installed. Installing..." -ForegroundColor Yellow
Write-Host ""

# Download URL for Heroku CLI installer (64-bit)
$installerUrl = "https://cli-assets.heroku.com/channels/stable/heroku-x64.exe"
$installerPath = "$env:TEMP\heroku-installer.exe"

Write-Host "Downloading Heroku CLI installer..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
    Write-Host "Download complete!" -ForegroundColor Green
} catch {
    Write-Host "Failed to download Heroku CLI installer." -ForegroundColor Red
    Write-Host "Please download manually from: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Running installer..." -ForegroundColor Cyan
Write-Host "Please follow the installation wizard." -ForegroundColor Yellow
Write-Host ""

# Run the installer
Start-Process -FilePath $installerPath -Wait

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Close and reopen your terminal/PowerShell" -ForegroundColor Yellow
Write-Host "Then verify installation by running: heroku --version" -ForegroundColor Yellow
Write-Host ""

# Clean up installer
Remove-Item $installerPath -ErrorAction SilentlyContinue
