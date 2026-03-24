# Show-McpLog.ps1
# Pretty-prints the MCP / proxy logs in a human-readable table.
#
# Usage:
#   .\Show-McpLog.ps1                          # last 50 lines of both logs
#   .\Show-McpLog.ps1 -Last 20                 # last 20 lines
#   .\Show-McpLog.ps1 -Log proxy               # proxy log only
#   .\Show-McpLog.ps1 -Log mcp                 # server log only
#   .\Show-McpLog.ps1 -Level tool              # filter by level
#   .\Show-McpLog.ps1 -Follow                  # tail -f style (Ctrl+C to stop)

param(
    [ValidateSet("both", "proxy", "mcp")]
    [string] $Log = "both",

    [ValidateSet("all", "tool", "http", "network", "proxy")]
    [string] $Level = "all",

    [int]    $Last = 50,
    [switch] $Follow
)

$dir = $PSScriptRoot
$proxyLog = Join-Path $dir "keycloak-proxy.log"
$mcpLog = Join-Path $dir "keycloak-mcp.log"

function Read-Entries ([string]$file, [string]$source) {
    if (-not (Test-Path $file)) { return }
    Get-Content $file | ForEach-Object {
        try {
            $e = $_ | ConvertFrom-Json
            [PSCustomObject]@{
                Time    = ([datetime]$e.ts).ToString("HH:mm:ss.fff")
                Source  = $source
                Level   = $e.level
                Summary = $e.summary
                _ts     = $e.ts
            }
        }
        catch { }
    }
}

function Show-Entries {
    $entries = @()
    if ($Log -in "both", "proxy") { $entries += Read-Entries $proxyLog "proxy" }
    if ($Log -in "both", "mcp") { $entries += Read-Entries $mcpLog   "mcp" }

    $entries = $entries | Sort-Object _ts

    if ($Level -ne "all") {
        $entries = $entries | Where-Object { $_.Level -eq $Level }
    }

    $entries = $entries | Select-Object -Last $Last

    $entries | Format-Table Time, Source, Level, Summary -AutoSize -Wrap
}

if ($Follow) {
    Write-Host "Following logs (Ctrl+C to stop)…`n"
    $seen = @{}
    while ($true) {
        $entries = @()
        if ($Log -in "both", "proxy") { $entries += Read-Entries $proxyLog "proxy" }
        if ($Log -in "both", "mcp") { $entries += Read-Entries $mcpLog   "mcp" }

        $entries = $entries | Sort-Object _ts

        foreach ($e in $entries) {
            $key = "$($e._ts)|$($e.Summary)"
            if (-not $seen[$key]) {
                $seen[$key] = $true
                if ($Level -eq "all" -or $e.Level -eq $Level) {
                    "{0}  {1,-5}  {2,-7}  {3}" -f $e.Time, $e.Source, $e.Level, $e.Summary
                }
            }
        }
        Start-Sleep -Milliseconds 500
    }
}
else {
    Show-Entries
}
