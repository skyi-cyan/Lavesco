# Lavesco Android upload keystore 생성 (Google Play 업로드용)
# 실행: mobile-rn 폴더에서
#   powershell -ExecutionPolicy Bypass -File .\scripts\generate-release-keystore.ps1

$ErrorActionPreference = "Stop"

$mobileRnRoot = Split-Path $PSScriptRoot -Parent
$keystorePath = Join-Path $mobileRnRoot "android\app\lavesco-upload.keystore"
$propsExample = Join-Path $mobileRnRoot "android\keystore.properties.example"
$propsPath = Join-Path $mobileRnRoot "android\keystore.properties"

if (Test-Path $keystorePath) {
    Write-Host "Keystore already exists: $keystorePath"
    Write-Host "Delete it first if you need to regenerate."
    exit 1
}

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
    Write-Host "keytool not found. Install JDK and add JAVA_HOME/bin to PATH."
    exit 1
}

Write-Host "Creating upload keystore at:"
Write-Host "  $keystorePath"
Write-Host ""
Write-Host "You will be prompted for:"
Write-Host "  - Keystore password (storePassword)"
Write-Host "  - Key password (keyPassword, can be same)"
Write-Host "  - Name / organization (for certificate DN)"
Write-Host ""

& keytool -genkeypair -v `
    -storetype PKCS12 `
    -keystore $keystorePath `
    -alias lavesco-upload `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

if (-not (Test-Path $propsPath)) {
    Copy-Item $propsExample $propsPath
    Write-Host ""
    Write-Host "Created $propsPath"
    Write-Host "Edit storePassword and keyPassword in keystore.properties."
} else {
    Write-Host ""
    Write-Host "keystore.properties already exists. Ensure passwords match the keystore."
}

Write-Host ""
Write-Host "Next: register SHA-1 in Firebase Console (Android app com.lavesco.app):"
Write-Host "  keytool -list -v -keystore `"$keystorePath`" -alias lavesco-upload"
Write-Host ""
Write-Host "Then build AAB:"
Write-Host "  npm run android:bundle:release"
