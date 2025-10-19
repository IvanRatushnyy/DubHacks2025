# Start Viz App Server with STRING MCP Integration
Write-Host "Starting DEA Visualization App Server..." -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
$envPath = Join-Path $PSScriptRoot ".." ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "Error: .env file not found at $envPath" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and configure your GEMINI_API_KEY" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node_modules exists
$nodeModulesPath = Join-Path $PSScriptRoot ".." "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "Error: node_modules not found. Please run setup first:" -ForegroundColor Red
    Write-Host "  cd .." -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Set environment variable for viz app port
$env:VIZ_PORT = "3001"

Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Port: $env:VIZ_PORT" -ForegroundColor Gray
Write-Host "  URL: http://localhost:$env:VIZ_PORT" -ForegroundColor Gray
Write-Host ""

# Start the server
Write-Host "Starting server (Ctrl+C to stop)..." -ForegroundColor Cyan
Write-Host ""

try {
    node server.js
}
catch {
    Write-Host ""
    Write-Host "Error starting server: $_" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
