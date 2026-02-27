# 코스 기능 구현 정리

## 1. 구현 범위 (Phase 1)

| 구분 | 내용 |
|------|------|
| **데이터** | Firestore `courses`, `courses/{id}/teesets`, `courses/{id}/holes` 읽기 (로그인 사용자) |
| **모델** | Course, TeeSet, Hole (PRD 6-1 스키마 기준) |
| **서비스** | 코스 목록 조회, 지역/이름 검색, 코스 상세(티셋·홀) 조회 |
| **화면** | 코스 목록(검색), 코스 상세(티셋 선택, 홀별 Par/거리) |
| **네비게이션** | /course, /course/:id 라우트, 홈에서 코스 메뉴 진입 |

## 2. Firestore 스키마 (참고)

- **courses/{courseId}**: name, region, holesCount, status, version, updatedAt
- **courses/{courseId}/teesets/{teeId}**: name, gender, rating, slope
- **courses/{courseId}/holes/{holeNo}**: par, handicapIndex, order, distances: { teeId: number }

인덱스: `region` ASC, `name` ASC (이미 정의됨)

## 3. 제외 (2차 구현)

- 즐겨찾기 / 최근 사용 코스 그룹
- 코스 메모 / 지도 / 사진
- 오프라인 캐시 (5분 TTL)

## 4. 구현 순서

1. 모델: Course, TeeSet, Hole
2. CourseService + Riverpod 프로바이더
3. 코스 목록 페이지 (검색)
4. 코스 상세 페이지 (티셋 선택, 홀 리스트)
5. 라우트 및 홈 연결

## 5. Firestore 인덱스 (필요 시)

지역 필터 쿼리(`status` + `region`) 사용 시 복합 인덱스가 필요할 수 있음.  
콘솔에서 안내되는 링크로 인덱스 생성하거나, `firestore.indexes.json`에 추가 후 `firebase deploy --only firestore:indexes`.

## 6. 테스트용 코스 데이터 넣기

```bash
cd functions
node scripts/seed-courses.js
```

- **인증**: 서비스 계정 키가 필요합니다.  
  Firebase Console → 프로젝트 설정 → 서비스 계정 → **새 비공개 키 생성** 후  
  `GOOGLE_APPLICATION_CREDENTIALS=경로/파일명.json node scripts/seed-courses.js` 로 실행하세요.
- **추가되는 데이터**: 코스 2개 (남서울 컨트리클럽 · 강남 골프클럽), 각 18홀, Blue/White 티셋.
