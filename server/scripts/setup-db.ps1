param(
  [string]$RootPassword
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir '..\database\setup.sql'

if (-not (Test-Path $sqlFile)) {
  Write-Error "setup.sql not found at $sqlFile"
}

if (-not $RootPassword) {
  $secure = Read-Host 'Enter MySQL root password' -AsSecureString
  $RootPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

Write-Host 'Creating database and attendance_app user...'
& mysql -u root "-p$RootPassword" < $sqlFile

if ($LASTEXITCODE -ne 0) {
  Write-Error 'MySQL setup failed. Check your root password and that MySQL is running.'
}

Write-Host 'Database setup complete.'
Write-Host 'App credentials are in server/.env (user: attendance_app)'
