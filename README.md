# Lavesco Admin Web

라베스코 관리자 웹 애플리케이션 (Next.js)

## 시작하기

### 필수 요구사항
- Node.js 18.0.0 이상
- Firebase 프로젝트 설정 완료

### 설치

```bash
npm install
```

### 환경 변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 실행

개발 서버:
```bash
npm run dev
```

프로덕션 빌드:
```bash
npm run build
npm start
```

## 프로젝트 구조

```
app/              # Next.js App Router
components/       # React 컴포넌트
lib/
  ├── firebase/   # Firebase 설정
  ├── hooks/      # Custom hooks
  └── utils/      # 유틸리티 함수
types/            # TypeScript 타입 정의
```
