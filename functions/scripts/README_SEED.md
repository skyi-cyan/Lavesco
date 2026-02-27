# 테스트 코스 데이터 넣기

## 방법 1: 시드 스크립트 실행 (권장)

1. **서비스 계정 키 발급**
   - [Firebase Console](https://console.firebase.google.com/) → 프로젝트 선택
   - ⚙️ **프로젝트 설정** → **서비스 계정** 탭
   - **새 비공개 키 생성** 클릭 → JSON 파일 다운로드

2. **스크립트 실행**
   ```bash
   cd functions
   set GOOGLE_APPLICATION_CREDENTIALS=다운로드한_JSON_파일_경로.json
   node scripts/seed-courses.js
   ```
   (PowerShell: `$env:GOOGLE_APPLICATION_CREDENTIALS="경로\파일명.json"`)

3. 성공 시 콘솔에 `테스트 코스 2개 추가 완료` 출력.

---

## 방법 2: Firebase Console에서 수동 추가

아래 두 코스는 `seed-courses.js`와 동일한 구조입니다. 콘솔에서 **Firestore Database** → **컬렉션 시작** / **문서 추가**로 하나씩 넣을 수 있습니다.

### 코스 1: 남서울 컨트리클럽

| 위치 | 문서 ID | 필드 |
|------|---------|------|
| `courses` | `course-namseoul` | name: "남서울 컨트리클럽", region: "경기", holesCount: 18, status: "ACTIVE", version: 1, updatedAt: (현재 시각) |
| `courses/course-namseoul/teesets` | `blue` | name: "Blue", gender: "M", rating: 72.1, slope: 132 |
| `courses/course-namseoul/teesets` | `white` | name: "White", gender: "M", rating: 70.2, slope: 128 |
| `courses/course-namseoul/holes` | `1` ~ `18` | par (3~5), order (1~18), distances: { blue: 숫자, white: 숫자 } (선택) |

### 코스 2: 강남 골프클럽

| 위치 | 문서 ID | 필드 |
|------|---------|------|
| `courses` | `course-gangnam` | name: "강남 골프클럽", region: "서울", holesCount: 18, status: "ACTIVE", version: 1, updatedAt: (현재 시각) |
| `courses/course-gangnam/teesets` | `blue` | name: "Blue", gender: "M", rating: 71.5, slope: 130 |
| `courses/course-gangnam/teesets` | `white` | name: "White", gender: "M", rating: 69.8, slope: 126 |
| `courses/course-gangnam/holes` | `1` ~ `18` | 위와 동일 구조 |

- **홀 문서**: 각 홀(1~18)에 `par`, `order`, (선택) `distances` 맵.  
  최소한 **코스 문서 2개**만 넣어도 앱 목록에는 나옵니다. 티셋/홀은 없으면 상세에서 빈 상태로 표시됩니다.
