param()
$ErrorActionPreference = 'Stop'
$taskConfigPath = Join-Path $env:LOCALAPPDATA 'Sonvera\backup-config.clixml'
if (-not (Test-Path -LiteralPath $taskConfigPath)) { throw 'Yedek yapılandırması yok. configure-backup.ps1 ile oluşturun.' }
$taskConfig = Import-Clixml -LiteralPath $taskConfigPath
function Convert-Secret([Security.SecureString]$Value) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
$taskPrevious = @{}
$taskNames = @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','SONVERA_BACKUP_PASSWORD','SONVERA_OWNER_USER_ID','PATH')
foreach ($taskName in $taskNames) { $taskPrevious[$taskName] = [Environment]::GetEnvironmentVariable($taskName,'Process') }
try {
    $env:PGHOST = $taskConfig.HostName
    $env:PGPORT = $taskConfig.Port
    $env:PGDATABASE = $taskConfig.Database
    $env:PGUSER = $taskConfig.UserName
    $env:PGSSLMODE = 'require'
    $env:PGPASSWORD = Convert-Secret $taskConfig.DatabasePassword
    $env:SONVERA_BACKUP_PASSWORD = Convert-Secret $taskConfig.BackupPassword
    $env:SONVERA_OWNER_USER_ID = $taskConfig.OwnerId
    if ($taskConfig.PostgresBin) { $env:PATH = $taskConfig.PostgresBin + ';' + $env:PATH }
    Push-Location -LiteralPath $taskConfig.ProjectRoot
    try {
        & $taskConfig.NodePath (Join-Path $taskConfig.ProjectRoot 'scripts\backup.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'Yedekleme tamamlanamadı. Görev geçmişini kontrol edin.' }
    } finally { Pop-Location }
} finally {
    foreach ($taskName in $taskNames) { [Environment]::SetEnvironmentVariable($taskName,$taskPrevious[$taskName],'Process') }
}
