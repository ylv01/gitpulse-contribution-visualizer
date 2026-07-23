[CmdletBinding()]
param([string]$TaskName = "GitPulse Daily Contribution Report")

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $PSScriptRoot "config.local.json"
if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Save automation settings from the GitPulse UI first."
}

$config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$runner = Join-Path $PSScriptRoot "run-daily.ps1"
$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$runner`""

schtasks.exe /Create /SC DAILY /ST $config.schedule_time /TN $TaskName /TR $taskCommand /F
if ($LASTEXITCODE -ne 0) { throw "Scheduled task creation failed." }

Write-Host "Scheduled task created: $TaskName at $($config.schedule_time)" -ForegroundColor Green
Write-Host "Project: $projectRoot" -ForegroundColor DarkGray
