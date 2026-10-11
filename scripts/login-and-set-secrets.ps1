$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
Write-Host 'Tarayicide supabase login tamamla; sonra secrets yazilacak.'
npx --yes supabase login
if ($LASTEXITCODE -ne 0) { Read-Host 'Login basarisiz. Enter'; exit 1 }
& (Join-Path $PSScriptRoot 'set-edge-secrets.ps1')
Read-Host 'Bitti. Enter'
