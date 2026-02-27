# 라베스코 (Lavesco) 개발 제안서

## 📋 PRD 분석 요약

### 핵심 요구사항
- **플랫폼**: iOS/Android (Flutter) + 관리자 웹 (React/Next.js)
- **백엔드**: Firebase (Auth, Firestore, Functions, FCM, Storage)
- **타겟 사용자**: 아마추어 골퍼 (동반 플레이어)
- **핵심 기능**: 실시간 스코어 공유, 오프라인 지원, 초대 코드 시스템

### 주요 화면 구조
1. **홈 탭**: 대시보드, 빠른 시작, 초대 코드 입력
2. **라운드 탭**: 라운드 생성/참가, 스코어 입력, 스코어보드
3. **코스 탭**: 코스 검색, 홀 정보, 즐겨찾기
4. **내 기록 탭**: 라운드 히스토리, 통계, 프로필

---

## 🏗️ 프로젝트 구조 제안

### 권장 디렉토리 구조

```
Lavesco/
├── mobile/                    # Flutter 앱
│   ├── lib/
│   │   ├── core/             # 핵심 기능
│   │   │   ├── auth/
│   │   │   ├── firebase/
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── features/         # 기능별 모듈
│   │   │   ├── home/
│   │   │   ├── round/
│   │   │   ├── course/
│   │   │   ├── profile/
│   │   │   └── score/
│   │   ├── shared/           # 공통 위젯/유틸
│   │   │   ├── widgets/
│   │   │   ├── theme/
│   │   │   └── constants/
│   │   └── main.dart
│   ├── test/
│   └── pubspec.yaml
│
├── admin-web/                # 관리자 웹 (React/Next.js)
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── firebase/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   └── types/
│   └── package.json
│
├── functions/                # Firebase Cloud Functions
│   ├── src/
│   │   ├── invites/          # 초대 코드 생성/관리
│   │   ├── scores/           # 스코어 집계
│   │   ├── notifications/    # FCM 알림
│   │   └── index.ts
│   └── package.json
│
├── firestore/                # Firestore 보안 규칙/인덱스
│   ├── rules/
│   └── indexes/
│
├── docs/                     # 문서
│   ├── lavesco_prd_v1.1.md
│   └── proposal.md
│
└── README.md
```

---

## 🛠️ 기술 스택 상세 제안

### Mobile (Flutter)

#### 필수 패키지
```yaml
dependencies:
  # Firebase
  firebase_core: ^3.0.0
  firebase_auth: ^5.0.0
  cloud_firestore: ^5.0.0
  firebase_messaging: ^15.0.0
  firebase_storage: ^12.0.0
  firebase_analytics: ^11.0.0
  
  # 인증
  google_sign_in: ^6.0.0
  sign_in_with_apple: ^6.0.0
  
  # 상태 관리 (선택: Provider, Riverpod, Bloc 중)
  flutter_riverpod: ^2.5.0  # 추천: 현대적이고 타입 안전
  
  # 네비게이션
  go_router: ^14.0.0  # 딥링크 처리 용이
  
  # 오프라인 지원
  hive: ^2.2.3  # 로컬 캐시
  hive_flutter: ^1.1.0
  
  # 네트워크
  connectivity_plus: ^6.0.0  # 네트워크 상태 감지
  
  # 유틸리티
  intl: ^0.19.0  # 날짜/시간 포맷
  share_plus: ^9.0.0  # 초대 코드 공유
  url_launcher: ^6.3.0  # 딥링크 처리
  flutter_local_notifications: ^17.0.0  # 로컬 알림
  
  # UI
  flutter_svg: ^2.0.0
  cached_network_image: ^3.3.0
```

#### 상태 관리 선택지
1. **Riverpod** (추천) ✅
   - 타입 안전성 우수
   - 테스트 용이
   - 의존성 주입 내장
   - 오프라인 상태 관리와 잘 어울림

2. **Bloc**
   - 복잡한 비즈니스 로직에 적합
   - 학습 곡선 존재

3. **Provider**
   - 간단하지만 타입 안전성 낮음

### Admin Web (React/Next.js)

#### 필수 패키지
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "firebase": "^10.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "shadcn/ui": "latest",
    "tailwindcss": "^3.4.0"
  }
}
```

### Firebase Functions

#### 필수 패키지
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0"
  }
}
```

---

## 🏛️ 아키텍처 제안

### 1. Clean Architecture 적용 (Flutter)

```
features/
└── round/
    ├── data/
    │   ├── models/          # Firestore 모델
    │   ├── repositories/    # 데이터 소스 (Firestore, 로컬 캐시)
    │   └── datasources/     # 원격/로컬 데이터소스
    ├── domain/
    │   ├── entities/        # 비즈니스 엔티티
    │   ├── repositories/    # 리포지토리 인터페이스
    │   └── usecases/        # 비즈니스 로직
    └── presentation/
        ├── pages/           # 화면
        ├── widgets/         # 위젯
        └── providers/       # Riverpod providers
```

### 2. 오프라인 전략

#### 로컬 캐시 계층
- **Hive** 사용 (NoSQL 로컬 DB)
- 스코어 입력 → 즉시 Hive 저장 → 백그라운드 Firestore 동기화
- 네트워크 복구 시 자동 동기화 큐 처리

#### 동기화 전략
```dart
// 의사코드
class ScoreSyncService {
  // 1. 로컬에 먼저 저장
  Future<void> saveScoreLocally(Score score) async {
    await hiveBox.put(score.id, score);
  }
  
  // 2. 네트워크 상태 확인 후 동기화
  Future<void> syncToFirestore() async {
    if (await isOnline()) {
      final pendingScores = await getPendingScores();
      for (final score in pendingScores) {
        try {
          await firestore.save(score);
          await markAsSynced(score.id);
        } catch (e) {
          // 재시도 큐에 추가
        }
      }
    }
  }
}
```

### 3. 실시간 업데이트 최적화

#### Firestore 구독 전략
- **스코어보드**: `participants` 컬렉션만 구독 (경량)
- **상세 스코어**: 필요 시에만 `scores` 구독
- **디바운싱**: 빠른 연속 입력 시 배치 업데이트

```dart
// participants만 구독하여 비용 절감
final participantsStream = firestore
  .collection('rounds/$roundId/participants')
  .snapshots();
```

### 4. 초대 코드 시스템

#### 보안 고려사항
- ✅ Cloud Functions에서만 코드 생성
- ✅ 6자리 영숫자 (대소문자 구분)
- ✅ 만료 시간 설정 (24시간 권장)
- ✅ 사용 횟수 제한
- ✅ Rate limiting 적용

```typescript
// functions/src/invites/generate.ts
export const generateInviteCode = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', ...);
  
  // Rate limiting 체크
  await checkRateLimit(context.auth.uid);
  
  // 고유 코드 생성
  const code = generateUniqueCode();
  
  // Firestore에 저장
  await admin.firestore().collection('invites').doc(code).set({
    roundId: data.roundId,
    createdBy: context.auth.uid,
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간
    ),
    maxUses: 8,
    useCount: 0,
    active: true
  });
  
  return { code };
});
```

---

## 📱 핵심 기능 구현 제안

### 1. 스코어 입력 UX

#### 제안 사항
- **탭 입력**: +/- 버튼으로 빠른 입력
- **드래그 입력**: 숫자 드래그로 타수 조정
- **홀 그리드**: 1~18홀 전체 타수 한눈에 보기
- **자동 저장**: 입력 즉시 로컬 저장 + 백그라운드 동기화

#### 구현 예시
```dart
class ScoreInputWidget extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final score = ref.watch(scoreProvider);
    
    return Column(
      children: [
        // 홀 정보
        HoleInfo(hole: currentHole),
        
        // 타수 입력 (탭 + 드래그)
        GestureDetector(
          onVerticalDragUpdate: (details) {
            // 드래그로 타수 조정
            updateStrokes(details.delta.dy);
          },
          child: ScoreInputButtons(
            strokes: score.strokes,
            onIncrement: () => ref.read(scoreProvider.notifier).increment(),
            onDecrement: () => ref.read(scoreProvider.notifier).decrement(),
          ),
        ),
        
        // 세부 기록 (선택)
        DetailRecordInput(score: score),
        
        // 홀 그리드
        HoleGrid(
          scores: allHoles,
          onHoleTap: (holeNo) => navigateToHole(holeNo),
        ),
      ],
    );
  }
}
```

### 2. 오프라인 동기화

#### 구현 전략
1. **로컬 우선**: 모든 입력을 먼저 Hive에 저장
2. **백그라운드 동기화**: 네트워크 상태 확인 후 자동 동기화
3. **충돌 해결**: 서버 타임스탬프 기준 최신 데이터 우선

```dart
class OfflineSyncService {
  final Queue<SyncTask> _syncQueue = Queue();
  
  Future<void> saveScore(Score score) async {
    // 1. 로컬 저장
    await _localStorage.save(score);
    
    // 2. 동기화 큐에 추가
    _syncQueue.add(SyncTask(score, SyncType.create));
    
    // 3. 네트워크 상태 확인 후 동기화
    if (await _connectivityService.isOnline) {
      await _processSyncQueue();
    }
  }
  
  Future<void> _processSyncQueue() async {
    while (_syncQueue.isNotEmpty) {
      final task = _syncQueue.removeFirst();
      try {
        await _firestoreService.sync(task);
        await _localStorage.markAsSynced(task.score.id);
      } catch (e) {
        // 실패 시 큐에 다시 추가
        _syncQueue.add(task);
        break;
      }
    }
  }
}
```

### 3. 딥링크 처리

#### 구현 전략
- **Universal Links** (iOS) / **App Links** (Android)
- **Firebase Dynamic Links** 또는 직접 구현
- 앱 미설치 시 스토어 유도 + Defer Deep Link

```dart
// go_router 사용
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/round/:roundId',
      builder: (context, state) {
        final roundId = state.pathParameters['roundId']!;
        return RoundDetailPage(roundId: roundId);
      },
    ),
  ],
  initialLocation: '/',
);

// 딥링크 처리
void handleDeepLink(Uri uri) {
  if (uri.pathSegments.contains('round')) {
    final roundId = uri.pathSegments.last;
    router.go('/round/$roundId');
  }
}
```

---

## 🔒 보안 및 성능 최적화

### 1. Firestore 보안 규칙

#### 제안 규칙 구조
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 코스: 읽기만 허용
    match /courses/{courseId} {
      allow read: if request.auth != null;
      allow write: if hasAdminClaim();
    }
    
    // 라운드: 참가자만 접근
    match /rounds/{roundId} {
      allow read: if isParticipant(roundId);
      allow update: if isHost(roundId) && 
                       request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['status', 'updatedAt']);
      
      // 스코어: 본인만 수정
      match /scores/{uid} {
        allow read: if isParticipant(roundId);
        allow write: if request.auth.uid == uid && 
                        !isFinished(roundId);
      }
      
      // 참가자: 본인/HOST만 수정
      match /participants/{uid} {
        allow read: if isParticipant(roundId);
        allow write: if request.auth.uid == uid || isHost(roundId);
      }
    }
    
    // 초대 코드: Functions만 생성
    match /invites/{code} {
      allow read: if request.auth != null;
      allow write: if false; // Functions만 생성
    }
  }
  
  // 헬퍼 함수
  function isParticipant(roundId) {
    return request.auth != null && 
           exists(/databases/$(database)/documents/rounds/$(roundId)/participants/$(request.auth.uid));
  }
  
  function isHost(roundId) {
    return request.auth != null && 
           get(/databases/$(database)/documents/rounds/$(roundId)).data.hostUid == request.auth.uid;
  }
  
  function isFinished(roundId) {
    return get(/databases/$(database)/documents/rounds/$(roundId)).data.status == 'FINISHED';
  }
  
  function hasAdminClaim() {
    return request.auth.token.admin == true;
  }
}
```

### 2. 성능 최적화

#### 읽기 최적화
- **Denormalization**: `participants`에 집계 데이터 저장
- **인덱스**: 자주 쿼리하는 필드에 복합 인덱스 생성
- **페이지네이션**: 완료 라운드 목록 20건씩 로드

#### 쓰기 최적화
- **배치 쓰기**: 여러 홀 동시 입력 시 배치 처리
- **트랜잭션**: 동시 업데이트 충돌 방지

```dart
// 배치 쓰기 예시
Future<void> saveMultipleHoles(List<Score> scores) async {
  final batch = firestore.batch();
  for (final score in scores) {
    final ref = firestore.collection('rounds/$roundId/scores/$uid');
    batch.set(ref, score.toMap(), SetOptions(merge: true));
  }
  await batch.commit();
}
```

---

## 📊 데이터 모델 개선 제안

### 1. 스코어 집계 최적화

#### 제안: Cloud Functions로 서버 집계
- 클라이언트 조작 방지
- 실시간 집계 보장
- 비용 절감 (읽기 횟수 감소)

```typescript
// functions/src/scores/aggregate.ts
export const onScoreUpdate = functions.firestore
  .document('rounds/{roundId}/scores/{uid}')
  .onWrite(async (change, context) => {
    const roundId = context.params.roundId;
    const uid = context.params.uid;
    
    const scores = change.after.data();
    if (!scores) return;
    
    // 집계 계산
    const { totalOut, totalIn, total, holesEntered } = calculateAggregates(scores.holes);
    
    // participants 문서 업데이트
    await admin.firestore()
      .collection('rounds')
      .doc(roundId)
      .collection('participants')
      .doc(uid)
      .update({
        totalOut,
        totalIn,
        total,
        holesEntered,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  });
```

### 2. 인덱스 설계

#### 필수 인덱스
```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "rounds",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "hostUid", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rounds",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "courses",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "region", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 🚀 개발 단계별 제안

### Phase 1 (MVP) - 8주

#### Week 1-2: 프로젝트 셋업
- [ ] Flutter 프로젝트 초기화
- [ ] Firebase 프로젝트 생성 및 연동
- [ ] 기본 아키텍처 구조 설정
- [ ] 인증 화면 구현 (이메일, Google)

#### Week 3-4: 코스 기능
- [ ] 코스 목록/검색 화면
- [ ] 코스 상세 화면
- [ ] Firestore 코스 데이터 모델
- [ ] 즐겨찾기 기능

#### Week 5-6: 라운드 생성/참가
- [ ] 라운드 생성 플로우 (3단계)
- [ ] 초대 코드 생성 (Cloud Functions)
- [ ] 초대 코드 입력 화면
- [ ] 라운드 목록/상세 화면

#### Week 7-8: 스코어 입력/보드
- [ ] 스코어 입력 화면 (홀별)
- [ ] 스코어보드 화면
- [ ] 실시간 업데이트 (Firestore 구독)
- [ ] 라운드 종료 기능

### Phase 2 - 4주

#### Week 9-10: 오프라인 지원
- [ ] Hive 로컬 캐시 구현
- [ ] 오프라인 스코어 입력
- [ ] 동기화 큐 시스템
- [ ] 네트워크 상태 감지

#### Week 11-12: 알림 및 공유
- [ ] FCM 알림 설정
- [ ] 딥링크 구현
- [ ] 라운드 결과 공유
- [ ] 기본 통계 화면

### Phase 3 - 4주

#### Week 13-14: 고급 기능
- [ ] 친구 목록 초대
- [ ] 결과 이미지 공유
- [ ] 코스 메모/지도
- [ ] 상세 통계

#### Week 15-16: 관리자 웹
- [ ] Next.js 프로젝트 셋업
- [ ] 코스 관리 화면
- [ ] 티셋/홀 데이터 입력
- [ ] 관리자 권한 시스템

---

## ⚠️ 주요 고려사항

### 1. PRD 미결 사항 해결 필요

| 항목 | 제안 |
|------|------|
| 종료 후 수정 시간 | **2시간** 권장 (너무 길면 데이터 무결성 문제) |
| HOST 탈퇴 시 처리 | 자동으로 가장 오래된 참가자에게 권한 이전 |
| 최대 참가자 수 | **8명** (초기), Firestore 문서 크기 고려 |
| 초대 코드 만료 | **24시간** (보안과 편의성 균형) |
| 핸디캡 계산 | Phase 2에서 추가 검토 |
| 다국어 지원 | Phase 3 이후 검토 |
| Apple 로그인 | **필수** (App Store 정책) |

### 2. 기술적 리스크

#### 오프라인 동기화
- **리스크**: 충돌 해결 복잡도
- **대응**: 타임스탬프 기반 최신 우선 정책

#### Firestore 비용
- **리스크**: 실시간 구독으로 읽기 비용 증가
- **대응**: `participants`만 구독, `scores`는 필요 시에만

#### 초대 코드 보안
- **리스크**: 코드 추측/무작위 시도
- **대응**: Rate limiting, 만료 시간, 사용 횟수 제한

### 3. UX 개선 제안

#### 스코어 입력
- **스와이프 제스처**: 좌우 스와이프로 홀 이동
- **음성 입력**: "파 4" 같은 음성 명령 (선택, 2차)
- **자동 계산**: Par 기준 자동 점수 계산

#### 스코어보드
- **애니메이션**: 순위 변경 시 부드러운 애니메이션
- **필터링**: 홀별, 전반/후반 필터
- **비교 모드**: 두 플레이어 비교 보기

---

## 📝 다음 단계

### 즉시 진행 사항
1. ✅ **프로젝트 구조 생성**
2. ✅ **Firebase 프로젝트 생성 및 설정**
3. ✅ **Flutter 프로젝트 초기화**
4. ✅ **기본 인증 화면 구현**

### 검토 필요 사항
1. ⚠️ **상태 관리 라이브러리 선택** (Riverpod 추천)
2. ⚠️ **디자인 시스템 정의** (색상, 타이포그래피, 컴포넌트)
3. ⚠️ **테스트 전략** (Unit, Widget, Integration)
4. ⚠️ **CI/CD 파이프라인** (GitHub Actions 추천)

---

## 🎯 성공 지표 (KPI)

### Phase 1 목표
- 스코어 입력 완료율: > 80%
- 라운드 생성 → 완료 전환율: > 60%
- 앱 크래시율: < 0.1%
- 스코어보드 로드 시간: < 1.5초 (p95)

### Phase 2 목표
- 오프라인 동기화 성공률: > 95%
- 알림 수신률: > 70%
- 사용자 재방문율: > 40%

---

*본 제안서는 PRD v1.1을 기반으로 작성되었습니다. 개발 진행 중 필요에 따라 수정/보완이 필요할 수 있습니다.*
