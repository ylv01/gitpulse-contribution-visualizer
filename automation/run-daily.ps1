[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $projectRoot "backend\.venv\Scripts\python.exe"
$runner = Join-Path $projectRoot "backend\scripts\run_automation.py"
$configPath = Join-Path $PSScriptRoot "config.local.json"

if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Save automation settings from the GitPulse UI first."
}

$config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($config.require_proxy) {
    $patterns = @("Wintun", "TUN", "TAP", "Clash", "WireGuard", "sing-box", "vEthernet")
    $matched = @(Get-NetAdapter -ErrorAction Stop | Where-Object Status -eq "Up" | Where-Object {
        $description = "$($_.Name) $($_.InterfaceDescription)"
        foreach ($pattern in $patterns) {
            if ($description -match $pattern) { return $true }
        }
        return $false
    })
    if ($matched.Count -eq 0) {
        Write-Host "No connected proxy virtual adapter was detected. Skipping." -ForegroundColor Yellow
        exit 0
    }
    try {
        Invoke-WebRequest -Uri "https://api.github.com/rate_limit" -Headers @{ "User-Agent" = "gitpulse-automation" } -TimeoutSec 12 -UseBasicParsing | Out-Null
    } catch {
        Write-Host "GitHub API is unreachable. Skipping." -ForegroundColor Yellow
        exit 0
    }
}

if (Test-Path -LiteralPath $venvPython) {
    & $venvPython $runner
} else {
    & python $runner
}

if ($LASTEXITCODE -ne 0) { throw "GitPulse automation failed with exit code $LASTEXITCODE." }
