$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting FastAPI at http://localhost:8000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location -LiteralPath '$ProjectRoot\backend'; if (-not (Test-Path .venv)) { python -m venv .venv }; .\.venv\Scripts\python -m pip install -r requirements.txt; .\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"
)

Write-Host "Starting Next.js at http://localhost:3000" -ForegroundColor Magenta
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location -LiteralPath '$ProjectRoot\frontend'; if (-not (Test-Path node_modules)) { npm install }; npm run dev"
)

