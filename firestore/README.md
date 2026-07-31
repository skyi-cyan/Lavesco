# Firestore 설정

앱(mobile-rn)·관리자(admin-web)용 보안 규칙 및 인덱스입니다.

## 파일 구조

- `rules/firestore.rules`: 보안 규칙
- `indexes/firestore.indexes.json`: 복합 인덱스

## 스키마 요약

| 경로 | 용도 |
|------|------|
| `golfCourses/{id}/courses/{id}/holes/{n}` | 정식 골프장 카탈로그 |
| `courses/{id}` | **레거시** (시드/호환). 신규 쓰기는 `golfCourses`만 사용 |
| `rounds/{id}` | 라운드 메타 (`createdBy`, `roundNumber` 6자리, `status`) |
| `rounds/{id}/participants\|scores/{uid}` | 참가자·스코어 |
| `invites/{roundNumber}` | 참여 코드 → `roundId` (목록 list 금지, get만) |
| `users/{uid}` | 프로필 + **`roundCount`** (참여 수 비정규화) |
| `users/{uid}/roundIds/{roundId}` | 내 라운드 인덱스 (`createdAt` 권장) |
| `users/{uid}/distanceRecords` | GPS 거리 (앱에서 최근 100건 limit) |
| `courseAddRequests/{id}` | 코스 추가 요청 |

## 운영 스크립트

- `functions/scripts/set-admin.js` — admin 클레임
- `functions/scripts/backfill-round-count.js` — 기존 유저 `roundCount` 백필

## 배포

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

인덱스 배포 후 Console에서 빌드 완료까지 수 분 걸릴 수 있습니다.
