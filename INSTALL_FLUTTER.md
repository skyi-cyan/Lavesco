# Flutter SDK 설치 안내

## 현재 상태

✅ **Node.js v22.20.0** - 이미 설치됨  
❌ **Flutter SDK** - 설치 필요

## Flutter 설치 방법

### 방법 1: 자동 설치 스크립트 (권장)

1. **PowerShell을 관리자 권한으로 실행**
   - 시작 메뉴에서 "PowerShell" 검색
   - 우클릭 > "관리자 권한으로 실행"

2. **스크립트 실행**
   ```powershell
   cd D:\NewProduct\Lavesco
   .\scripts\install_flutter.ps1
   ```

3. **새 터미널 열기**
   - 환경 변수 적용을 위해 PowerShell을 완전히 종료하고 다시 시작

4. **설치 확인**
   ```powershell
   flutter --version
   flutter doctor
   ```

### 방법 2: 수동 설치

1. **Flutter SDK 다운로드**
   - https://flutter.dev/docs/get-started/install/windows 접속
   - "Download Flutter SDK" 클릭
   - 최신 안정 버전 다운로드 (예: `flutter_windows_3.24.0-stable.zip`)

2. **압축 해제**
   - 다운로드한 ZIP 파일을 `C:\src\flutter` 또는 원하는 위치에 압축 해제
   - ⚠️ 경로에 공백이나 특수문자가 없어야 합니다

3. **환경 변수 설정**
   
   **PowerShell (관리자 권한)에서:**
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", [EnvironmentVariableTarget]::User)
   ```
   
   또는 수동으로:
   - 시작 메뉴 > "환경 변수" 검색
   - "시스템 환경 변수 편집" 선택
   - "환경 변수" 버튼 클릭
   - "Path" 선택 > "편집" > "새로 만들기"
   - Flutter bin 경로 추가: `C:\src\flutter\bin`
   - 모든 창에서 "확인" 클릭

4. **새 터미널 열기 및 확인**
   ```powershell
   flutter --version
   flutter doctor
   ```

## 설치 후 확인

다음 명령어로 설치를 확인하세요:

```powershell
flutter --version
flutter doctor
```

`flutter doctor` 실행 시 다음 항목들이 표시됩니다:
- ✅ Flutter (설치 확인)
- ⚠️ Android toolchain (Android Studio 필요, 선택)
- ⚠️ VS Code (선택)
- ⚠️ Connected device (디바이스 연결 필요)

## 다음 단계

Flutter 설치가 완료되면:

1. ✅ [Firebase 프로젝트 설정](./docs/FIREBASE_SETUP_GUIDE.md)
2. ✅ 프로젝트 의존성 설치
3. ✅ 개발 시작

## 문제 해결

### Flutter 명령어를 찾을 수 없음

- 환경 변수에 Flutter bin 경로가 추가되었는지 확인
- 터미널을 완전히 종료하고 다시 시작
- PowerShell에서: `$env:Path` 확인

### 권한 오류

- PowerShell을 **관리자 권한**으로 실행
- 또는 사용자 디렉토리에 설치

## 상세 가이드

더 자세한 내용은 [개발 환경 설치 가이드](./docs/INSTALLATION_GUIDE.md)를 참조하세요.
