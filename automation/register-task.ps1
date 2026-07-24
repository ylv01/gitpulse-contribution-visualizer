[CmdletBinding()]
param([string]$TaskName = "GitPulse Daily Contribution Report")

$ErrorActionPreference = "Stop"
Import-Module ScheduledTasks -ErrorAction Stop

$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $PSScriptRoot "config.local.json"
if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Save automation settings from the GitPulse UI first."
}

$config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$runner = Join-Path $PSScriptRoot "run-daily.ps1"
$timeParts = [string]$config.schedule_time -split ":"
if ($timeParts.Count -ne 2) {
    throw "Invalid schedule_time in config.local.json. Expected HH:mm."
}
$scheduledAt = [DateTime]::Today.AddHours([int]$timeParts[0]).AddMinutes([int]$timeParts[1])

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" `
    -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $scheduledAt
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Generate and push the GitPulse contribution SVG." `
    -Force | Out-Null

$taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName

Write-Host "Scheduled task created: $TaskName at $($config.schedule_time)" -ForegroundColor Green
Write-Host "Project: $projectRoot" -ForegroundColor DarkGray
Write-Host "Next run: $($taskInfo.NextRunTime)" -ForegroundColor DarkGray
