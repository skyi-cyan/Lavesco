$ErrorActionPreference = "Stop"

$path = Join-Path $env:USERPROFILE ".gradle\caches\9.0.0"

Write-Host "Gradle cache path: $path"

if (Test-Path $path) {
  Write-Host "Deleting Gradle cache: $path"
  Remove-Item -Recurse -Force $path
} else {
  Write-Host "Path not found, nothing to delete."
}

