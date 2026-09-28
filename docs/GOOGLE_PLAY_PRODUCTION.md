# Google Play 프로덕션 출시 체크리스트 (Lavesco)

앱: **라베스코** · 패키지: `com.lavesco.app` · 대상 버전: **1.0.13** (versionCode **14**)

내부 테스트 절차는 [GOOGLE_PLAY_INTERNAL_TESTING.md](./GOOGLE_PLAY_INTERNAL_TESTING.md)를 참고하세요.

---

## A. 빌드 산출물

| 항목 | 값 |
|------|-----|
| AAB | `mobile-rn/dist/lavesco-1.0.6-production.aab` |
| versionName | `1.0.6` |
| versionCode | `7` |
| 서명 | 업로드 키스토어 (`lavesco-upload.keystore`) |

재빌드:

```powershell
cd D:\NewProduct\Lavesco\mobile-rn
npm run android:bundle:release
```

---

## B. 제출 전 필수 (Play Console)

### 1. 스토어 등록정보

- [ ] 앱 이름: 라베스코
- [ ] 짧은 설명 (80자 이내)
- [ ] 자세한 설명
- [ ] 앱 아이콘 512×512 — `docs/assets/play-store/lavesco-icon-512.png`
- [ ] 폰 스크린샷 2장 이상 (로그인, 홈, 라운드 등)
- [ ] 기능 그래픽 1024×500 (필수인 경우)
- [ ] 카테고리: 스포츠
- [ ] 문의 이메일: `dev@burunet.co.kr`
- [ ] 개인정보처리방침 URL: `https://www.burunet.co.kr/privacy/lavesco.html`  
  → 브라우저에서 라베스코 방침 페이지가 열리는지 확인

### 2. 정책·규정

- [ ] **데이터 안전** 양식 작성 (이메일, 닉네임, 위치/GPS 거리기록, Firebase 인증·저장소 등)
- [ ] **콘텐츠 등급** (IARC) 설문 완료
- [ ] 광고 여부: 없음 (해당 시)
- [ ] 대상 연령 / 가족 정책 해당 여부 선택
- [ ] Play App Signing 사용 중인지 확인 (권장·기본)

### 3. Firebase / 로그인 (릴리스)

- [ ] 업로드 키 **SHA-1**이 Firebase Android 앱에 등록됨
- [ ] Play App Signing을 쓰는 경우 **앱 서명 키 SHA-1**도 Firebase에 등록
- [ ] 릴리스 빌드에서 Google 로그인 동작 확인 (내부 테스트 또는 프로덕션 전 트랙)

### 4. 백엔드

- [ ] Firebase 프로덕션 프로젝트 (`scorecard-app-6f9bd`) 사용
- [ ] Firestore 규칙·인덱스가 최신
- [ ] 코스 추가 요청 메일 (`notifyCourseAddRequestCreated`) 동작 확인
- [ ] 관리자 웹 접근·코스 등록 가능

---

## C. 프로덕션 트랙 업로드

1. [Google Play Console](https://play.google.com/console) → 라베스코
2. **테스트 및 출시** → **프로덕션**
3. **새 버전 만들기**
4. `lavesco-1.0.6-production.aab` 업로드
5. 출시 노트 예:

```
라베스코 1.0.6
• 라운드 생성 안정성 개선 (Firestore 일시 오류 재시도)
• 라운드 생성·참여·스코어 기록
• 코스 조회·가이드
• GPS 거리기록
```

6. 국가/지역 선택
7. **검토를 위해 버전 보내기** (또는 단계적 출시 %)

> 재심사 시 **versionCode 7 (1.0.6)** 이상을 업로드하세요.

---

## G. Google Play 심사 대응 (라운드 생성 실패)

### 증상 (심사팀 스크린샷)

| 메시지 | 의미 |
|--------|------|
| `[firestore/unavailable] The service is currently unavailable...` | Firebase Firestore 일시 연결 불가 (네트워크·서버 일시 장애) |
| `라운드 번호 생성에 실패했습니다. 다시 시도해 주세요.` | 6자리 번호 중복 확인 후에도 저장 실패, 또는 번호 선점 16회 연속 실패 |

골프장 목록은 보이지만 **라운드 생성(쓰기)** 만 실패한 경우 → 인증·읽기는 정상, **쓰기 구간의 일시 오류** 또는 **번호 선점→배치 저장 사이 경합** 가능성이 큼.

### 코드 대응 (1.0.6)

- 라운드 생성을 **Firestore 트랜잭션**으로 변경 (번호 확인·rounds·invites·participants 원자적 저장)
- `firestore/unavailable` 등 **일시 오류 자동 재시도** (지수 백오프)
- 사용자에게 **한국어 안내** (네트워크 확인 후 재시도)

### Play Console — 심사 정보 (필수)

**앱 액세스** → 로그인 필요 → **데모 계정 제공**:

```
이메일: (Firebase Authentication에 미리 생성한 테스트 계정)
비밀번호: (8자 이상, 심사 전용)
```

**심사 노트 (영문 권장)** 예:

```
Demo account (required):
Email: reviewer@example.com
Password: ********

How to test "Create Round":
1. Log in with the demo account.
2. Tap "Round" tab → tap create round (+) or Home → "Create Round".
3. Enter any round name, select a golf course (e.g. search "라비"),
   pick front/back course, date, tee time → tap Done.
4. A 6-digit round number appears on success.

Notes:
- Internet connection is required (Firebase Firestore).
- If creation fails once, tap Done again (transient network errors).
- Contact: dev@burunet.co.kr
```

데모 계정은 Firebase Console → Authentication에서 **사전 생성**하고, 앱에서 한 번 로그인해 `users/{uid}` 프로필이 있는지 확인하세요.

### 재제출 순서

1. `1.0.6` AAB 빌드 (`npm run android:bundle:release`)
2. Play Console → 프로덕션(또는 거절된 트랙) → 새 버전 업로드
3. **앱 콘텐츠 → 앱 액세스**에 데모 계정 입력
4. **검토를 위해 버전 보내기**

---

## D. 심사·출시 후 스모크 테스트

스토어에서 설치한 프로덕션 빌드로 확인:

- [ ] 이메일 가입 / 로그인
- [ ] Google 로그인
- [ ] 라운드 생성·초대·참여·스코어 입력
- [ ] 코스 목록·상세·가이드(WebView)
- [ ] 거리기록 (GPS 권한)
- [ ] 코스 추가 요청 → `dev@burunet.co.kr` 메일
- [ ] 프로필 / 로그아웃

---

## E. 자주 막히는 항목

| 증상 | 확인 |
|------|------|
| 출시 버튼 비활성 | 스토어 등록정보·데이터 안전·콘텐츠 등급 미완료 |
| 개인정보 URL 오류 | `https://www.burunet.co.kr/privacy/lavesco.html` 접속 |
| Google 로그인만 실패 | Play 앱 서명 SHA-1을 Firebase에 추가 |
| versionCode 충돌 | `build.gradle`에서 versionCode 증가 후 재빌드 |
| 라운드 생성 실패 (심사) | 데모 계정·심사 노트 추가, 1.0.6+ 업로드, 네트워크 필요 안내 |

---

## F. 짧은 설명 / 자세한 설명 (붙여넣기용)

**짧은 설명**

```
골프 라운드 스코어 기록·공유, 코스 조회, GPS 거리기록까지 한 번에 관리하는 라베스코
```

**자세한 설명**

```
라베스코(Lavesco)는 골프 라운드를 함께 즐기는 동반자를 위한 스코어 기록·공유 앱입니다.

라운드를 만들고 번호로 초대한 뒤, 각자 스마트폰에서 홀별 스코어를 입력하세요. 복잡한 설정 없이 빠르게 기록하고, 라운드가 끝나면 나만의 골프 통계를 확인할 수 있습니다.

■ 주요 기능
• 라운드 만들기·초대·참여
• 홀별 스코어 입력 및 확정
• 홈 대시보드·나의 기록 통계
• 골프장·코스 정보 조회 및 코스 가이드
• GPS 기반 클럽 거리기록
• 없는 코스 추가 요청

문의: dev@burunet.co.kr
```

---

*문서 기준일: 2026-08-11 · 빌드 버전 1.0.6 (versionCode 7)*
