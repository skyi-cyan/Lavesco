# 관리자 웹 — 코스 기능 구현 정리

## 1. 목표

관리자 웹에서 **코스(course)** 를 등록·수정·삭제하고, **티셋**과 **홀별 데이터**(Par, 거리 등)를 관리할 수 있도록 한다.

---

## 2. 전제 조건

| 항목 | 내용 |
|------|------|
| **권한** | Firestore 규칙: `courses/**` 쓰기는 **admin 커스텀 클레임** 보유자만 가능. 관리자 로그인 계정에 `admin: true` 클레임이 있어야 함. |
| **인증** | 관리자 웹 로그인 (Firebase Auth). 로그인 후 Firestore 쓰기 시 ID 토큰에 `admin` 클레임 포함 필요. |
| **커스텀 클레임 설정** | Firebase Console 또는 Admin SDK로 특정 UID에 `admin: true` 설정. (설정 방법은 별도 가이드 참고) |

---

## 3. Firestore 스키마 (참고)

| 경로 | 필드 | 비고 |
|------|------|------|
| **courses/{courseId}** | name, region, holesCount, status, version, updatedAt | 코스 기본 정보 |
| **courses/{courseId}/teesets/{teeId}** | name, gender, rating, slope | Blue / White / Red 등 |
| **courses/{courseId}/holes/{holeNo}** | par, handicapIndex, order, distances: { teeId: number } | 홀 번호 '1'~'18', 티별 거리(야드) |

---

## 4. 구현 범위

### 4-1. 1차 구현 (우선)

| 기능 | 설명 |
|------|------|
| **관리자 로그인** | Firebase Auth (이메일/비밀번호 또는 Google). 로그인 페이지 + 로그인 여부에 따른 라우팅. |
| **코스 목록** | Firestore `courses` 조회, 테이블/카드로 표시. 지역·이름 검색(선택). |
| **코스 등록** | 새 코스 문서 생성. 이름, 지역, 홀 수(18 등), 상태 입력. |
| **코스 수정** | 기존 코스 문서 필드 수정. |
| **코스 삭제** | 코스 문서 삭제. (서브컬렉션 teesets, holes 정책: 함께 삭제 또는 경고만) |
| **티셋 목록·추가·수정·삭제** | 해당 코스의 `teesets` 서브컬렉션 CRUD. name, gender, rating, slope. |
| **홀 목록·편집** | 해당 코스의 `holes` 서브컬렉션. 홀별 par, handicapIndex, order, distances(티별 거리) 입력. 18홀 그리드/폼. |

### 4-2. 2차 구현 (선택)

| 기능 | 설명 |
|------|------|
| Excel/CSV 일괄 업로드 | 18홀 × 티셋 거리 일괄 입력 (PRD 10-2). |
| 코스 이미지 / 지도 | Firebase Storage 업로드, URL 저장. |
| 관리자 계정 권한 UI | 커스텀 클레임 부여/해제 화면 (또는 콘솔/스크립트로만 관리). |

---

## 5. 화면 구성 (1차)

| 화면 | 경로 | 내용 |
|------|------|------|
| **로그인** | `/login` | 이메일/비밀번호 또는 Google. 관리자만 접속 가정. |
| **대시/홈** | `/` | 코스 관리 링크 등. |
| **코스 목록** | `/courses` | 코스 테이블, "추가" 버튼, 행별 수정/삭제. |
| **코스 등록** | `/courses/new` | 코스 기본 정보 폼 → 저장 시 `courses` 문서 생성. |
| **코스 상세·수정** | `/courses/[courseId]` | 코스 기본 정보 수정 + 티셋 관리 + 홀 편집 탭/섹션. |
| **티셋 추가/수정** | 코스 상세 내 모달 또는 인라인 | teesets 서브컬렉션 추가·수정. |
| **홀 편집** | 코스 상세 내 | 1~18홀 테이블, par / order / handicapIndex / distances(티별) 입력. |

---

## 6. 기술 스택 (현재)

- **Next.js 16**, **React 19**, **TypeScript**
- **Firebase**: Auth, Firestore (config: `lib/firebase/config.ts`)
- **Tailwind CSS**
- **React Query**, **React Hook Form**, **Zod**, **Zustand** (이미 설치됨)

---

## 7. 구현 순서 제안

1. **인증**  
   - 로그인 페이지 (`/login`).  
   - Firebase Auth 연동, 로그인 상태에 따른 리다이렉트 (미로그인 시 `/login`).  
   - (선택) admin 클레임 확인 후만 `/courses` 접근 허용.

2. **레이아웃·네비**  
   - 공통 레이아웃 (헤더, 사이드 또는 상단 네비), "코스 관리" 링크 → `/courses`.

3. **코스 목록**  
   - Firestore `courses` 컬렉션 조회 (목록).  
   - 테이블 UI, 검색(지역/이름) 옵션, "코스 추가" → `/courses/new`.

4. **코스 등록**  
   - 폼: name, region, holesCount, status.  
   - 저장 시 `addDoc` 또는 `setDoc`으로 문서 생성 후 `/courses/[courseId]`로 이동.

5. **코스 상세·수정**  
   - `courses/[courseId]` 문서 로드, 기본 정보 폼 수정 후 저장.  
   - 하위에 "티셋 관리", "홀 편집" 섹션 배치.

6. **티셋 CRUD**  
   - `courses/[courseId]/teesets` 조회, 추가/수정/삭제.  
   - 홀 편집 시 선택된 티셋 목록과 distances 키로 사용.

7. **홀 편집**  
   - `courses/[courseId]/holes` 1~18 문서 조회/생성.  
   - 테이블 또는 그리드: holeNo, par, handicapIndex, order, distances[teeId].  
   - 저장 시 각 홀 문서 set/update.

8. **코스 삭제**  
   - 확인 다이얼로그 후 코스 문서 삭제. (필요 시 teesets/holes 순차 삭제 또는 Cloud Function으로 일괄 삭제.)

---

## 8. 주의사항

- **admin 클레임**: Firestore 쓰기가 되려면 로그인 사용자 토큰에 `admin: true` 커스텀 클레임이 있어야 함. 없으면 권한 오류 발생.
- **문서 ID**: 코스는 자동 ID 또는 slug(예: `course-namseoul`) 사용 가능. 일관성만 유지하면 됨.
- **holes 문서 ID**: PRD 권장대로 문자열 `'1'`~`'18'` 사용.

이 문서를 기준으로 관리자 웹 코스 기능을 단계별로 구현하면 됩니다.
