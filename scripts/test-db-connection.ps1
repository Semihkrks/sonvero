# Interactive only. Passwords are never printed.
param(
  [string]$ProjectRef = 'ciaffmgszfvyrdoweirw',
  [string]$Region = 'eu-central-1'
)
$ErrorActionPreference = 'Stop'
$bin = Join-Path $env:LOCALAPPDATA 'Sonvera\pgsql\pgsql\bin'
if (-not (Test-Path (Join-Path $bin 'pg_dump.exe'))) { throw "pg_dump yok: $bin" }
$env:Path = $bin + ';' + $env:Path
$env:PGDATABASE = 'postgres'
$env:PGSSLMODE = 'require'
$env:PGPASSWORD = Read-Host 'DB sifresi'

Write-Host '1) Direkt host (genelde sadece IPv6)...'
$env:PGHOST = "db.$ProjectRef.supabase.co"
$env:PGPORT = '5432'
$env:PGUSER = 'postgres'
& (Join-Path $bin 'psql.exe') --no-psqlrc -c 'select current_database() as db, current_user as usr;' 2>&1 | ForEach-Object { $_ }
$directOk = ($LASTEXITCODE -eq 0)

if (-not $directOk) {
  Write-Host ''
  Write-Host "2) Session pooler IPv4: aws-0-$Region.pooler.supabase.com ..."
  $env:PGHOST = "aws-0-$Region.pooler.supabase.com"
  $env:PGPORT = '5432'
  $env:PGUSER = "postgres.$ProjectRef"
  & (Join-Path $bin 'psql.exe') --no-psqlrc -c 'select current_database() as db, current_user as usr;' 2>&1 | ForEach-Object { $_ }
  if ($LASTEXITCODE -ne 0) {
    throw 'Bag baglantisi kurulamadi. Sifre yanlis olabilir veya Region farkli. Dashboard > Database > Connection string > Session mode hostunu kullanin.'
  }
  Write-Host 'Pooler ile baglanti OK.'
} else {
  Write-Host 'Direkt baglanti OK.'
}

Write-Host ''
Write-Host 'pg_dump kisa deneme (sadece sema listesi)...'
& (Join-Path $bin 'pg_dump.exe') --schema-only --schema=public --no-owner --no-acl 2>&1 | Select-Object -First 20
if ($LASTEXITCODE -ne 0) { throw "pg_dump hata kodu: $LASTEXITCODE" }
Write-Host 'pg_dump OK. Yedek icin: .\scripts\backup-once.ps1'
