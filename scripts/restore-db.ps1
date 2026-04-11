param(
    [string]$ComposeFile = 'docker-compose.yml',
    [string]$ContainerName = 'pmp-postgres',
    [string]$Database = 'pmp_learning_app',
    [string]$User = 'postgres',
    [string]$InputFile = 'backups/pmp_learning_app.dump'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $InputFile)) {
    Write-Error "Backup file not found: $InputFile"
    exit 1
}

$containerDumpPath = "/tmp/$Database.restore.dump"

Write-Host "Copying $InputFile into $ContainerName..."
docker cp $InputFile "${ContainerName}:$containerDumpPath"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Restoring PostgreSQL database $Database..."
docker compose -f $ComposeFile exec -T postgres pg_restore `
    -U $User `
    -d $Database `
    --clean `
    --if-exists `
    --no-owner `
    --no-privileges `
    $containerDumpPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Restore complete from: $InputFile"
