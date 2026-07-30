# Google Play 업로드용 Android App Bundle (AAB) 빌드
# 실행: mobile-rn 폴더에서
#   powershell -ExecutionPolicy Bypass -File .\scripts\build-play-aab.ps1

$ErrorActionPreference = "Stop"

$mobileRnRoot = Split-Path $PSScriptRoot -Parent
$propsPath = Join-Path $mobileRnRoot "android\keystore.properties"
$googleServices = Join-Path $mobileRnRoot "android\app\google-services.json"
$androidDir = Join-Path $mobileRnRoot "android"
$aabOutput = Join-Path $mobileRnRoot "android\app\build\outputs\bundle\release\app-release.aab"
$distDir = Join-Path $mobileRnRoot "dist"
$distAab = Join-Path $distDir "lavesco-1.0.1-internal.aab"

function Fail($message) {
    Write-Host "ERROR: $message" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $propsPath)) {
    Fail @"
keystore.properties not found.
1. Copy android\keystore.properties.example to android\keystore.properties
2. Run: powershell -ExecutionPolicy Bypass -File .\scripts\generate-release-keystore.ps1
3. Fill passwords in keystore.properties
"@
}

if (-not (Test-Path $googleServices)) {
    Fail @"
google-services.json not found at android\app\google-services.json
Download from Firebase Console (package: com.lavesco.app).
"@
}

Set-Location $mobileRnRoot

Write-Host "Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Building release AAB (bundleRelease)..."
Set-Location $androidDir
& .\gradlew.bat clean bundleRelease
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path $aabOutput)) {
    Fail "AAB not found at expected path: $aabOutput"
}

New-Item -ItemType Directory -Force -Path $distDir | Out-Null
Copy-Item $aabOutput $distAab -Force

Write-Host ""
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host "  AAB: $distAab"
Write-Host ""
Write-Host "Upload to Google Play Console:"
Write-Host "  Release > Testing > Internal testing > Create new release > Upload"
Write-Host "See docs/GOOGLE_PLAY_INTERNAL_TESTING.md for full steps."
