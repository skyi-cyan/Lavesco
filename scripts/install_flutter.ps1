# Flutter SDK 설치 스크립트 (Windows PowerShell)
# 관리자 권한으로 실행 필요

param(
    [string]$FlutterPath = "C:\src\flutter",
    [string]$FlutterVersion = "3.24.0"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flutter SDK 설치 스크립트" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Flutter 버전 확인 및 최신 URL 가져오기
$FlutterUrl = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_${FlutterVersion}-stable.zip"

Write-Host "[1/5] Flutter SDK 다운로드 URL 확인 중..." -ForegroundColor Yellow
Write-Host "URL: $FlutterUrl" -ForegroundColor Gray
Write-Host ""

# Flutter 디렉토리 생성
Write-Host "[2/5] Flutter 디렉토리 생성 중..." -ForegroundColor Yellow
if (Test-Path $FlutterPath) {
    $response = Read-Host "Flutter 디렉토리가 이미 존재합니다. 계속하시겠습니까? (Y/N)"
    if ($response -ne "Y" -and $response -ne "y") {
        Write-Host "설치가 취소되었습니다." -ForegroundColor Red
        exit
    }
} else {
    New-Item -ItemType Directory -Force -Path $FlutterPath | Out-Null
    Write-Host "✓ 디렉토리 생성 완료: $FlutterPath" -ForegroundColor Green
}

# Flutter SDK 다운로드
Write-Host ""
Write-Host "[3/5] Flutter SDK 다운로드 중..." -ForegroundColor Yellow
Write-Host "이 작업은 몇 분이 소요될 수 있습니다..." -ForegroundColor Gray

$zipPath = "$env:TEMP\flutter.zip"

try {
    Invoke-WebRequest -Uri $FlutterUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "✓ 다운로드 완료" -ForegroundColor Green
} catch {
    Write-Host "✗ 다운로드 실패: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "수동 설치 방법:" -ForegroundColor Yellow
    Write-Host "1. https://flutter.dev/docs/get-started/install/windows 접속" -ForegroundColor Gray
    Write-Host "2. Flutter SDK 다운로드" -ForegroundColor Gray
    Write-Host "3. $FlutterPath 에 압축 해제" -ForegroundColor Gray
    exit 1
}

# 압축 해제
Write-Host ""
Write-Host "[4/5] Flutter SDK 압축 해제 중..." -ForegroundColor Yellow

try {
    # 기존 내용 삭제 (있는 경우)
    if (Test-Path "$FlutterPath\bin") {
        Remove-Item "$FlutterPath\*" -Recurse -Force
    }
    
    Expand-Archive -Path $zipPath -DestinationPath (Split-Path $FlutterPath) -Force
    Write-Host "✓ 압축 해제 완료" -ForegroundColor Green
} catch {
    Write-Host "✗ 압축 해제 실패: $_" -ForegroundColor Red
    exit 1
}

# 환경 변수 추가
Write-Host ""
Write-Host "[5/5] 환경 변수 설정 중..." -ForegroundColor Yellow

$flutterBinPath = "$FlutterPath\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($currentPath -notlike "*$flutterBinPath*") {
    $newPath = "$currentPath;$flutterBinPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "✓ 환경 변수 추가 완료" -ForegroundColor Green
    Write-Host "  경로: $flutterBinPath" -ForegroundColor Gray
} else {
    Write-Host "✓ 환경 변수가 이미 설정되어 있습니다" -ForegroundColor Green
}

# 임시 파일 삭제
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flutter SDK 설치 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Yellow
Write-Host "1. PowerShell을 완전히 종료하고 다시 시작하세요" -ForegroundColor Gray
Write-Host "2. 다음 명령어로 설치를 확인하세요:" -ForegroundColor Gray
Write-Host "   flutter --version" -ForegroundColor White
Write-Host "   flutter doctor" -ForegroundColor White
Write-Host ""
Write-Host "참고: 환경 변수 적용을 위해 새 터미널을 열어야 합니다." -ForegroundColor Yellow
Write-Host ""
