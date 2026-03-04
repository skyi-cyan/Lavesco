# Lavesco Mobile (React Native)

라베스코 골프 스코어 공유 앱의 React Native 클라이언트입니다.

## 요구 사항

- Node.js >= 22.11.0
- npm
- Android: Android Studio, JDK, Android SDK
- iOS: Xcode (macOS만 해당)

## 에뮬레이터 설치

### Android 에뮬레이터 (Windows / macOS / Linux)

1. **Android Studio 설치**
   - [Android Studio 다운로드](https://developer.android.com/studio)에서 설치 파일 다운로드 후 설치.
   - 설치 시 **Android SDK**, **Android SDK Platform**, **Android Virtual Device** 옵션을 포함해 설치합니다.

2. **SDK 구성**
   - Android Studio 실행 → **More Actions** → **SDK Manager** (또는 **File** → **Settings** → **Languages & Frameworks** → **Android SDK**).
   - **SDK Platforms** 탭: **Android 13 (Tiramisu)** 이상 체크 후 적용.
   - **SDK Tools** 탭: **Android SDK Build-Tools**, **Android Emulator**, **Android SDK Platform-Tools** 체크 후 적용.

3. **가상 기기(AVD) 만들기**
   - **More Actions** → **Virtual Device Manager** (또는 상단 툴바의 기기 아이콘).
   - **Create Device** 클릭.
   - 기기 선택 (예: **Pixel 6**) → **Next**.
   - 시스템 이미지 선택 (예: **Tiramisu** API 33). 없으면 **Download** 후 선택 → **Next**.
   - AVD 이름 확인 후 **Finish**.

4. **에뮬레이터 실행**
   - Virtual Device Manager에서 만든 기기 옆 **▶(재생)** 버튼 클릭.
   - 에뮬레이터가 켜지면, 터미널에서 `npm run android`를 실행하면 앱이 해당 에뮬레이터에 설치·실행됩니다.

**환경 변수 (필요 시)**  
- `ANDROID_HOME`: 보통 `C:\Users\<사용자>\AppData\Local\Android\Sdk` (Windows) 또는 `~/Library/Android/sdk` (macOS).

### iOS 시뮬레이터 (macOS만)

- **Xcode**를 [App Store](https://apps.apple.com/app/xcode/id497799835)에서 설치.
- Xcode 실행 → **Window** → **Devices and Simulators** → **Simulators** 탭에서 원하는 기기/OS 선택 후 **▶** 로 실행.
- 터미널에서 `npm run ios` 실행 시 시뮬레이터가 없으면 자동으로 기본 시뮬레이터가 실행됩니다.

### 에뮬레이터 오류: "not enough disk space" / "emulator process has terminated"

**원인:** 디스크 공간 부족으로 AVD를 실행할 수 없습니다.

**해결 방법:**

1. **디스크 공간 확보**
   - Windows: **설정** → **시스템** → **저장소**에서 불필요한 파일·앱 정리.
   - 임시 파일 삭제, 다운로드 폴더 정리, 사용하지 않는 프로그램 제거로 **최소 10GB 이상** 여유를 두는 것을 권장합니다.

2. **가벼운 AVD로 새로 만들기**
   - Android Studio → **Virtual Device Manager** → **Create Device**.
   - 기기: **Pixel 5** 또는 **Pixel 6** (Pixel 9보다 리소스 적음).
   - 시스템 이미지: **API 33 (Tiramisu)** 등 **x86_64** 이미지 중 **다운로드 용량이 작은 것** 선택 (가능하면 "Google APIs" 대신 "Google Play" 없는 버전).
   - **Show Advanced Settings**에서 **RAM** 2048MB, **VM heap** 256MB 등으로 낮춰도 됩니다.
   - 생성한 AVD로 에뮬레이터를 실행해 봅니다.

3. **실기기로 대체 (권장)**
   - Android 폰을 USB로 연결 → **개발자 옵션**에서 **USB 디버깅** 활성화.
   - PC에서 `adb devices`로 기기가 보이면, `npm run android` 시 해당 기기에 앱이 설치·실행됩니다. 에뮬레이터보다 디스크 부담이 없습니다.

## 설치

```bash
cd mobile-rn
npm install
```

## Firebase 설정 (필수)

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 선택.

2. **Android**
   - 프로젝트 설정 > 앱 > Android 앱 추가 시 **패키지명**을 `com.lavesco.app`로 등록.
   - `google-services.json` 다운로드 후 `android/app/google-services.json`에 복사.
   - **`No matching client found for package name 'com.mobilern'`** 오류는 `google-services.json` 안의 패키지명과 앱의 `applicationId`가 달라서 발생합니다. 이 프로젝트는 `com.lavesco.app`로 맞춰 두었으므로, Firebase에 등록한 Android 앱 패키지명이 `com.lavesco.app`인지 확인하세요.

**`package com.mobilern does not exist`** (ReactNativeApplicationEntryPoint.java) 오류는 패키지명을 바꾼 뒤 **이전 빌드 캐시**가 남아 있을 때 납니다. 아래처럼 클린 후 다시 빌드하세요.
```bash
cd mobile-rn/android
./gradlew clean
cd ..
npm run android
```

3. **iOS (macOS만)**
   - 프로젝트 설정 > 앱 > iOS 앱 추가(번들 ID: `org.reactjs.native.example.Lavesco` 또는 실제 번들 ID).
   - `GoogleService-Info.plist` 다운로드 후 Xcode에서 `ios/Lavesco/`(또는 프로젝트명)에 추가.

4. **Google 로그인**
   - Firebase Console > 인증 > Sign-in method > Google 사용 설정.
   - Android 앱의 OAuth 2.0 **웹 클라이언트 ID**를 복사.
   - 앱에서 사용하려면 환경 변수 `GOOGLE_WEB_CLIENT_ID`에 넣거나, `src/app/App.tsx`의 `initAuth('웹클라이언트ID')`에 직접 넣어주세요.

5. **Apple 로그인 (iOS)**
   - Firebase에서 Apple 사용 설정.
   - Xcode에서 Sign in with Apple capability 추가.

## 실행

**중요:** `npm start`만 하면 **Metro(번들 서버)**만 켜집니다. 화면에 앱을 띄우려면 **아래 ①번으로 Metro를 켠 뒤, ②번을 다른 터미널에서 실행**해야 합니다.

### ① Metro 번들러 켜기 (첫 번째 터미널)

```bash
cd mobile-rn
npm start
```

이 터미널은 **그대로 두고** 다음 단계로 이동하세요.

**`EADDRINUSE: address already in use :::8081` 오류가 나면**  
8081 포트를 이미 쓰는 프로세스(이전에 켠 Metro 등)가 있습니다. 아래 "포트 8081 사용 중" 항목을 참고하세요.

### ② 앱을 에뮬레이터/기기에서 실행 (두 번째 터미널)

**Android**

- Android Studio에서 에뮬레이터를 먼저 실행하거나, USB로 실제 기기를 연결한 뒤:
```bash
cd mobile-rn
npm run android
```
- 앱이 설치되고 에뮬레이터/기기 화면에 Lavesco(로그인 화면 또는 스플래시)가 뜹니다.

**iOS (macOS만)**

- Xcode 시뮬레이터 또는 연결한 iPhone에서:
```bash
cd mobile-rn
cd ios && pod install && cd ..
npm run ios
```

### "Welcome to React Native!" 화면만 보일 때

우리 앱 코드가 아닌 **기본 템플릿 화면**이 보인다면, 예전 빌드가 캐시된 상태일 수 있습니다.

1. **Metro 캐시 지우고 다시 실행**
   - `npm start` 하고 있던 터미널에서 Ctrl+C로 종료한 뒤:
   ```bash
   npx react-native start --reset-cache
   ```
   - **다른 터미널**에서:
   ```bash
   npm run android
   ```
   (또는 iOS면 `npm run ios`)

2. **Android에서 앱 완전히 삭제 후 재설치**
   - 에뮬레이터/기기에서 "Lavesco" 앱을 삭제한 뒤, 위처럼 `npm run android`로 다시 설치·실행합니다.

이후에는 스플래시 → 로그인/회원가입 화면이 보여야 합니다.

### 포트 8081 사용 중 (EADDRINUSE)

`npm start` 시 **address already in use :::8081** 이 나오면, 8081 포트를 쓰는 프로세스(보통 이전 Metro)가 있는 상태입니다.

**방법 1 – 다른 포트로 Metro 실행**

```bash
npm start -- --port 8082
```

그 다음 `npm run android` 할 때도 같은 포트를 쓰려면, 에뮬레이터/기기에서 앱이 이미 실행 중이면 새 번들이 8082로 연결되도록 한 번 리로드하면 됩니다.

**방법 2 – 8081 쓰는 프로세스 종료 후 다시 시작 (Windows PowerShell)**

1. 8081 사용 중인 프로세스 확인:
   ```powershell
   netstat -ano | findstr :8081
   ```
   마지막 열이 **PID**(숫자)입니다.

2. 해당 프로세스 종료 (PID를 위에서 확인한 숫자로 바꿈):
   ```powershell
   taskkill /PID <PID> /F
   ```
   예: `taskkill /PID 12345 /F`

3. 다시 Metro 실행:
   ```bash
   npm start
   ```

**방법 3 – Metro 켜 둔 터미널이 있으면**  
그 터미널에서 Ctrl+C로 Metro를 종료한 뒤, 새 터미널에서 `npm start` 하면 됩니다.

## 프로젝트 구조

```
src/
  app/           # 앱 진입점, 라우팅(인증/탭)
  core/          # 인증(AuthContext, authService), 타입, 상수
  features/      # auth(로그인/회원가입), home, round, course, profile
  shared/        # 유틸(validators), 테마
```

## 기술 스택

- React Native 0.84
- TypeScript
- React Navigation (Stack, Bottom Tabs)
- Firebase (Auth, Firestore)
- Google Sign-In / Apple Sign-In

## 인증 흐름

- 앱 시작 시 **스플래시** → 인증 상태 확인.
- 미로그인: **로그인** / **회원가입** (이메일, Google, Apple).
- 로그인 후: **홈 / 라운드 / 코스 / 프로필** 탭. 프로필에서 로그아웃 가능.

---

## 실제 기기/에뮬레이터에서 사용 방법

### 1. 한 번만 할 Firebase 설정

| 단계 | Android | iOS |
|------|---------|-----|
| 설정 파일 | [Firebase Console](https://console.firebase.google.com/) → 프로젝트 설정 → 앱 → Android 앱에서 `google-services.json` 다운로드 | 동일 프로젝트에서 iOS 앱에 `GoogleService-Info.plist` 다운로드 |
| 넣을 위치 | `mobile-rn/android/app/google-services.json` (파일 그대로 복사) | Xcode에서 `ios/` 폴더 내 앱 타겟에 `GoogleService-Info.plist` 추가 (드래그 후 "Copy items if needed" 체크) |
| 패키지/번들 ID | Android 앱 등록 시 패키지명 `com.mobilern` 사용 | iOS 앱 등록 시 사용한 번들 ID와 Xcode 프로젝트 번들 ID 일치시키기 |

**인증 사용 설정 (Firebase Console)**

- **인증** → **Sign-in method** → **이메일/비밀번호** 사용 설정
- **Google** 사용 설정 (필요 시 승인 도메인 추가)
- **Apple** 사용 설정 (iOS만, 필요 시)

**Google 로그인용 웹 클라이언트 ID (Android)**

1. Firebase Console → 프로젝트 설정 → 앱 → Android 앱 선택
2. "클라이언트 ID" 또는 Google Cloud Console에서 **웹 클라이언트 (자동 생성된 OAuth 2.0)** 의 클라이언트 ID 복사 (예: `123456789-xxx.apps.googleusercontent.com`)
3. `src/app/App.tsx`에서 `initAuth(undefined)` 를 아래처럼 수정:

```ts
initAuth('여기에_웹_클라이언트_ID_붙여넣기');
```

저장 후 앱 다시 실행.

---

### 2. 앱 실행 순서

**Android**

```bash
cd mobile-rn
npm start
```

새 터미널에서:

```bash
cd mobile-rn
npm run android
```

에뮬레이터가 자동으로 뜨거나, USB로 연결한 실제 기기에서 앱이 설치·실행됩니다.

**iOS (macOS)**

```bash
cd mobile-rn
npm start
```

새 터미널에서:

```bash
cd mobile-rn
cd ios && pod install && cd ..
npm run ios
```

시뮬레이터 또는 연결한 iPhone에서 실행됩니다.

---

### 3. 로그인·회원가입·로그아웃 사용 방법

| 화면 | 하는 일 |
|------|----------|
| **스플래시** | 앱이 Firebase 인증 상태를 확인합니다. 이미 로그인된 사용자는 곧바로 홈으로 갑니다. |
| **로그인** | 이메일/비밀번호 입력 후 "로그인", 또는 "Google로 로그인" / "Apple로 로그인" (iOS) 탭. 성공 시 홈 탭으로 이동합니다. |
| **회원가입** | 로그인 화면에서 "회원가입" → 이메일, 비밀번호, 비밀번호 확인, 닉네임 입력 → 필수 약관 2개 체크 → "가입하기". 가입과 동시에 로그인되어 홈으로 이동합니다. |
| **홈** | 로그인한 사용자 닉네임(또는 이메일)이 표시됩니다. |
| **프로필** | 하단 탭에서 "프로필" 선택 → "로그아웃" 탭 → 확인 시 로그아웃되고 다시 로그인 화면으로 돌아갑니다. |

**이메일 로그인만 쓰는 경우**  
Firebase에서 이메일/비밀번호만 켜고, `google-services.json`(Android) / `GoogleService-Info.plist`(iOS)만 넣으면 됩니다. Google 웹 클라이언트 ID는 없어도 됩니다.

**Google 로그인을 쓰는 경우**  
위 "Google 로그인용 웹 클라이언트 ID" 설정까지 해야 "Google로 로그인" 버튼이 정상 동작합니다.

---

### 4. 문제가 생겼을 때

- **Android 빌드 실패 (google-services 관련)**  
  `android/app/` 아래에 `google-services.json`이 있는지, Firebase에서 **Android 앱**을 추가했는지 확인하세요.

- **로그인/회원가입 시 "인증 오류"**  
  Firebase Console → 인증 → Sign-in method에서 해당 방식(이메일/Google/Apple)이 "사용 설정"인지 확인하세요.

- **Google 로그인 시 취소/실패**  
  `App.tsx`의 `initAuth('...')`에 **웹 클라이언트 ID**를 넣었는지, 문자열에 따옴표만 있고 실제 ID가 들어갔는지 확인하세요.

- **iOS에서 Apple 로그인 안 됨**  
  Xcode에서 타겟 → Signing & Capabilities에 "Sign in with Apple"이 추가되어 있는지 확인하세요.
