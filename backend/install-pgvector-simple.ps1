# pgvector Installation Script for PostgreSQL 16
# Run as Administrator

$pgvectorVersion = "0.7.4"
$pgPath = "C:\Program Files\PostgreSQL\16"
$dbPassword = "REDACTED_PASSWORD"
$projectPath = "C:\Users\david\Cursor Projects\-dungeonsanddumbells"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "pgvector Installation for PostgreSQL 16" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host ""
    Write-Host "ERROR - Not running as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select Run as Administrator" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK - Running as Administrator" -ForegroundColor Green

# Step 1 - Download
Write-Host ""
Write-Host "Step 1 - Downloading pgvector" -ForegroundColor Cyan
$tempDir = "$env:TEMP\pgvector"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$downloadUrl = "https://github.com/pgvector/pgvector/releases/download/v$pgvectorVersion/pgvector-v$pgvectorVersion-windows-x64-pg16.zip"
$zipFile = "$tempDir\pgvector.zip"

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile
    Write-Host "OK - Download complete" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Download failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 2 - Extract
Write-Host ""
Write-Host "Step 2 - Extracting files" -ForegroundColor Cyan
try {
    Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force
    Write-Host "OK - Files extracted" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Extraction failed" -ForegroundColor Red
    exit 1
}

# Step 3 - Install Files
Write-Host ""
Write-Host "Step 3 - Installing files to PostgreSQL" -ForegroundColor Cyan

if (-not (Test-Path $pgPath)) {
    Write-Host "ERROR - PostgreSQL 16 not found at $pgPath" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "Copying vector.dll..." -ForegroundColor White
    Copy-Item "$tempDir\pgsql\lib\vector.dll" -Destination "$pgPath\lib" -Force

    Write-Host "Copying extension files..." -ForegroundColor White
    Copy-Item "$tempDir\pgsql\share\extension\vector*.sql" -Destination "$pgPath\share\extension" -Force
    Copy-Item "$tempDir\pgsql\share\extension\vector.control" -Destination "$pgPath\share\extension" -Force

    Write-Host "OK - Files installed" -ForegroundColor Green
} catch {
    Write-Host "ERROR - File installation failed" -ForegroundColor Red
    exit 1
}

# Step 4 - Restart PostgreSQL
Write-Host ""
Write-Host "Step 4 - Restarting PostgreSQL service" -ForegroundColor Cyan
$pgService = Get-Service | Where-Object { $_.Name -like "postgresql*" -and $_.Status -eq "Running" }

if ($pgService) {
    Write-Host "Found service $($pgService.Name)" -ForegroundColor White
    try {
        Restart-Service -Name $pgService.Name -Force
        Start-Sleep -Seconds 5
        Write-Host "OK - PostgreSQL restarted" -ForegroundColor Green
    } catch {
        Write-Host "WARNING - Failed to restart automatically" -ForegroundColor Yellow
        Write-Host "Please restart PostgreSQL manually via Services" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING - PostgreSQL service not found" -ForegroundColor Yellow
}

# Step 5 - Enable Extension
Write-Host ""
Write-Host "Step 5 - Enabling vector extension" -ForegroundColor Cyan
$env:PGPASSWORD = $dbPassword
Set-Location "$projectPath\backend"

try {
    $result = & "$pgPath\bin\psql.exe" -U postgres -h localhost -d dumbbells_dragons_dev -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK - Extension enabled" -ForegroundColor Green
    } else {
        Write-Host "WARNING - Extension creation issue" -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING - Will enable via migration" -ForegroundColor Yellow
}

# Step 6 - Cleanup
Write-Host ""
Write-Host "Step 6 - Cleaning up" -ForegroundColor Cyan
Remove-Item -Path $tempDir -Recurse -Force
Write-Host "OK - Cleanup complete" -ForegroundColor Green

# Step 7 - Verify
Write-Host ""
Write-Host "Step 7 - Verifying installation" -ForegroundColor Cyan

$dllExists = Test-Path "$pgPath\lib\vector.dll"
$extensionFiles = Get-ChildItem "$pgPath\share\extension\vector*" -ErrorAction SilentlyContinue

if ($dllExists) {
    Write-Host "vector.dll - OK" -ForegroundColor Green
} else {
    Write-Host "vector.dll - ERROR" -ForegroundColor Red
}

if ($extensionFiles) {
    Write-Host "Extension files - OK ($($extensionFiles.Count) files)" -ForegroundColor Green
} else {
    Write-Host "Extension files - ERROR" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking database..." -ForegroundColor White
$dbCheck = & "$pgPath\bin\psql.exe" -U postgres -h localhost -d dumbbells_dragons_dev -t -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';" 2>&1
if ($dbCheck -match '\d+\.\d+') {
    Write-Host "pgvector version $($dbCheck.Trim())" -ForegroundColor Green
} else {
    Write-Host "pgvector not yet in database (will be enabled via migration)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host ""
Write-Host "Next steps" -ForegroundColor Cyan
Write-Host "1. Run migration - npm run migrate" -ForegroundColor White
Write-Host "2. Add OpenAI API key to .env file" -ForegroundColor White
Write-Host "3. Restart backend - npm run dev" -ForegroundColor White

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
