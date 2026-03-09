# 참여하기 기능 구현 방안

## 1. 목표

- **라운드 번호(4자리)**로 다른 사용자가 만든 라운드를 검색하고, **참여하기**를 통해 해당 라운드에 멤버로 추가된다.
- 참여 후에는 **참여 중인 라운드** 목록에 표시되고, 스코어 등록/확정 플로우는 기존과 동일하게 동작한다.

---

## 2. 현재 구조 정리

### 2.1 Firestore

| 경로 | 용도 |
|------|------|
| `rounds/{roundId}` | 라운드 메타 (roundNumber, 골프장, 코스, status 등) |
| `rounds/{roundId}/participants/{uid}` | 참가자 (HOST/MEMBER, joinStatus, 스코어 합계 등) |
| `rounds/{roundId}/scores/{uid}` | 유저별 홀 스코어 |
| `users/{uid}/roundIds/{roundId}` | 해당 유저가 참여 중인 라운드 ID (목록 조회용) |

### 2.2 라운드 생성 시 (createRound)

- `rounds` 문서 생성, **roundNumber** 4자리 부여 (1000~9999)
- `participants/{hostUid}` 에 HOST, joinStatus: 'JOINED' 추가
- `users/{hostUid}/roundIds/{roundId}` 등록

### 2.3 참여 목록 조회 (fetchUserRounds)

- `users/{uid}/roundIds` 로 roundId 목록 조회 → 각 roundId로 `fetchRound` 호출
- **참여하기로 추가된 라운드도** `users/{uid}/roundIds`에만 넣어주면 목록에 자동으로 포함됨

---

## 3. 참여하기 흐름

```
[라운드 목록] → "참여하기" 탭
    → [참여하기 화면] 4자리 라운드 번호 입력
    → "검색" 또는 "참여하기" 버튼
    → (1) 라운드 번호로 라운드 조회
    → (2) 없으면 "라운드를 찾을 수 없습니다"
    → (3) 있으면 라운드 정보 표시 (골프장, 날짜, 라운드명 등) + "참여하기" 버튼
    → (4) 참여하기 실행: participants 추가 + users/roundIds 등록
    → (5) 이미 참여 중이면 "이미 참여 중입니다" 또는 그대로 상세로 이동
    → (6) 성공 시 라운드 상세(RoundDetail) 또는 목록(RoundList)으로 이동
```

---

## 4. 백엔드(서비스) 구현

### 4.1 라운드 번호로 조회

- **함수**: `fetchRoundByRoundNumber(roundNumber: string): Promise<Round | null>`
- **로직**:  
  `rounds` 컬렉션에서 `roundNumber` 필드가 일치하는 문서 1건 조회.  
  (Firestore: `where('roundNumber', '==', roundNumber).limit(1)`)
- **고려**:  
  - 4자리 번호가 우연히 중복될 수 있음 → 첫 번째 결과만 사용하거나, 필요 시 생성 시 중복 방지 로직 추가 검토.

### 4.2 참여 처리

- **함수**: `joinRound(roundId: string, uid: string, nickname: string | null): Promise<void>`
- **로직**:
  1. `rounds/{roundId}` 존재 여부 확인 (없으면 throw)
  2. `rounds/{roundId}/participants/{uid}` 존재 여부 확인
  3. **이미 있으면**:  
     - `users/{uid}/roundIds/{roundId}` 없으면만 등록 (이미 참여 중인 경우 대비)  
     - 정상 완료로 처리 (중복 참여 방지)
  4. **없으면**:
     - `participants/{uid}` 문서 생성  
       - role: `'MEMBER'`, joinStatus: `'JOINED'`  
       - holesEntered, totalOut, totalIn, total: 0  
       - nickname, updatedAt, scoreConfirmedAt: null 등 (기존 HOST와 동일 구조)
     - `users/{uid}/roundIds/{roundId}` 에 `{ roundId }` set
- **에러**: 라운드 없음, 권한 문제 등은 메시지 정의 후 throw.

---

## 5. 화면/네비게이션

### 5.1 RoundJoinScreen (신규)

- **진입**: 라운드 목록(RoundList)에서 "참여하기" 버튼 등으로 이동.
- **UI**:
  - 4자리 라운드 번호 입력 필드 (숫자만, maxLength 4 등)
  - "검색" 또는 "참여하기" 버튼
  - 조회 전: 버튼만 표시  
  - 조회 후:
    - 없음: "라운드를 찾을 수 없습니다" 메시지
    - 있음: 라운드 정보 카드 (골프장명, 라운드명, 날짜, 티타임 등) + "참여하기" 버튼
  - 이미 참여 중인 라운드면 "이미 참여 중입니다" 표시 + "라운드 보기"로 상세 이동 가능
- **참여 성공 후**:  
  - `navigation.replace('RoundDetail', { roundId })` 또는  
  - `navigation.navigate('RoundList')` 후 사용자가 목록에서 해당 라운드 탭  
  (제품 요구에 따라 선택)

### 5.2 RoundStack 확장

- **라우트**: `RoundJoin: undefined` (또는 `RoundJoin: { roundNumber?: string }` 등)
- **스크린**: `RoundJoinScreen` 추가, 제목 예: "라운드 참여하기"

### 5.3 RoundListScreen 수정

- **참여하기 진입점**:
  - FAB 옆에 "참여하기" 버튼, 또는
  - 상단/빈 목록 안에 "라운드 번호로 참여하기" 링크  
  → `navigation.navigate('RoundJoin')`

---

## 6. 예외/엣지 케이스

| 상황 | 처리 |
|------|------|
| 라운드 번호 4자리 아님 | 입력 검증, "4자리 숫자를 입력하세요" 등 메시지 |
| 해당 번호 라운드 없음 | "라운드를 찾을 수 없습니다" |
| 이미 참여 중인 라운드 | "이미 참여 중입니다" + (선택) 라운드 상세로 이동 |
| 라운드가 FINISHED | 참여 허용 여부 정책에 따라 차단 또는 허용 후 읽기 전용 등 |
| 비로그인 사용자 | 참여하기 진입 시 로그인 유도 (기존 로그인 플로우 활용) |

---

## 7. 구현 순서 제안

1. **roundService**
   - `fetchRoundByRoundNumber(roundNumber: string): Promise<Round | null>`
   - `joinRound(roundId: string, uid: string, nickname: string | null): Promise<void>`
   - (선택) `isParticipant(roundId: string, uid: string): Promise<boolean>` → 참여 여부 확인용
2. **RoundJoinScreen**
   - 번호 입력, 조회, 라운드 정보 표시, 참여하기 버튼, 에러/이미 참여 메시지
3. **RoundStack**
   - `RoundJoin` 라우트 및 `RoundJoinScreen` 등록
4. **RoundListScreen**
   - "참여하기" 버튼/링크 추가 후 `RoundJoin`으로 이동
5. **문서/주석**
   - roundService 상단 주석에 "참여하기(fetchRoundByRoundNumber, joinRound)" 흐름 한 줄씩 추가

---

## 8. Firestore 인덱스

- `rounds` 컬렉션을 `roundNumber` equality로 조회하므로, 단일 필드 쿼리만 사용 시 별도 복합 인덱스는 필요 없을 가능성이 높음.
- 배포 후 콘솔에서 쿼리 실행 시 인덱스 안내가 나오면 그때 복합 인덱스 생성.

---

## 9. 요약

- **참여하기** = 라운드 번호 입력 → 해당 라운드 조회 → `participants`에 MEMBER 추가 + `users/{uid}/roundIds` 등록.
- 기존 **라운드 목록/상세/스코어 등록·확정**은 그대로 사용하고, 참여한 라운드만 목록에 추가되는 구조로 구현하면 됨.
