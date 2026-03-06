# 프로필 메뉴 구현 계획

## 1. 현재 상태

### 1.1 화면
- **ProfileScreen** (`mobile-rn/src/features/profile/ProfileScreen.tsx`)
  - 제목 "프로필", 표시명, 이메일, **로그아웃** 버튼만 존재
  - 메뉴 구조 없음

### 1.2 데이터
- **UserProfile** (`core/types/userProfile.ts`): `uid`, `email`, `displayName`, `nickname`, `photoURL`, `provider`, `handicap`, `defaultTee`, `termsAgreement`, `createdAt`, `updatedAt`
- **AuthContext**: `user`, `profile`, `signOut` 등 제공, 로그인 시 `users/{uid}` 프로필 로드
- **Firestore**: `users/{uid}` — 본인만 읽기/쓰기 가능 (규칙 이미 정의됨)

### 1.3 PRD 기준 (내 기록 탭)
- **3-6. 내 기록 탭 (D)**  
  - 내 라운드 기록 (기간/코스별/월별 필터)  
  - 통계 (2차): 평균 타수, 최근 추이, 베스트 라운드, 코스별 성적  
  - **프로필 / 설정**  
    - 닉네임 / 핸디캡 / 기본 티  
    - 알림 설정  
    - 로그아웃 / 회원 탈퇴 (탈퇴 시 데이터 처리 정책 명시)

---

## 2. 목표

프로필 탭을 **메뉴 형태**로 재구성하고, PRD의 프로필/설정 항목을 1차 범위로 구현한다.

- 프로필 메뉴 목록 UI (섹션 구분)
- 프로필 수정: 닉네임, 핸디캡, 기본 티
- 알림 설정 (온/오프)
- 로그아웃 유지
- 회원 탈퇴는 2차로 보류 (데이터 정책 정의 후 진행)

---

## 3. 화면 설계

### 3.1 프로필 메인 (메뉴)

```
┌─────────────────────────────────────┐
│  프로필                              │
├─────────────────────────────────────┤
│  [프로필 영역]                        │
│  (선택) 프로필 사진                   │
│  닉네임 (또는 표시명)                  │
│  이메일                              │
│  [프로필 수정 >]                      │
├─────────────────────────────────────┤
│  설정                                │
│  · 알림 설정                    [>]  │
├─────────────────────────────────────┤
│  계정                                │
│  · 로그아웃                    [>]  │
└─────────────────────────────────────┘
```

- **프로필 수정 >**: 닉네임/핸디캡/기본 티 편집 화면으로 이동
- **알림 설정**: 알림 On/Off (추후 FCM 연동 시 사용할 저장소만 준비 가능)
- **로그아웃**: 기존처럼 확인 후 `signOut()`

### 3.2 프로필 수정 화면 (신규)

- **닉네임**: 텍스트 입력, 저장 시 Firestore `users/{uid}` 업데이트
- **핸디캡**: 숫자 입력 (소수 가능) 또는 슬라이더 (요구에 따라 선택)
- **기본 티**: Black / Blue / White / Red 중 선택 (코스/라운드에서 사용)
- 저장 시 AuthContext의 `profile` 갱신 필요 (재조회 또는 콜백)

---

## 4. 구현 단계

### Phase 1: 프로필 메뉴 UI 및 프로필 수정 (1차)

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | 프로필 메뉴 UI | ProfileScreen을 섹션 리스트 형태로 변경. 상단에 표시명/이메일, 그 아래 "프로필 수정", "알림 설정", "로그아웃" 메뉴 항목 |
| 2 | 프로필 수정 화면 | 새 화면 `ProfileEditScreen` (또는 모달). 닉네임, handicap, defaultTee 입력/선택 폼 |
| 3 | 프로필 업데이트 API | `authService` 또는 전용 `profileService`에 `updateUserProfile(uid, partial)` 추가. Firestore `users/{uid}` updateDoc, `updatedAt` 갱신 |
| 4 | AuthContext 연동 | 프로필 수정 저장 후 AuthContext의 `profile` 갱신 (예: `refreshProfile()` 또는 setProfile 콜백) |
| 5 | 네비게이션 | MainTabs의 Profile을 Stack으로 감싸거나, Profile 내부에서 "프로필 수정" 시 Stack push (구조에 맞게 선택) |

### Phase 2: 알림 설정 (1차 확장)

| 순서 | 작업 | 설명 |
|------|------|------|
| 6 | 알림 설정 화면 | NotificationSettingsScreen. 토글: 푸시 알림 On/Off (실제 FCM은 추후 연동 가능) |
| 7 | 저장소 | AsyncStorage 또는 Firestore `users/{uid}.settings.notifications` 등에 저장. 앱에서 읽어 알림 요청/해제에 사용 |

### Phase 3: 2차 (보류)

- 내 라운드 기록: 라운드 목록 필터 화면
- 통계: 평균 타수, 베스트 라운드 등
- 회원 탈퇴: 데이터 익명화 정책 수립 후 구현

---

## 5. 파일/구조 제안

```
mobile-rn/src/
├── app/
│   └── MainTabs.tsx              # Profile 탭을 ProfileStack으로 교체 가능
├── features/
│   └── profile/
│       ├── ProfileScreen.tsx     # 메뉴 목록 (리팩터)
│       ├── ProfileEditScreen.tsx # 신규: 닉네임/핸디캡/기본 티
│       └── NotificationSettingsScreen.tsx  # Phase 2
├── core/
│   ├── auth/
│   │   └── AuthContext.tsx       # refreshProfile 또는 setProfile 노출
│   ├── services/
│   │   └── profileService.ts     # 신규: updateUserProfile (Firestore)
│   └── types/
│       └── userProfile.ts        # 기존 유지
```

- **네비게이션**: Profile 탭만 Stack으로 감싸서 `Profile`(메뉴) → `ProfileEdit`, `NotificationSettings` push 방식 권장.

---

## 6. 데이터/보안

- **Firestore**  
  - `users/{uid}`: 기존 규칙 그대로 사용.  
  - 업데이트 필드: `nickname`, `handicap`, `defaultTee`, `updatedAt` (필요 시 `displayName` 등 추가).
- **알림 설정**  
  - Phase 2에서 `users/{uid}`에 `settings: { notifications: boolean }` 또는 로컬(AsyncStorage) 선택.

---

## 7. 체크리스트 (Phase 1 완료 기준)

- [ ] ProfileScreen이 메뉴 형태(프로필 요약 + 메뉴 리스트)로 동작
- [ ] "프로필 수정" 진입 시 닉네임/핸디캡/기본 티 편집 가능
- [ ] 프로필 저장 시 Firestore 반영 및 앱 내 profile 상태 반영
- [ ] "로그아웃" 기존과 동일 동작
- [ ] (Phase 2) 알림 설정 화면 및 On/Off 저장

이 계획대로 Phase 1부터 적용하면, 프로필 메뉴와 프로필 수정까지 1차 범위를 안정적으로 구현할 수 있습니다.
