# Edge secrets: PAT + Management API. Pencere hata olsa da acik kalir.
$ErrorActionPreference = 'Continue'
try {
  Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
  Write-Host ''
  Write-Host '=== Sonvera Edge secrets ===' -ForegroundColor Cyan
  Write-Host '1) Token sayfasi aciliyor. Generate new token (tum yetkiler).'
  Write-Host '2) Tokeni buraya yapistir (sohbete YAZMA).'
  Write-Host ''

  Start-Process 'https://supabase.com/dashboard/account/tokens'

  $secure = Read-Host 'Supabase access token (sbp_...)' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

  if (-not $token -or $token.Trim().Length -lt 20) {
    throw 'Token bos veya cok kisa.'
  }
  $token = $token.Trim()
  $env:SUPABASE_ACCESS_TOKEN = $token

  Write-Host 'CLI login (opsiyonel)...'
  npx --yes supabase login --token $token --name sonvera-local --agent no 2>&1 | Out-Host

  Write-Host 'Secrets Management API ile yaziliyor...'
  & (Join-Path $PSScriptRoot 'set-edge-secrets.ps1') -AccessToken $token

  Write-Host ''
  Write-Host 'TAMAM: Edge secrets yazildi.' -ForegroundColor Green
} catch {
  Write-Host ''
  Write-Host ('HATA: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host 'Tokenu Dashboard > Access Tokens icinden iptal edip yenisini uret.'
} finally {
  Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
  Write-Host ''
  Read-Host 'Kapatmak icin Enter'
}
