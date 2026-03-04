# Firebase 프로젝트 설정 가이드

라베스코 프로젝트의 Firebase 설정을 위한 상세 가이드입니다.

## 📋 목차

1. [사전 준비사항](#사전-준비사항)
2. [Firebase 프로젝트 생성](#firebase-프로젝트-생성)
3. [Firebase CLI 설정](#firebase-cli-설정)
4. [모바일 앱 (React Native) 설정](#모바일-앱-react-native-설정)
5. [관리자 웹 설정](#관리자-웹-설정)
6. [Firebase Functions 설정](#firebase-functions-설정)
7. [Firestore 설정](#firestore-설정)
8. [Firebase Authentication 설정](#firebase-authentication-설정)
9. [Firebase Storage 설정](#firebase-storage-설정)
10. [FCM (푸시 알림) 설정](#fcm-푸시-알림-설정)
11. [검증 및 테스트](#검증-및-테스트)
12. [문제 해결](#문제-해결)

---

## 사전 준비사항

### 필수 도구 설치

- ✅ **Node.js** 18.0.0 이상
- ✅ **Node.js** 18.0.0 이상 (모바일 앱은 React Native 사용)
- ✅ **Firebase CLI** (설치 방법 아래 참조)
- ✅ **Google 계정** (Firebase Console 접근용)

### Firebase CLI 설치

```bash
npm install -g firebase-tools
```

설치 확인:
```bash
firebase --version
```

### Firebase CLI 로그인

```bash
firebase login
```

브라우저가 열리면 Google 계정으로 로그인합니다.

---

## Firebase 프로젝트 생성

### 1단계: Firebase Console 접속

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. Google 계정으로 로그인

### 2단계: 새 프로젝트 생성

1. **"프로젝트 추가"** 클릭
2. 프로젝트 이름 입력: `Lavesco` (또는 원하는 이름)
3. **"계속"** 클릭

### 3단계: Google Analytics 설정 (선택)

1. Google Analytics 사용 여부 선택
   - **권장**: 사용 (앱 사용량 분석에 유용)
2. Analytics 계정 선택 또는 새로 생성
3. **"프로젝트 만들기"** 클릭

### 4단계: 프로젝트 생성 완료

- 프로젝트 생성에 몇 분이 소요될 수 있습니다
- 완료되면 **"계속"** 클릭하여 프로젝트로 이동

### 5단계: 프로젝트 ID 확인

1. 프로젝트 설정 (⚙️ 아이콘) 클릭
2. **일반** 탭에서 **프로젝트 ID** 확인
   - 예: `lavesco-12345`

### 6단계: `.firebaserc` 파일 업데이트

프로젝트 루트의 `.firebaserc` 파일을 열고 프로젝트 ID를 입력:

```json
{
  "projects": {
    "default": "lavesco-12345"
  }
}
```

**⚠️ 중요**: `lavesco-12345`를 실제 프로젝트 ID로 변경하세요.

---

## Firebase CLI 설정

### 프로젝트 연결 확인

```bash
cd D:\NewProduct\Lavesco
firebase use
```

프로젝트가 연결되지 않았다면:

```bash
firebase use --add
```

프로젝트 목록에서 생성한 프로젝트를 선택합니다.

### Firebase 서비스 활성화

Firebase Console에서 다음 서비스를 활성화합니다:

1. **Authentication** (인증)
2. **Firestore Database** (데이터베이스)
3. **Storage** (파일 저장소)
4. **Functions** (서버리스 함수)
5. **Cloud Messaging** (푸시 알림)

각 서비스는 Firebase Console의 왼쪽 메뉴에서 활성화할 수 있습니다.

---

## 모바일 앱 (React Native) 설정

모바일 앱은 **React Native**(`mobile-rn/`)를 사용합니다. Firebase 설정 파일만 추가하면 됩니다.

### 1단계: Android 앱 등록

1. Firebase Console > 프로젝트 설정 > **"앱 추가"** > **Android** 선택
2. **Android 패키지 이름** 입력: `com.lavesco.app`
3. **앱 닉네임** 입력 (선택): `Lavesco`
4. **"앱 등록"** 클릭 후 **google-services.json** 다운로드
5. 파일을 **`mobile-rn/android/app/`** 디렉토리에 복사

### 2단계: iOS 앱 등록 (iOS 빌드 시)

1. Firebase Console > 프로젝트 설정 > **"앱 추가"** > **iOS** 선택
2. **iOS 번들 ID** 입력: `com.lavesco.app` (또는 Xcode에 설정한 번들 ID)
3. **GoogleService-Info.plist** 다운로드
4. Xcode에서 `mobile-rn/ios/` 프로젝트를 연 뒤, 앱 타겟에 `GoogleService-Info.plist` 추가 (드래그 후 "Copy items if needed" 체크)

### 3단계: 테스트 실행

```bash
cd mobile-rn
npm install
npm start
# 별도 터미널에서
npm run android   # 또는 npm run ios
```

상세한 실행 방법 및 트러블슈팅은 **[mobile-rn/README.md](../mobile-rn/README.md)**를 참고하세요.

---

## 관리자 웹 설정

### 1단계: 웹 앱 등록

1. Firebase Console > 프로젝트 설정 > **"앱 추가"** > **웹** 선택
2. **앱 닉네임** 입력: `Lavesco Admin`
3. **Firebase Hosting 설정** (선택): 체크 해제 (나중에 설정 가능)
4. **"앱 등록"** 클릭

### 2단계: Firebase 설정 정보 확인

웹 앱 등록 후 표시되는 Firebase 설정 정보를 복사합니다:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "lavesco-12345.firebaseapp.com",
  projectId: "lavesco-12345",
  storageBucket: "lavesco-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 3단계: 환경 변수 파일 생성

`admin-web/.env.local` 파일을 생성하고 다음 내용을 추가:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=lavesco-12345.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=lavesco-12345
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=lavesco-12345.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**⚠️ 중요**: 
- 모든 값은 실제 Firebase 설정 값으로 변경하세요
- `NEXT_PUBLIC_` 접두사는 Next.js에서 클라이언트 사이드에서 접근 가능하도록 하는 필수 접두사입니다
- `.env.local` 파일은 Git에 커밋하지 마세요 (이미 `.gitignore`에 포함됨)

### 4단계: Firebase 설정 파일 확인

`admin-web/lib/firebase/config.ts` 파일이 올바르게 설정되었는지 확인합니다.

### 5단계: 테스트 실행

```bash
cd admin-web
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속하여 정상 작동을 확인합니다.

---

## Firebase Functions 설정

### 1단계: Functions 초기화

```bash
cd functions
npm install
```

### 2단계: Functions 빌드

```bash
npm run build
```

`functions/lib/` 디렉토리에 컴파일된 JavaScript 파일이 생성됩니다.

### 3단계: 로컬 테스트 (선택)

```bash
npm run serve
```

Firebase Emulator가 실행되어 로컬에서 Functions를 테스트할 수 있습니다.

### 4단계: Functions 배포

```bash
firebase deploy --only functions
```

또는 특정 함수만 배포:

```bash
firebase deploy --only functions:generateInviteCode
```

**⚠️ 주의**: 
- Functions 배포는 몇 분이 소요될 수 있습니다
- 첫 배포 시 Node.js 런타임 선택 프롬프트가 나타날 수 있습니다 (Node 18 권장)

---

## Firestore 설정

### 1단계: Firestore 데이터베이스 생성

1. Firebase Console > **Firestore Database** 메뉴
2. **"데이터베이스 만들기"** 클릭
3. **프로덕션 모드** 선택 (보안 규칙 적용)
4. **위치** 선택 (가장 가까운 리전, 예: `asia-northeast3` - 서울)
5. **"사용 설정"** 클릭

### 2단계: 보안 규칙 배포

```bash
firebase deploy --only firestore:rules
```

배포된 규칙 확인:
- Firebase Console > Firestore Database > **규칙** 탭

### 3단계: 인덱스 배포

```bash
firebase deploy --only firestore:indexes
```

인덱스 생성 확인:
- Firebase Console > Firestore Database > **인덱스** 탭
- 인덱스 생성에 몇 분이 소요될 수 있습니다

### 4단계: 테스트 데이터 생성 (선택)

Firebase Console에서 수동으로 테스트 데이터를 생성하거나, 앱을 통해 데이터를 생성할 수 있습니다.

---

## Firebase Authentication 설정

### 1단계: 인증 방법 활성화

Firebase Console > **Authentication** > **Sign-in method** 탭:

#### 이메일/비밀번호
1. **이메일/비밀번호** 클릭
2. **사용 설정** 토글 ON
3. **저장** 클릭

#### Google 로그인
1. **Google** 클릭
2. **사용 설정** 토글 ON
3. **프로젝트 지원 이메일** 선택
4. **저장** 클릭

#### Apple 로그인 (iOS 필수)
1. **Apple** 클릭
2. **사용 설정** 토글 ON
3. **OAuth 코드 흐름 사용** (선택)
4. **저장** 클릭

**⚠️ Apple 로그인 설정 추가 필요사항**:
- Apple Developer 계정 필요
- Service ID 생성 및 설정
- Firebase Console에 Service ID 등록

### 2단계: 승인된 도메인 설정

**Authentication** > **설정** > **승인된 도메인**:
- 기본적으로 Firebase 도메인과 로컬호스트가 포함됩니다
- 커스텀 도메인 사용 시 추가 필요

---

## Firebase Storage 설정

### 1단계: Storage 활성화

1. Firebase Console > **Storage** 메뉴
2. **"시작하기"** 클릭
3. **프로덕션 모드** 선택 (보안 규칙 적용)
4. **위치** 선택 (Firestore와 동일한 리전 권장)
5. **"완료"** 클릭

### 2단계: Storage 보안 규칙 설정

Firebase Console > **Storage** > **규칙** 탭:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 코스 이미지: 모든 로그인 사용자 읽기, 관리자만 쓰기
    match /courses/{courseId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.token.admin == true;
    }
    
    // 라운드 이미지: 참가자만 접근
    match /rounds/{roundId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**저장** 클릭하여 규칙을 적용합니다.

---

## FCM (푸시 알림) 설정

### 1단계: Cloud Messaging 활성화

Firebase Console > **Cloud Messaging** 메뉴에서 자동으로 활성화됩니다.

### 2단계: Android FCM 설정

#### 2.1. 서버 키 확인

1. Firebase Console > 프로젝트 설정 > **Cloud Messaging** 탭
2. **서버 키** 복사 (나중에 서버에서 사용)

#### 2.2. Android 매니페스트 설정

`mobile-rn/android/app/src/main/AndroidManifest.xml`에 추가:

```xml
<manifest>
  <application>
    <!-- FCM 기본 채널 -->
    <meta-data
      android:name="com.google.firebase.messaging.default_notification_channel_id"
      android:value="lavesco_default_channel" />
  </application>
</manifest>
```

### 3단계: iOS FCM 설정

#### 3.1. APNs 인증 키 업로드

1. Apple Developer > **Certificates, Identifiers & Profiles**
2. **Keys** 섹션에서 APNs 인증 키 생성 또는 기존 키 사용
3. Firebase Console > 프로젝트 설정 > **Cloud Messaging** 탭
4. **Apple 앱 구성** 섹션에서 **APNs 인증 키 업로드**

#### 3.2. iOS 권한 설정

`mobile-rn/ios/` 프로젝트의 Info.plist에 추가:

```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>
```

### 4단계: 모바일 앱 FCM 설정

FCM 토큰 가져오기 및 알림 처리 코드는 앱 개발 단계에서 구현합니다.

---

## 검증 및 테스트

### 1단계: Firebase 연결 확인

#### 모바일 앱 (React Native)
```bash
cd mobile-rn
npm run android   # 또는 npm run ios
```

앱 실행 후 Firebase Console > **Authentication** > **사용자** 탭에서 테스트 계정 생성 확인

#### 관리자 웹
```bash
cd admin-web
npm run dev
```

브라우저 콘솔에서 Firebase 초기화 오류가 없는지 확인

### 2단계: Firestore 읽기/쓰기 테스트

Firebase Console > **Firestore Database**에서 수동으로 테스트 데이터 생성:

```json
{
  "test": "value",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 3단계: Functions 테스트

```bash
cd functions
npm run serve
```

로컬에서 Functions가 정상 작동하는지 확인

### 4단계: 전체 배포 테스트

```bash
# Firestore 규칙 및 인덱스
firebase deploy --only firestore

# Functions
firebase deploy --only functions

# 관리자 웹 (호스팅 설정 후)
firebase deploy --only hosting
```

---

## 문제 해결

### 문제 1: Firebase CLI 로그인 실패

**증상**: `firebase login` 실행 시 오류

**해결 방법**:
```bash
firebase logout
firebase login --no-localhost
```

### 문제 2: 모바일 앱 Firebase 초기화 오류

**증상**: `FirebaseException: [core/no-app] No Firebase App '[DEFAULT]' has been created`

**해결 방법**:
1. `firebase_options.dart` 파일이 생성되었는지 확인
2. `main.dart`에서 `Firebase.initializeApp()` 호출 확인
3. `google-services.json` (Android) 또는 `GoogleService-Info.plist` (iOS) 파일 위치 확인

### 문제 3: 관리자 웹 환경 변수 오류

**증상**: `NEXT_PUBLIC_FIREBASE_API_KEY is not defined`

**해결 방법**:
1. `.env.local` 파일이 `admin-web/` 디렉토리에 있는지 확인
2. 환경 변수 이름이 `NEXT_PUBLIC_`로 시작하는지 확인
3. 개발 서버 재시작: `npm run dev`

### 문제 4: Firestore 규칙 배포 실패

**증상**: `Error: HTTP Error: 400, Invalid request`

**해결 방법**:
1. `firestore.rules` 파일 문법 오류 확인
2. Firebase Console에서 규칙을 직접 테스트
3. Firebase CLI 버전 업데이트: `npm install -g firebase-tools@latest`

### 문제 5: Functions 배포 실패

**증상**: `Error: Functions did not deploy properly`

**해결 방법**:
1. `functions/package.json` 확인
2. `functions/src/index.ts` 컴파일 오류 확인: `npm run build`
3. Node.js 버전 확인 (18 이상 필요)
4. Firebase 프로젝트에서 Functions API 활성화 확인

### 문제 6: Android google-services.json 오류

**증상**: `File google-services.json is missing`

**해결 방법**:
1. 파일이 `mobile-rn/android/app/` 디렉토리에 있는지 확인
2. `mobile-rn/android/app/build.gradle`에 `apply plugin: 'com.google.gms.google-services'` 추가 확인
3. Android Studio에서 프로젝트 동기화

### 문제 7: iOS GoogleService-Info.plist 오류

**증상**: Xcode에서 파일을 찾을 수 없음

**해결 방법**:
1. 파일이 Xcode 프로젝트에 추가되었는지 확인 (mobile-rn/ios/)
2. Xcode에서 파일을 프로젝트에 추가 (드래그 앤 드롭)
3. "Copy items if needed" 체크
4. Target에 "Runner" 선택

---

## 체크리스트

설정 완료 후 다음 항목을 확인하세요:

### 공통
- [ ] Firebase 프로젝트 생성 완료
- [ ] `.firebaserc` 파일에 프로젝트 ID 설정
- [ ] Firebase CLI 로그인 완료
- [ ] Firebase 서비스 활성화 (Auth, Firestore, Storage, Functions, FCM)

### 모바일 앱 (React Native)
- [ ] Android 앱 등록 및 `google-services.json`을 `mobile-rn/android/app/`에 추가
- [ ] (iOS) iOS 앱 등록 및 `GoogleService-Info.plist`를 Xcode 프로젝트에 추가
- [ ] 앱 실행 테스트 성공 (`npm run android` 또는 `npm run ios`)

### 관리자 웹
- [ ] 웹 앱 등록 완료
- [ ] `.env.local` 파일 생성 및 환경 변수 설정
- [ ] 개발 서버 실행 테스트 성공

### Functions
- [ ] `npm install` 완료
- [ ] `npm run build` 성공
- [ ] Functions 배포 테스트 (선택)

### Firestore
- [ ] Firestore 데이터베이스 생성
- [ ] 보안 규칙 배포 완료
- [ ] 인덱스 배포 완료

### Authentication
- [ ] 이메일/비밀번호 활성화
- [ ] Google 로그인 활성화
- [ ] Apple 로그인 활성화 (iOS)

### Storage
- [ ] Storage 활성화
- [ ] Storage 보안 규칙 설정

### FCM
- [ ] Cloud Messaging 활성화
- [ ] Android FCM 설정 (선택)
- [ ] iOS APNs 키 업로드 (선택)

---

## 다음 단계

Firebase 설정이 완료되면 다음을 진행하세요:

1. ✅ **인증 시스템 구현** - 이메일/소셜 로그인
2. ✅ **Firestore 데이터 모델 구현** - Course, Round, Score 모델
3. ✅ **라운드 기능 구현** - 생성, 참가, 스코어 입력
4. ✅ **오프라인 동기화 구현** - Hive 로컬 캐시

---

## 참고 자료

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [React Native Firebase 문서](https://rnfirebase.io/)
- [Next.js Firebase 통합](https://firebase.google.com/docs/web/setup)
- [Firebase Functions 문서](https://firebase.google.com/docs/functions)

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-01-26
