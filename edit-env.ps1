# Helper script to open .env file for editing
Write-Host "Opening .env file for editing..." -ForegroundColor Cyan
Write-Host "`nPlease add your Gemini API key:" -ForegroundColor Yellow
Write-Host "1. Get your API key from: https://makersuite.google.com/app/apikey" -ForegroundColor White
Write-Host "2. Replace 'your_gemini_api_key_here' with your actual key" -ForegroundColor White
Write-Host "3. Save the file" -ForegroundColor White
Write-Host "`nPress any key to open .env file..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

notepad .env
