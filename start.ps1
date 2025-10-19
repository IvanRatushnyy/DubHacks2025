# Start the Gemini Chat App
Write-Host "Starting Gemini Chat App with STRING MCP..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

# Make sure we're in the right directory
Set-Location $PSScriptRoot

# Start the server
node server.js
