# Firebase Functions 배포 가이드

## 현재 상태

❌ **배포 실패**: Blaze 플랜 필요

### 오류 메시지

```
Error: Your project scorecard-app-6f9bd must be on the Blaze (pay-as-you-go) plan to complete this command.
```

## 해결 방법

### 옵션 1: Blaze 플랜으로 업그레이드 (권장)

Firebase Functions를 사용하려면 Blaze 플랜이 필요합니다.

#### Blaze 플랜 특징

- ✅ **무료 할당량 제공**: 매월 무료 사용량 포함
- ✅ **종량제**: 사용한 만큼만 과금
- ✅ **모든 기능 사용 가능**: Functions, Storage, 호스팅 등

#### 무료 할당량 (매월)

- **Cloud Functions 호출**: 2백만 회
- **Cloud Functions GB-초**: 400,000
- **Cloud Functions GB-시간**: 360,000
- **아웃바운드 네트워킹**: 5GB

**참고**: 대부분의 소규모 앱은 무료 할당량 내에서 충분히 운영 가능합니다.

#### 업그레이드 방법

1. **업그레이드 페이지 접속**
   - https://console.firebase.google.com/project/scorecard-app-6f9bd/usage/details
   - 또는 Firebase Console > 프로젝트 설정 > 사용량 및 결제

2. **Blaze 플랜 선택**
   - "업그레이드" 버튼 클릭
   - 결제 정보 입력 (신용카드 등)
   - 업그레이드 완료

3. **배포 재시도**
   ```bash
   firebase deploy --only functions
   ```

### 옵션 2: Functions 없이 개발 (임시)

Functions 없이도 앱 개발을 시작할 수 있습니다:

1. **초대 코드 생성**: 클라이언트에서 임시로 처리 (보안상 권장하지 않음)
2. **스코어 집계**: 클라이언트에서 계산 (서버 집계보다 덜 안전)

**⚠️ 주의**: 프로덕션 환경에서는 반드시 Functions를 사용하는 것을 권장합니다.

### 옵션 3: 다른 Firebase 프로젝트 사용

이미 Blaze 플랜이 활성화된 다른 Firebase 프로젝트가 있다면:

```bash
firebase use other-project-id
firebase deploy --only functions
```

## Functions 배포 준비 상태

### ✅ 완료된 작업

- [x] Functions 코드 작성
- [x] TypeScript 설정
- [x] 의존성 설치
- [x] 빌드 성공

### ⏳ 대기 중인 작업

- [ ] Blaze 플랜 업그레이드
- [ ] Functions 배포

## 배포할 Functions 목록

### 1. generateInviteCode

**타입**: Callable Function (HTTPS)  
**용도**: 초대 코드 생성  
**보안**: 인증 필요

```typescript
export const generateInviteCode = functions.https.onCall(async (data, context) => {
  // 초대 코드 생성 로직
});
```

### 2. aggregateScores

**타입**: Firestore Trigger (onWrite)  
**용도**: 스코어 집계 자동 계산  
**트리거**: `rounds/{roundId}/scores/{uid}` 문서 변경 시

```typescript
export const aggregateScores = functions.firestore
  .document('rounds/{roundId}/scores/{uid}')
  .onWrite(async (change, context) => {
    // 스코어 집계 로직
  });
```

## 업그레이드 후 배포 명령어

Blaze 플랜으로 업그레이드한 후:

```bash
# 프로젝트 루트에서
cd D:\NewProduct\Lavesco

# Functions 배포
firebase deploy --only functions

# 또는 특정 함수만 배포
firebase deploy --only functions:generateInviteCode
firebase deploy --only functions:aggregateScores
```

## 비용 예상

### 무료 할당량 내 사용 시나리오

**예시**: 일일 100명 사용자, 라운드당 평균 10회 Functions 호출

- **일일 호출**: 100명 × 10회 = 1,000회
- **월간 호출**: 1,000회 × 30일 = 30,000회
- **무료 할당량**: 2,000,000회

**결론**: 무료 할당량 내에서 충분히 운영 가능 ✅

### 과금 발생 시나리오

무료 할당량을 초과하면:

- **추가 호출**: $0.40 / 1백만 회
- **추가 GB-초**: $0.0000025 / GB-초
- **네트워킹**: $0.12 / GB

**참고**: 소규모 앱은 거의 과금되지 않습니다.

## 다음 단계

### Blaze 플랜 업그레이드 후

1. ✅ Functions 배포
2. ✅ Functions 테스트
3. ✅ 앱 개발 계속 진행

### Functions 없이 진행 (임시)

1. ⚠️ 클라이언트에서 초대 코드 생성 (임시)
2. ⚠️ 클라이언트에서 스코어 집계 (임시)
3. ✅ 나중에 Blaze 플랜 업그레이드 후 Functions 배포

## 참고 자료

- [Firebase 가격 정책](https://firebase.google.com/pricing)
- [Cloud Functions 가격](https://cloud.google.com/functions/pricing)
- [Firebase Functions 문서](https://firebase.google.com/docs/functions)

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-01-26
