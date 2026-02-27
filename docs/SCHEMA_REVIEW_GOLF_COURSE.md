# 스키마 점검: 골프장 > 코스(전반/후반) > 홀

**구현 반영 (이미지 구조):**  
- Firestore `golfCourses` → `courses` → `holes`  
- 홀 문서: `par`, `handicapIndex`, `distances`: { **black**, **blue**, **white**, **red** } (이미지처럼 티별 거리)  
- 관리자 웹: 골프장(CC) 목록/등록, 상세에서 코스(황룡/청룡) 추가 및 코스별 홀 테이블(Black, Blue, White, Red, PAR, HDCP) 편집

---

## 1. 요구 구조

- **골프장** (Golf Facility) — 최상위. 예: 남서울 컨트리클럽  
- **코스** (Course) — 골프장 소속. **전반코스**(1~9홀), **후반코스**(10~18홀). (27홀은 전반/후반 + α)  
- **홀** (Hole) — 코스 소속. 전반코스는 홀 1~9, 후반코스는 홀 10~18  

PRD에도 이 흐름이 반영되어 있음:  
- Step 1 **골프장 선택**  
- Step 2 **전반 / 후반 코스 선택** (27홀 코스 대응)

---

## 2. 현재 스키마 (문제점)

| 현재 경로 | 의도/역할 | 문제 |
|-----------|------------|------|
| `courses/{courseId}` | 이름·지역·18홀 수 등 | **골프장**과 **코스(전반/후반)** 구분 없음. 하나의 문서가 “18홀 전체”를 의미함. |
| `courses/{courseId}/teesets/{teeId}` | 티셋 | 골프장 단위인지 코스 단위인지 불명확. |
| `courses/{courseId}/holes/{holeNo}` | 홀 1~18 | **전반코스(1~9)** / **후반코스(10~18)** 로 나뉜 “코스” 개념 없음. |

정리하면:

- **골프장** 계층이 없음 (현재 `courses`가 사실상 골프장처럼 사용됨).
- **코스(전반/후반)** 계층이 없음 (홀이 1~18로 한 덩어리).
- 따라서 “골프장 > 코스(전반코스, 후반코스) > 홀” 구조가 아님.

---

## 3. 제안 스키마 (3단계)

### 3-1. 컬렉션 구조

| 계층 | 경로 | 설명 |
|------|------|------|
| **골프장** | `golfCourses/{golfCourseId}` | 시설 단위. 이름, 지역, 주소 등. |
| **코스** | `golfCourses/{golfCourseId}/courses/{courseId}` | 전반/후반(및 27홀 시 추가 코스). 코스 타입, 홀 수 등. |
| **홀** | `golfCourses/{golfCourseId}/courses/{courseId}/holes/{holeNo}` | 해당 코스 소속 홀. 전반이면 1~9, 후반이면 10~18. |

티셋은 “18홀 공통”이면 골프장 단위, 코스별로 다르면 코스 단위로 둘 수 있음.

| 구분 | 경로 | 비고 |
|------|------|------|
| 골프장 공통 티셋 | `golfCourses/{golfCourseId}/teesets/{teeId}` | Blue/White/Red 등 18홀 공통일 때 |
| 코스별 티셋 | `golfCourses/.../courses/{courseId}/teesets/{teeId}` | 전반/후반별로 다른 경우만 사용 |

### 3-2. 문서 필드 예시

**골프장** `golfCourses/{golfCourseId}`

- name, region, address(선택), status, version, updatedAt  
- (선택) holesCount: 18 | 27 — 전체 홀 수

**코스** `golfCourses/{golfCourseId}/courses/{courseId}`

- name: "전반" | "후반" 또는 "East" 등
- courseType: "FRONT" | "BACK" (27홀 시 "EXTRA" 등)
- holeCount: 9 (또는 18)
- startHoleNo: 1(전반) | 10(후반) — 라운드/스코어 연계 시 유용
- order: 1, 2 (표시 순서)
- status, version, updatedAt

**홀** `golfCourses/{golfCourseId}/courses/{courseId}/holes/{holeNo}`

- holeNo: "1"~"9" (전반) 또는 "10"~"18" (후반)
- par, handicapIndex, order
- distances: { teeId: number } (티별 거리)

### 3-3. 라운드와의 연계

- `rounds` 문서에 골프장·코스 참조를 두는 방식으로 확장 필요.
- 예:  
  - `golfCourseId`, `courseId` (전반/후반 중 어떤 코스인지)  
  - 또는 18홀 라운드면 `golfCourseId` + `frontCourseId` + `backCourseId`  
- 기존 `courseId`, `teeId`(denorm) 등은 “골프장+코스+티셋”에 맞게 재정의.

---

## 4. 정리 및 권장

| 항목 | 현재 | 권장 |
|------|------|------|
| 최상위 | `courses` (사실상 골프장) | **골프장** 전용 컬렉션 `golfCourses` |
| 중간 | 없음 | **코스** 서브컬렉션 (전반/후반, 27홀 시 확장) |
| 홀 | `courses/.../holes/1~18` | **코스별** `courses/.../holes/1~9` 또는 `10~18` |
| 티셋 | `courses/.../teesets` | 골프장 단위 `golfCourses/.../teesets` (또는 코스 단위) |

- **지금 구현된 앱/관리자 웹**은 모두 “골프장=18홀 1덩어리”인 현재 `courses` 구조를 가정하고 있음.  
- **요구사항대로 하려면**  
  - 스키마를 **골프장 > 코스(전반/후반) > 홀** 로 위와 같이 변경하고,  
  - Firestore 규칙, 인덱스, 모바일/관리자 웹의 코스·라운드 로직을 이 구조에 맞게 수정해야 함.

다음 단계로,  
- “현재 `courses` 구조 유지 + 전반/후반은 화면/로직만 구분”할지,  
- “위 3단계 스키마로 이전하고 rounds/인덱스/규칙까지 정리”할지  
선택하면, 그에 맞춰 구체적인 마이그레이션/수정 순서도 정리할 수 있습니다.
