# 개발 환경 설치 가이드

라베스코 프로젝트 개발을 위한 필수 도구 설치 가이드입니다.

## 📋 설치 체크리스트

- [x] Node.js (v22.20.0) ✅ **이미 설치됨**
- [ ] React Native 개발 환경 (모바일 앱: [mobile-rn/README.md](../mobile-rn/README.md) 참고)
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

## React Native (모바일 앱) 개발 환경

모바일 앱은 **React Native**를 사용합니다. Node.js가 이미 설치되어 있다면, 아래 도구만 추가로 준비하면 됩니다.

### 공식 가이드

- [React Native 환경 설정 (공식)](https://reactnative.dev/docs/environment-setup)
- **프로젝트별 설정 및 실행**: [mobile-rn/README.md](../mobile-rn/README.md)

### Android 개발 (Windows/macOS/Linux)

1. [Android Studio](https://developer.android.com/studio) 설치
2. 설치 시 **Android SDK**, **Android SDK Platform**, **Android Virtual Device** 포함
3. Android Studio 실행 후 **SDK Manager**에서 Android 13 이상 및 Build-Tools 설치
4. 환경 변수 `ANDROID_HOME` 설정 (공식 가이드 참고)

### iOS 개발 (macOS만 가능)

1. Xcode 설치 (App Store)
2. `xcode-select --install` 로 Command Line Tools 설치
3. CocoaPods: `sudo gem install cocoapods`

### 확인

```bash
cd mobile-rn
npm install
npx react-native doctor
```

자세한 실행 방법은 [mobile-rn/README.md](../mobile-rn/README.md)를 참고하세요.

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

---

## 설치 확인

필수 도구가 올바르게 설치되었는지 확인:

```bash
# Node.js
node --version
npm --version

# 모바일 앱 (React Native) - mobile-rn에서 확인
cd mobile-rn
npx react-native doctor

# Git
git --version

# Firebase CLI
firebase --version
```

---

## 문제 해결

### React Native / Android 빌드 오류

- **Android SDK 없음**: Android Studio 설치 후 SDK 경로 설정
- **환경 변수**: `ANDROID_HOME`이 설정되어 있는지 확인
- 자세한 내용: [mobile-rn/README.md](../mobile-rn/README.md) 트러블슈팅 섹션

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
