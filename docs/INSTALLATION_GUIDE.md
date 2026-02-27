# 개발 환경 설치 가이드

라베스코 프로젝트 개발을 위한 필수 도구 설치 가이드입니다.

## 📋 설치 체크리스트

- [x] Node.js (v22.20.0) ✅ **이미 설치됨**
- [ ] Flutter SDK
- [ ] Git (선택)
- [ ] Android Studio / Xcode (선택, 모바일 개발용)

---

## Node.js 설치

### 현재 상태
✅ **Node.js v22.20.0이 이미 설치되어 있습니다.**

### 추가 설치가 필요한 경우

#### Windows

1. [Node.js 공식 웹사이트](https://nodejs.org/) 접속
2. **LTS 버전** 다운로드 (권장: v20.x 이상)
3. 설치 프로그램 실행
4. 기본 설정으로 설치 진행
5. 설치 확인:
   ```bash
   node --version
   npm --version
   ```

#### macOS

```bash
# Homebrew 사용
brew install node

# 또는 공식 웹사이트에서 다운로드
```

#### Linux (Ubuntu/Debian)

```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs
```

---

## Flutter SDK 설치

### Windows 설치 방법

#### 방법 1: 공식 설치 프로그램 (권장)

1. **Flutter SDK 다운로드**
   - [Flutter 공식 웹사이트](https://flutter.dev/docs/get-started/install/windows) 접속
   - **"Download Flutter SDK"** 클릭
   - 최신 안정 버전 다운로드 (예: `flutter_windows_3.x.x-stable.zip`)

2. **압축 해제**
   - 다운로드한 ZIP 파일을 원하는 위치에 압축 해제
   - 권장 경로: `C:\src\flutter` 또는 `D:\flutter`
   - ⚠️ **주의**: 경로에 공백이나 특수문자가 없어야 합니다

3. **환경 변수 설정**

   **PowerShell (관리자 권한)에서 실행:**
   
   ```powershell
   # Flutter 경로를 환경 변수에 추가
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", [EnvironmentVariableTarget]::User)
   ```
   
   또는 수동으로:
   
   1. **시작 메뉴** > **"환경 변수"** 검색
   2. **"시스템 환경 변수 편집"** 선택
   3. **"환경 변수"** 버튼 클릭
   4. **"사용자 변수"** 또는 **"시스템 변수"**에서 **Path** 선택
   5. **"편집"** 클릭
   6. **"새로 만들기"** 클릭
   7. Flutter bin 경로 추가: `C:\src\flutter\bin`
   8. **"확인"** 클릭하여 모든 창 닫기

4. **새 터미널 열기**
   - 환경 변수 적용을 위해 PowerShell 또는 명령 프롬프트를 다시 시작

5. **설치 확인**
   ```bash
   flutter --version
   flutter doctor
   ```

#### 방법 2: Git을 사용한 설치

```bash
# Git이 설치되어 있는 경우
cd C:\src
git clone https://github.com/flutter/flutter.git -b stable
```

그 다음 환경 변수 설정 (방법 1의 3단계 참조)

### Flutter Doctor 실행

설치 후 필수 도구 확인:

```bash
flutter doctor
```

다음과 같은 출력이 표시됩니다:

```
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.x.x, on Microsoft Windows)
[✓] Windows Version (Installed version of Windows is version 10 or higher)
[✗] Android toolchain - develop for Android devices
    ✗ Android Studio not found
[✗] VS Code (version 1.x.x)
[✗] Connected device
    ! No devices available
```

### 필요한 추가 도구 설치

#### Android 개발 (Android Studio)

1. [Android Studio 다운로드](https://developer.android.com/studio)
2. 설치 시 **Android SDK**, **Android SDK Platform**, **Android Virtual Device** 포함
3. Android Studio 실행 후:
   - **Tools** > **SDK Manager**
   - **SDK Platforms** 탭에서 **Android 13.0 (Tiramisu)** 이상 선택
   - **SDK Tools** 탭에서 다음 선택:
     - Android SDK Build-Tools
     - Android SDK Command-line Tools
     - Android SDK Platform-Tools
4. 환경 변수 설정:
   ```powershell
   # ANDROID_HOME 환경 변수 추가
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\YourName\AppData\Local\Android\Sdk", [EnvironmentVariableTarget]::User)
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";%ANDROID_HOME%\platform-tools", [EnvironmentVariableTarget]::User)
   ```

#### iOS 개발 (macOS만 가능)

1. Xcode 설치 (App Store)
2. Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. CocoaPods 설치:
   ```bash
   sudo gem install cocoapods
   ```

### Flutter 설정 완료 확인

```bash
flutter doctor -v
```

모든 항목이 체크되면 준비 완료입니다.

---

## 추가 도구 설치

### Git (버전 관리)

#### Windows

1. [Git 공식 웹사이트](https://git-scm.com/download/win) 접속
2. 설치 프로그램 다운로드 및 실행
3. 기본 설정으로 설치

설치 확인:
```bash
git --version
```

### Firebase CLI

```bash
npm install -g firebase-tools
```

설치 확인:
```bash
firebase --version
```

로그인:
```bash
firebase login
```

### FlutterFire CLI

```bash
dart pub global activate flutterfire_cli
```

설치 확인:
```bash
flutterfire --version
```

---

## 설치 스크립트 (Windows PowerShell)

다음 스크립트를 사용하여 자동으로 설치할 수 있습니다:

```powershell
# 관리자 권한으로 PowerShell 실행 필요

# Flutter SDK 다운로드 및 설치
$flutterPath = "C:\src\flutter"
$flutterUrl = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.0-stable.zip"

# Flutter 디렉토리 생성
New-Item -ItemType Directory -Force -Path $flutterPath

# Flutter SDK 다운로드
Write-Host "Flutter SDK 다운로드 중..."
Invoke-WebRequest -Uri $flutterUrl -OutFile "$env:TEMP\flutter.zip"

# 압축 해제
Write-Host "Flutter SDK 압축 해제 중..."
Expand-Archive -Path "$env:TEMP\flutter.zip" -DestinationPath "C:\src" -Force

# 환경 변수 추가
Write-Host "환경 변수 설정 중..."
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*flutter\bin*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;C:\src\flutter\bin", "User")
    Write-Host "Flutter 경로가 환경 변수에 추가되었습니다."
} else {
    Write-Host "Flutter 경로가 이미 설정되어 있습니다."
}

# 임시 파일 삭제
Remove-Item "$env:TEMP\flutter.zip" -Force

Write-Host "Flutter SDK 설치 완료!"
Write-Host "새 터미널을 열고 'flutter doctor'를 실행하세요."
```

**⚠️ 주의**: 위 스크립트는 Flutter 버전이 변경될 수 있으므로, 최신 버전 URL을 확인한 후 사용하세요.

---

## 설치 확인

모든 도구가 올바르게 설치되었는지 확인:

```bash
# Node.js
node --version
npm --version

# Flutter
flutter --version
flutter doctor

# Git
git --version

# Firebase CLI
firebase --version
```

---

## 문제 해결

### Flutter 명령어를 찾을 수 없음

**증상**: `flutter: command not found`

**해결 방법**:
1. 환경 변수에 Flutter bin 경로가 추가되었는지 확인
2. 터미널을 완전히 종료하고 다시 시작
3. PowerShell에서:
   ```powershell
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```

### Flutter Doctor 오류

**Android toolchain 오류**:
- Android Studio 설치 필요
- Android SDK 경로 확인

**VS Code 플러그인 오류**:
- VS Code에서 Flutter 확장 설치

### 권한 오류

**증상**: 설치 시 권한 오류 발생

**해결 방법**:
- PowerShell을 **관리자 권한**으로 실행
- 또는 사용자 디렉토리에 설치

---

## 다음 단계

설치가 완료되면:

1. ✅ [Firebase 프로젝트 설정](./FIREBASE_SETUP_GUIDE.md)
2. ✅ 프로젝트 의존성 설치
3. ✅ 개발 시작

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-01-26
