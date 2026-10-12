# Edge secrets via Management API (CLI secrets set bazen Invalid access token veriyor).
param(
  [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN
)
$ErrorActionPreference = 'Stop'
$ref = 'ciaffmgszfvyrdoweirw'
$envFile = Join-Path $env:LOCALAPPDATA 'Sonvera\edge-secrets.env'
if (-not (Test-Path -LiteralPath $envFile)) { throw "Secrets dosyasi yok: $envFile" }
if (-not $AccessToken -or $AccessToken.Trim().Length -lt 20) {
  throw 'SUPABASE_ACCESS_TOKEN yok. login-and-set-secrets.ps1 ile token ver.'
}
$AccessToken = $AccessToken.Trim()

$secrets = @()
Get-Content -LiteralPath $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_.Split('=', 2)
  $secrets += @{ name = $name.Trim(); value = $value }
  Write-Host ("Hazir: " + $name.Trim())
}
if ($secrets.Count -lt 1) { throw 'edge-secrets.env bos' }

$body = $secrets | ConvertTo-Json -Compress
if ($secrets.Count -eq 1) { $body = "[$body]" }

Write-Host "API ile $($secrets.Count) secret yaziliyor..."
$headers = @{
  Authorization = "Bearer $AccessToken"
  'Content-Type' = 'application/json'
}
try {
  $resp = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$ref/secrets" -Headers $headers -Body $body
} catch {
  $detail = $_.ErrorDetails.Message
  if (-not $detail) { $detail = $_.Exception.Message }
  throw "Secrets API hata: $detail"
}

Write-Host 'Edge secrets OK.' -ForegroundColor Green
Write-Host 'Dogrulama (isimler):'
try {
  $listed = Invoke-RestMethod -Method Get -Uri "https://api.supabase.com/v1/projects/$ref/secrets" -Headers @{ Authorization = "Bearer $AccessToken" }
  ($listed | ForEach-Object { $_.name }) -join ', '
} catch {
  Write-Host '(liste okunamadi; yazma yine de basarili olabilir)'
}
