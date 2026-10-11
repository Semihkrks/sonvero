param(
    [Parameter(Mandatory=$true)][string]$HostName,
    [string]$Port = '5432',
    [string]$Database = 'postgres',
    [Parameter(Mandatory=$true)][string]$UserName,
    [Parameter(Mandatory=$true)][guid]$OwnerId,
    [string]$PostgresBin = '',
    [string]$DailyAt = '21:00',
    [switch]$RegisterDailyTask
)
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskNode = (Get-Command node -ErrorAction Stop).Source
$taskTime = [DateTime]::ParseExact($DailyAt,'HH:mm',[Globalization.CultureInfo]::InvariantCulture)
$databasePassword = Read-Host 'PostgreSQL bağlantı parolası (gizli)' -AsSecureString
$backupPassword = Read-Host 'Yedek şifreleme parolası (en az 16 karakter, ayrı güvenli yerde saklayın)' -AsSecureString
if ($backupPassword.Length -lt 16) { throw 'Yedek parolası en az 16 karakter olmalı.' }
$taskDirectory = Join-Path $env:LOCALAPPDATA 'Sonvera'
New-Item -ItemType Directory -Path $taskDirectory -Force | Out-Null
$taskConfigPath = Join-Path $taskDirectory 'backup-config.clixml'
# Export-Clixml encrypts SecureString values with Windows DPAPI for this user/machine.
[pscustomobject]@{
    ProjectRoot=$taskRoot;NodePath=$taskNode;HostName=$HostName;Port=$Port;Database=$Database
    UserName=$UserName;OwnerId=$OwnerId.ToString();PostgresBin=$PostgresBin
    DatabasePassword=$databasePassword;BackupPassword=$backupPassword
} | Export-Clixml -LiteralPath $taskConfigPath
$taskIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$taskAcl = New-Object Security.AccessControl.FileSecurity
$taskAcl.SetAccessRuleProtection($true,$false)
$taskAcl.SetOwner($taskIdentity.User)
$taskRule = New-Object Security.AccessControl.FileSystemAccessRule($taskIdentity.User,'FullControl','Allow')
$taskAcl.AddAccessRule($taskRule)
Set-Acl -LiteralPath $taskConfigPath -AclObject $taskAcl
if ($RegisterDailyTask) {
    $taskScript = Join-Path $taskRoot 'scripts\run-backup.ps1'
    $taskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "'+$taskScript+'"') -WorkingDirectory $taskRoot
    $taskTrigger = New-ScheduledTaskTrigger -Daily -At $taskTime
    $taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
    $taskPrincipal = New-ScheduledTaskPrincipal -UserId $taskIdentity.Name -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName 'Sonvera Encrypted Backup' -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -Principal $taskPrincipal -Description 'Sonvera şifreli yerel yedek. Kullanıcı oturumu açık olmalı.' -Force | Out-Null
    Write-Output ('Günlük yedek görevi '+$DailyAt+' için kaydedildi. Bilgisayar ve kullanıcı oturumu açık olmalı.')
}
Write-Output 'Parolalar bu Windows kullanıcısı için şifreli kaydedildi. Yapılandırma dosyası başka kullanıcı/bilgisayarda açılamaz. Bu komut henüz yedek almadı.'
