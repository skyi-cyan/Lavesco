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
- `notifyCourseAddRequestCreated`: 코스 추가 요청 등록 시 `dev@burunet.co.kr` 메일 알림

## 코스 추가 요청 메일 설정 (SMTP)

> `firebase functions:config:set` 는 **더 이상 기본으로 사용할 수 없습니다** (2026-03 이후 제거 예정).  
> 아래 **`.env` 방식**을 사용하세요.

### 1) Blaze 플랜
https://console.firebase.google.com/project/scorecard-app-6f9bd/usage/details

### 2) `functions/.env` 작성

```powershell
cd D:\NewProduct\Lavesco\functions
copy .env.example .env
notepad .env
```

예시 (Gmail / Google Workspace):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dev@burunet.co.kr
SMTP_PASS=앱비밀번호
SMTP_FROM=라베스코 알림 <dev@burunet.co.kr>
```

- Gmail/Workspace: Google 계정 → 보안 → 2단계 인증 → **앱 비밀번호** 사용
- Cafe24 예: `SMTP_HOST=smtp.cafe24.com`
- 가비아 예: `SMTP_HOST=smtp.gabia.com`

`.env` 는 Git에 올리지 마세요 (비밀번호 포함).

### 3) 배포

```powershell
cd D:\NewProduct\Lavesco
firebase deploy --only functions
```

배포 시 Firebase CLI가 `functions/.env` 값을 Functions 런타임에 넣습니다.

### 4) 확인
앱에서 코스 추가 요청 1건 등록 → `dev@burunet.co.kr` 수신함(스팸함 포함) 확인

```powershell
firebase functions:log
```

### 대안: Trigger Email 확장
SMTP를 `.env`에 넣기 싫으면 Console → Extensions → **Trigger Email from Firestore** 설치, 컬렉션 `mail` 지정.
