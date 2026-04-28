# Jalankan npm/node dengan Node 20 dari npx (tanpa nvm).
# npm.ps1 / npm.cmd di Windows memakai node.exe instalasi global — skrip ini memakai npm-cli.js + Node 20.
# Contoh:
#   .\scripts\run-with-node20.ps1 npm run build
#   .\scripts\run-with-node20.ps1 npm run preview
#
param(
  [Parameter(Mandatory = $false, ValueFromRemainingArguments = $true)]
  [string[]] $RemainingArgs
)

# npx/npm menulis warning ke stderr; dengan $ErrorActionPreference Stop, PowerShell bisa menghentikan skrip lebih awal
$ErrorActionPreference = "Continue"

$node20bin = (
  npx -y node@20.18.3 -e "process.stdout.write(require('path').dirname(process.execPath))" 2>$null
).Trim()
$nodeExe = Join-Path $node20bin "node.exe"
if (-not (Test-Path -LiteralPath $nodeExe)) {
  Write-Error "Tidak bisa menemukan Node 20 dari npx."
  exit 1
}

$npmCmd = Get-Command npm.cmd -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $npmCmd) {
  Write-Error "npm.cmd tidak ditemukan (pasang Node.js)."
  exit 1
}
$npmRoot = Split-Path $npmCmd.Source
$npmCliJs = Join-Path $npmRoot "node_modules\npm\bin\npm-cli.js"
if (-not (Test-Path -LiteralPath $npmCliJs)) {
  Write-Error "Tidak menemukan npm-cli.js di $npmCliJs"
  exit 1
}

Write-Host "Node $(& $nodeExe -v) | $node20bin" -ForegroundColor DarkGray

if ($RemainingArgs.Count -eq 0) {
  Write-Host "Usage: .\scripts\run-with-node20.ps1 npm <args...>"
  Write-Host "Contoh: .\scripts\run-with-node20.ps1 npm run build"
  exit 1
}

if ($RemainingArgs[0] -eq "npm") {
  $tail = @()
  if ($RemainingArgs.Length -gt 1) {
    $tail = $RemainingArgs[1..($RemainingArgs.Length - 1)]
  }
  $ErrorActionPreference = "Continue"
  & $nodeExe $npmCliJs @tail
  exit $LASTEXITCODE
}

if ($RemainingArgs[0] -eq "node") {
  $tail = @()
  if ($RemainingArgs.Length -gt 1) {
    $tail = $RemainingArgs[1..($RemainingArgs.Length - 1)]
  }
  & $nodeExe @tail
  exit $LASTEXITCODE
}

Write-Host "Awali dengan npm atau node (contoh: npm run build)." -ForegroundColor Yellow
exit 1
