param(
    [string]$ComposeFile = 'docker-compose.yml',
    [string]$SourceDirectory = '/pdf_to_csv/csv'
)

$ErrorActionPreference = 'Stop'

Write-Host 'Clearing existing database...'
docker compose -f $ComposeFile exec backend node src/db/clear.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Running database migration inside backend container...'
docker compose -f $ComposeFile exec backend node src/db/migrate.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Importing CSV data from $SourceDirectory into PostgreSQL..."
docker compose -f $ComposeFile exec backend node src/import/run-import.js $SourceDirectory
exit $LASTEXITCODE