# Lavesco Firebase Functions

라베스코 Firebase Cloud Functions

## 시작하기

### 필수 요구사항
- Node.js 18.0.0 이상
- Firebase CLI 설치 (`npm install -g firebase-tools`)
- Firebase 프로젝트 설정 완료

### 설치

```bash
npm install
```

### 빌드

```bash
npm run build
```

### 로컬 테스트

```bash
npm run serve
```

### 배포

```bash
npm run deploy
```

## Functions 목록

### Invites
- `generateInviteCode`: 초대 코드 생성

### Scores
- `aggregateScores`: 스코어 집계 자동 계산 (트리거)

### Notifications
- (Phase 2에서 구현 예정)
