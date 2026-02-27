# 라베스코 프로젝트 설정 가이드

> 📖 **상세한 Firebase 설정 가이드**: [FIREBASE_SETUP_GUIDE.md](./docs/FIREBASE_SETUP_GUIDE.md)를 참조하세요.

## 초기 설정 단계

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 새 프로젝트 생성
3. 프로젝트 ID 확인

### 2. Firebase 프로젝트 설정

#### `.firebaserc` 파일 수정

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 3. Flutter 앱 설정

#### Android 설정

1. Firebase Console > 프로젝트 설정 > Android 앱 추가
2. 패키지 이름 입력 (예: `com.lavesco.app`)
3. `google-services.json` 다운로드
4. `mobile/android/app/` 디렉토리에 복사

#### iOS 설정

1. Firebase Console > 프로젝트 설정 > iOS 앱 추가
2. 번들 ID 입력 (예: `com.lavesco.app`)
3. `GoogleService-Info.plist` 다운로드
4. `mobile/ios/Runner/` 디렉토리에 복사

#### Firebase 옵션 생성

```bash
cd mobile
flutter pub add firebase_core
dart pub global activate flutterfire_cli
flutterfire configure
```

### 4. 관리자 웹 설정

#### 환경 변수 파일 생성

`admin-web/.env.local` 파일 생성:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Firebase Console > 프로젝트 설정 > 일반 탭에서 웹 앱 추가 후 값 확인

### 5. Firebase Functions 설정

Functions는 Firebase 프로젝트와 자동으로 연동됩니다.

```bash
cd functions
npm install
npm run build
```

### 6. Firestore 보안 규칙 배포

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 7. 관리자 권한 설정

Firebase Console > Authentication > 사용자에서 관리자 계정의 커스텀 클레임 설정:

```javascript
// Firebase Console > Functions > Cloud Functions for Firebase에서 실행
admin.auth().setCustomUserClaims(uid, { admin: true });
```

또는 Firebase Admin SDK를 사용하여 설정:

```typescript
// functions/src/admin/setAdmin.ts (새로 생성)
import * as admin from 'firebase-admin';

export const setAdmin = functions.https.onCall(async (data, context) => {
  // 기존 관리자만 실행 가능하도록 보안 설정 필요
  const { uid } = data;
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  return { success: true };
});
```

## 다음 단계

설정이 완료되면 다음을 진행하세요:

1. Flutter 앱 실행 테스트
2. 관리자 웹 실행 테스트
3. Firebase Functions 배포 테스트
4. Firestore 보안 규칙 테스트

## 문제 해결

### Flutter Firebase 설정 오류
- `firebase_options.dart` 파일이 생성되었는지 확인
- `google-services.json` 및 `GoogleService-Info.plist` 파일 위치 확인

### 관리자 웹 환경 변수 오류
- `.env.local` 파일이 `admin-web/` 디렉토리에 있는지 확인
- 환경 변수 이름이 `NEXT_PUBLIC_`로 시작하는지 확인

### Firestore 규칙 배포 오류
- Firebase CLI 로그인 확인: `firebase login`
- 프로젝트 선택 확인: `firebase use`
