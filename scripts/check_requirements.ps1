# 개발 환경 요구사항 확인 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "개발 환경 요구사항 확인" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# Node.js 확인
Write-Host "[1/4] Node.js 확인 중..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js 설치됨: $nodeVersion" -ForegroundColor Green
    
    $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajor -lt 18) {
        Write-Host "  ⚠ 경고: Node.js 18 이상 권장 (현재: $nodeMajor)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Node.js가 설치되어 있지 않습니다" -ForegroundColor Red
    Write-Host "  설치: https://nodejs.org/" -ForegroundColor Gray
    $allOk = $false
}

Write-Host ""

# npm 확인
Write-Host "[2/4] npm 확인 중..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm 설치됨: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm을 찾을 수 없습니다" -ForegroundColor Red
    $allOk = $false
}

Write-Host ""

# Flutter 확인
Write-Host "[3/4] Flutter 확인 중..." -ForegroundColor Yellow
try {
    $flutterVersion = flutter --version 2>&1 | Select-Object -First 1
    if ($flutterVersion -like "*Flutter*") {
        Write-Host "✓ Flutter 설치됨" -ForegroundColor Green
        Write-Host "  $flutterVersion" -ForegroundColor Gray
        
        # Flutter doctor 실행
        Write-Host ""
        Write-Host "  Flutter Doctor 실행 중..." -ForegroundColor Gray
        flutter doctor --no-version-check 2>&1 | ForEach-Object {
            if ($_ -match "\[✓\]") {
                Write-Host "  $_" -ForegroundColor Green
            } elseif ($_ -match "\[✗\]") {
                Write-Host "  $_" -ForegroundColor Red
            } else {
                Write-Host "  $_" -ForegroundColor Gray
            }
        }
    } else {
        throw "Flutter not found"
    }
} catch {
    Write-Host "✗ Flutter가 설치되어 있지 않습니다" -ForegroundColor Red
    Write-Host "  설치 방법:" -ForegroundColor Gray
    Write-Host "  1. 관리자 권한으로 PowerShell 실행" -ForegroundColor Gray
    Write-Host "  2. scripts\install_flutter.ps1 실행" -ForegroundColor Gray
    Write-Host "  또는: https://flutter.dev/docs/get-started/install/windows" -ForegroundColor Gray
    $allOk = $false
}

Write-Host ""

# Git 확인 (선택)
Write-Host "[4/4] Git 확인 중 (선택)..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✓ Git 설치됨: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ Git이 설치되어 있지 않습니다 (선택 사항)" -ForegroundColor Yellow
    Write-Host "  설치: https://git-scm.com/download/win" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allOk) {
    Write-Host "✓ 모든 필수 요구사항이 충족되었습니다!" -ForegroundColor Green
} else {
    Write-Host "✗ 일부 요구사항이 누락되었습니다" -ForegroundColor Red
    Write-Host "  위의 설치 방법을 참조하여 설치하세요" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
