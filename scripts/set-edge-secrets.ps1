# Edge secrets. Once: npx supabase login  then run this.
$ErrorActionPreference = 'Stop'
$ref = 'ciaffmgszfvyrdoweirw'
$envFile = Join-Path $env:LOCALAPPDATA 'Sonvera\edge-secrets.env'
if (-not (Test-Path -LiteralPath $envFile)) { throw "Secrets dosyasi yok: $envFile" }
Get-Content -LiteralPath $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_.Split('=', 2)
  Write-Host "Setting $name ..."
  npx --yes supabase secrets set "$name=$value" --project-ref $ref
  if ($LASTEXITCODE -ne 0) { throw "secrets set failed: $name" }
}
Write-Host 'Edge secrets OK.'
npx --yes supabase secrets list --project-ref $ref
