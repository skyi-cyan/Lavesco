# 라베스코 (Lavesco)

골프 스코어 공유 앱

## 프로젝트 개요

라베스코는 아마추어 골퍼들이 라운드를 함께 즐기며 실시간으로 스코어를 공유할 수 있는 모바일 애플리케이션입니다.

### 주요 기능
- 🏌️ 실시간 스코어 공유
- 📱 오프라인 지원
- 🎯 초대 코드 시스템
- 📊 스코어보드 및 통계
- 🗺️ 골프장 코스 정보

## 프로젝트 구조

```
Lavesco/
├── mobile-rn/          # React Native 모바일 앱
├── admin-web/          # Next.js 관리자 웹
├── functions/          # Firebase Cloud Functions
├── firestore/          # Firestore 보안 규칙 및 인덱스
└── docs/               # 문서
```

## 시작하기

### 필수 요구사항

- **Node.js**: 18.0.0 이상
- **React Native**: 개발 환경 설정 ([mobile-rn/README.md](./mobile-rn/README.md) 참고)
- **Firebase CLI**: 최신 버전
- **Firebase 프로젝트**: 생성 및 설정 완료

### 설치

#### 1. 모바일 앱 (React Native)

```bash
cd mobile-rn
npm install
```

#### 2. 관리자 웹

```bash
cd admin-web
npm install
```

#### 3. Firebase Functions

```bash
cd functions
npm install
```

### Firebase 설정

1. Firebase 프로젝트 생성
2. `.firebaserc` 파일에서 프로젝트 ID 설정
3. 각 프로젝트에 Firebase 설정 파일 추가:
   - `mobile-rn/`: `google-services.json` (Android), `GoogleService-Info.plist` (iOS) — [mobile-rn/README.md](./mobile-rn/README.md) 참고
   - `admin-web/`: `.env.local` 파일 생성
   - `functions/`: Firebase Admin SDK 자동 초기화

### 실행

#### 모바일 앱 (React Native, 개발)

```bash
cd mobile-rn
npm start
# 별도 터미널에서
npm run android   # 또는 npm run ios
```

자세한 실행 방법은 [mobile-rn/README.md](./mobile-rn/README.md)를 참고하세요.

#### 관리자 웹 (개발)

```bash
cd admin-web
npm run dev
```

#### Firebase Functions (로컬 테스트)

```bash
cd functions
npm run serve
```

## 배포

### Firestore 규칙 및 인덱스

```bash
firebase deploy --only firestore
```

### Cloud Functions

```bash
cd functions
npm run deploy
```

### 관리자 웹

```bash
cd admin-web
npm run build
firebase deploy --only hosting
```

## 개발 단계

### Phase 1 (MVP) - 8주
- ✅ 프로젝트 구조 생성
- ⏳ 인증 시스템
- ⏳ 코스 조회
- ⏳ 라운드 생성/참가
- ⏳ 스코어 입력
- ⏳ 스코어보드

### Phase 2 - 4주
- 오프라인 동기화
- FCM 알림
- 딥링크
- 기본 통계

### Phase 3 - 4주
- 친구 초대
- 결과 공유
- 상세 통계
- 관리자 웹 고도화

## 문서

- [PRD 문서](./docs/lavesco_prd_v1.1.md)
- [개발 제안서](./docs/proposal.md)
- [개발 환경 설치 가이드](./docs/INSTALLATION_GUIDE.md) ⭐
- [Firebase 설정 가이드](./docs/FIREBASE_SETUP_GUIDE.md) ⭐
- [모바일 앱 (RN) 설정 및 실행](./mobile-rn/README.md) ⭐

## 기술 스택

### Mobile
- **React Native**: 크로스 플랫폼 모바일 프레임워크
- **Firebase**: Auth, Firestore, FCM 등 백엔드 서비스

### Admin Web
- **Next.js 14**: React 프레임워크
- **TypeScript**: 타입 안전성
- **Tailwind CSS**: 스타일링

### Backend
- **Firebase Functions**: 서버리스 함수
- **Firestore**: NoSQL 데이터베이스
- **Firebase Auth**: 인증
- **FCM**: 푸시 알림

## 라이선스

프로젝트 라이선스 정보
