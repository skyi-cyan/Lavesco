# Functions 없이 개발 가이드

Blaze 플랜 업그레이드 전까지 Functions 없이 개발을 진행하는 방법입니다.

## ⚠️ 중요 사항

### 보안 고려사항

Functions 없이 개발할 때 다음 사항을 주의해야 합니다:

1. **초대 코드 생성**: 클라이언트에서 생성 (보안상 완벽하지 않음)
2. **스코어 집계**: 클라이언트에서 계산 (데이터 무결성 보장 어려움)
3. **Firestore 보안 규칙**: 엄격하게 설정하여 보안 강화

### 임시 조치

이 방법은 **개발 단계**에서만 사용하고, **프로덕션 배포 전**에는 반드시 Functions를 배포해야 합니다.

## 구현 변경 사항

### 1. 초대 코드 생성 (클라이언트)

#### 기존 (Functions 사용)
```typescript
// Functions에서 호출
const result = await functions.httpsCallable('generateInviteCode')({ roundId });
```

#### 변경 (클라이언트 직접 생성)
```dart
// Flutter 앱에서 직접 생성
String generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  final random = Random();
  final code = StringBuffer();
  
  for (int i = 0; i < 6; i++) {
    code.write(chars[random.nextInt(chars.length)]);
  }
  
  return code.toString();
}
```

#### Firestore에 저장
```dart
Future<String> createInviteCode(String roundId) async {
  final code = generateInviteCode();
  
  // Firestore에 직접 저장
  await FirebaseFirestore.instance
    .collection('invites')
    .doc(code)
    .set({
      'roundId': roundId,
      'createdBy': FirebaseAuth.instance.currentUser!.uid,
      'expiresAt': Timestamp.fromDate(
        DateTime.now().add(Duration(hours: 24))
      ),
      'maxUses': 8,
      'useCount': 0,
      'active': true,
      'createdAt': FieldValue.serverTimestamp(),
    });
  
  return code;
}
```

### 2. 스코어 집계 (클라이언트)

#### 기존 (Functions 트리거)
```typescript
// Functions에서 자동 집계
export const aggregateScores = functions.firestore
  .document('rounds/{roundId}/scores/{uid}')
  .onWrite(async (change, context) => {
    // 자동 집계
  });
```

#### 변경 (클라이언트에서 계산)
```dart
// Flutter 앱에서 스코어 저장 시 집계도 함께 업데이트
Future<void> saveScore(String roundId, Map<String, dynamic> holes) async {
  final uid = FirebaseAuth.instance.currentUser!.uid;
  
  // 스코어 저장
  await FirebaseFirestore.instance
    .collection('rounds')
    .doc(roundId)
    .collection('scores')
    .doc(uid)
    .set({
      'holes': holes,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  
  // 집계 계산
  final aggregates = calculateAggregates(holes);
  
  // participants 문서 업데이트
  await FirebaseFirestore.instance
    .collection('rounds')
    .doc(roundId)
    .collection('participants')
    .doc(uid)
    .update({
      'totalOut': aggregates['totalOut'],
      'totalIn': aggregates['totalIn'],
      'total': aggregates['total'],
      'holesEntered': aggregates['holesEntered'],
      'updatedAt': FieldValue.serverTimestamp(),
    });
}

Map<String, int> calculateAggregates(Map<String, dynamic> holes) {
  int totalOut = 0;
  int totalIn = 0;
  int total = 0;
  int holesEntered = 0;
  
  holes.forEach((holeNo, holeData) {
    final holeNum = int.parse(holeNo);
    final strokes = holeData['strokes'] ?? 0;
    
    if (strokes > 0) {
      holesEntered++;
      total += strokes;
      
      if (holeNum <= 9) {
        totalOut += strokes;
      } else {
        totalIn += strokes;
      }
    }
  });
  
  return {
    'totalOut': totalOut,
    'totalIn': totalIn,
    'total': total,
    'holesEntered': holesEntered,
  };
}
```

### 3. Firestore 보안 규칙 조정

초대 코드를 클라이언트에서 생성할 수 있도록 규칙 수정:

```javascript
// invites 컬렉션 규칙 수정
match /invites/{code} {
  // 모든 로그인 사용자 읽기 가능
  allow read: if request.auth != null;
  
  // 인증된 사용자가 자신의 라운드에 대한 초대 코드만 생성 가능
  allow create: if request.auth != null && 
                   request.resource.data.createdBy == request.auth.uid;
  
  // Functions에서만 수정 가능 (useCount 증가 등)
  allow update: if false; // 나중에 Functions 배포 시 활성화
}
```

## 구현 단계

### Step 1: 초대 코드 생성 서비스 구현

`mobile/lib/core/services/invite_service.dart` 파일 생성

### Step 2: 스코어 집계 로직 구현

`mobile/lib/core/services/score_service.dart` 파일에 집계 로직 추가

### Step 3: Firestore 보안 규칙 업데이트

`firestore/rules/firestore.rules` 파일 수정

## 장단점 비교

### Functions 사용 (권장)

✅ **장점**:
- 보안 강화 (클라이언트 조작 불가)
- 데이터 무결성 보장
- 서버에서 일관된 로직 실행
- Rate limiting 가능

❌ **단점**:
- Blaze 플랜 필요
- 배포 복잡도 증가

### 클라이언트 처리 (임시)

✅ **장점**:
- 즉시 개발 시작 가능
- 추가 비용 없음
- 배포 간단

❌ **단점**:
- 보안 취약점 (클라이언트 조작 가능)
- 데이터 무결성 보장 어려움
- 중복 코드 발생 가능

## 마이그레이션 계획

나중에 Functions를 배포할 때:

1. **초대 코드 생성**: Functions로 이동
2. **스코어 집계**: Functions 트리거로 자동화
3. **보안 규칙**: Functions만 쓰기 허용으로 변경
4. **클라이언트 코드**: Functions 호출로 변경

## 다음 단계

1. ✅ 초대 코드 생성 서비스 구현
2. ✅ 스코어 집계 로직 구현
3. ✅ Firestore 보안 규칙 업데이트
4. ✅ 앱 개발 시작

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-01-26
