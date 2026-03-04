# 빠른 시작 가이드

라베스코 프로젝트를 빠르게 시작하기 위한 간단한 가이드입니다.

## 🚀 5분 안에 시작하기

### 1. Firebase 프로젝트 생성 (2분)

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 새 프로젝트 생성
3. 프로젝트 ID 확인

### 2. 프로젝트 설정 (1분)

`.firebaserc` 파일 수정:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 3. 모바일 앱 (React Native) 설정 (1분)

Firebase Console에서 Android/iOS 앱 등록 후, `google-services.json`(Android)과 `GoogleService-Info.plist`(iOS)를 `mobile-rn`에 추가합니다. 자세한 방법은 [mobile-rn/README.md](../mobile-rn/README.md)를 참고하세요.

### 4. 관리자 웹 설정 (1분)

`admin-web/.env.local` 파일 생성:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## 📚 상세 가이드

더 자세한 설정이 필요하다면 다음 문서를 참조하세요:

- **[Firebase 설정 가이드](./FIREBASE_SETUP_GUIDE.md)** - 단계별 상세 설정
- **[프로젝트 설정 가이드](../SETUP.md)** - 전체 프로젝트 설정

## ✅ 체크리스트

- [ ] Firebase 프로젝트 생성
- [ ] `.firebaserc` 파일 설정
- [ ] 모바일 앱 (RN) Firebase 설정
- [ ] 관리자 웹 환경 변수 설정
- [ ] Firestore 규칙 배포

## 🎯 다음 단계

설정이 완료되면 다음을 진행하세요:

1. 인증 시스템 구현
2. 코스 기능 구현
3. 라운드 기능 구현
