param(
    [string]$ComposeFile = 'docker-compose.yml',
    [string]$ContainerName = 'pmp-postgres',
    [string]$Database = 'pmp_learning_app',
    [string]$User = 'postgres',
    [string]$OutputFile = 'backups/pmp_learning_app.dump'
)

$ErrorActionPreference = 'Stop'

$backupDirectory = Split-Path -Parent $OutputFile
if ($backupDirectory -and -not (Test-Path $backupDirectory)) {
    New-Item -ItemType Directory -Path $backupDirectory | Out-Null
}

$containerDumpPath = "/tmp/$Database.dump"

Write-Host "Creating PostgreSQL backup inside $ContainerName..."
docker compose -f $ComposeFile exec -T postgres pg_dump `
    -U $User `
    -d $Database `
    --format=custom `
    --clean `
    --if-exists `
    --no-owner `
    --no-privileges `
    --file=$containerDumpPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Copying backup to $OutputFile..."
docker cp "${ContainerName}:$containerDumpPath" $OutputFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Backup complete: $OutputFile"
