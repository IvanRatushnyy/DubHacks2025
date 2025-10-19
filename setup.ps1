# Setup script for Gemini Chat App with STRING MCP
Write-Host "Setting up Gemini Chat App with STRING MCP..." -ForegroundColor Cyan

# Step 1: Install Node.js dependencies
Write-Host "`n[1/4] Installing Node.js dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing Node.js dependencies. Please run 'npm install' manually." -ForegroundColor Red
    exit 1
}

# Step 2: Clone STRING MCP server
Write-Host "`n[2/4] Cloning STRING MCP server..." -ForegroundColor Yellow
if (Test-Path "string-mcp") {
    Write-Host "STRING MCP directory already exists, skipping clone..." -ForegroundColor Green
} else {
    git clone https://github.com/meringlab/string-mcp.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error cloning STRING MCP. Please run manually: git clone https://github.com/meringlab/string-mcp.git" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Install Python dependencies for STRING MCP
Write-Host "`n[3/4] Installing Python dependencies for STRING MCP..." -ForegroundColor Yellow
if (Test-Path "string-mcp/requirements.txt") {
    python -m pip install -r string-mcp/requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error installing Python dependencies. Please run manually: python -m pip install -r string-mcp/requirements.txt" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Warning: string-mcp/requirements.txt not found" -ForegroundColor Yellow
}

# Step 4: Create .env file if it doesn't exist
Write-Host "`n[4/4] Setting up environment variables..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env file from .env.example" -ForegroundColor Green
    Write-Host "`nIMPORTANT: Please edit .env and add your Gemini API key!" -ForegroundColor Red
    Write-Host "Get your API key from: https://makersuite.google.com/app/apikey" -ForegroundColor Cyan
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file and add your GEMINI_API_KEY" -ForegroundColor White
Write-Host "2. Get API key from: https://makersuite.google.com/app/apikey" -ForegroundColor White
Write-Host "3. Run: npm start" -ForegroundColor White
Write-Host "4. Open: http://localhost:3000" -ForegroundColor White
