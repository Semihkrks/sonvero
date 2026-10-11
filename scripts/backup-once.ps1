# Tek seferlik sifreli yedek. Sifreleri ekrana yazdirmaz.
# Host/user mutlaka Dashboard > Connect > Session pooler'dan kopyalanmali (aws-0 tahmin edilmez).
param(
  [string]$HostName = 'aws-1-eu-north-1.pooler.supabase.com',
  [string]$UserName = 'postgres.ciaffmgszfvyrdoweirw',
  [string]$Port = '5432',
  [string]$Database = 'postgres'
)
$ErrorActionPreference = 'Stop'
try {
  $bin = Join-Path $env:LOCALAPPDATA 'Sonvera\pgsql\pgsql\bin'
  if (-not (Test-Path (Join-Path $bin 'pg_dump.exe'))) {
    throw "pg_dump yok: $bin"
  }
  $env:Path = $bin + ';' + $env:Path

  Write-Host ''
  Write-Host 'Supabase Dashboard > Connect > Session pooler ac.'
  Write-Host 'Oradaki Host ve User degerlerini asagiya YAPISTIR (tahmin etme).'
  Write-Host 'Ornek host: aws-1-xx-xxxx-x.pooler.supabase.com'
  Write-Host 'Ornek user: postgres.ciaffmgszfvyrdoweirw'
  Write-Host ''

  if (-not $HostName) { $HostName = Read-Host 'Host (Session pooler)' }
  if (-not $UserName) { $UserName = Read-Host 'User' }
  $HostName = $HostName.Trim()
  $UserName = $UserName.Trim()
  if ($HostName -match '^postgres(?:ql)?://') {
    throw 'URI degil; sadece Host satirini yapistir (aws-...pooler.supabase.com).'
  }
  if ($HostName -notmatch 'pooler\.supabase\.com$' -and $HostName -notmatch '^db\..+\.supabase\.co$') {
    Write-Host 'Uyari: Host beklenen supabase biciminde degil; devam ediliyor.' -ForegroundColor Yellow
  }
  if ($UserName -notmatch '\.') {
    Write-Host 'Uyari: Shared pooler icin user genelde postgres.PROJE_REF olmali.' -ForegroundColor Yellow
  }

  $env:PGHOST = $HostName
  $env:PGPORT = $Port
  $env:PGDATABASE = $Database
  $env:PGUSER = $UserName
  $env:PGSSLMODE = 'require'
  $env:PGPASSWORD = Read-Host 'DB sifresi'
  $env:SONVERA_BACKUP_PASSWORD = Read-Host 'Yedek sifresi (16+ karakter)'

  Write-Host "Bag: $env:PGUSER@$env:PGHOST`:$env:PGPORT /$env:PGDATABASE"
  $probe = & (Join-Path $bin 'psql.exe') --no-psqlrc -v ON_ERROR_STOP=1 -c 'select 1 as ok;' 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host ($probe | Out-String)
    throw @'
Bag baglantisi basarisiz.
- Host/User Dashboard > Connect > Session pooler ile birebir ayni mi?
- aws-0 tahmin etme; Connect ekranindaki hostu kopyala.
- Hata yine ENOTFOUND ise proje pooler kaydi bozuk olabilir: Supabase Support veya IPv4 add-on.
'@
  }
  Write-Host 'Bag baglantisi OK. Yedek aliniyor...'
  Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
  npm run backup
  if ($LASTEXITCODE -ne 0) { throw 'Yedek basarisiz.' }
  Write-Host 'Tamam. backups\ klasorune bakin.'
} catch {
  Write-Host ''
  Write-Host ("HATA: " + $_.Exception.Message) -ForegroundColor Red
}
Read-Host 'Kapatmak icin Enter'
