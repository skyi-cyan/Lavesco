# Firebase 설정 순서 가이드

Firebase 프로젝트 설정 시 올바른 순서를 안내합니다.

## 📋 설정 순서 요약

### ✅ 먼저 해야 할 것 (필수)

1. **Firebase 프로젝트 생성** (Firebase Console)
   - Firebase Console에서 프로젝트 생성
   - 프로젝트 ID 확인

2. **Firebase CLI 로그인**
   ```bash
   firebase login
   ```

3. **프로젝트 연결**
   ```bash
   firebase use your-project-id
   ```

4. **Firebase 서비스 활성화** (Firebase Console)
   - Authentication
   - Firestore Database
   - Storage
   - Functions
   - Cloud Messaging

5. **Firestore 규칙 및 인덱스 배포** (Firebase CLI)
   ```bash
   firebase deploy --only firestore
   ```

### ⏳ 나중에 해도 되는 것 (앱 개발 시)

6. **앱 등록** (Firebase Console)
   - Android 앱 등록
   - iOS 앱 등록
   - Web 앱 등록

7. **앱별 Firebase 설정 파일 추가**
   - `google-services.json` (Android)
   - `GoogleService-Info.plist` (iOS)
   - 환경 변수 (Web)

8. **모바일 앱 Firebase 설정 (React Native)**  
   Firebase Console에서 Android/iOS 앱 등록 후 `google-services.json`, `GoogleService-Info.plist`를 `mobile-rn`에 추가. 자세한 방법은 [mobile-rn/README.md](../mobile-rn/README.md) 참고.

## 🎯 답변: 앱을 먼저 설치해야 하나요?

### ❌ 아니요, 앱 등록은 나중에 해도 됩니다!

**Firebase CLI를 사용하기 위해서는:**
- ✅ Firebase 프로젝트만 있으면 됩니다
- ✅ Firebase CLI 로그인만 하면 됩니다
- ❌ 앱 등록은 필수가 아닙니다

### 언제 앱을 등록해야 하나요?

앱 등록은 **실제로 앱을 개발하고 Firebase를 사용할 때** 필요합니다:

1. **Firestore 규칙 배포**: 앱 등록 없이 가능 ✅
2. **Functions 배포**: 앱 등록 없이 가능 ✅
3. **모바일 앱(React Native)에서 Firebase 사용**: 앱 등록 필요 ⚠️
4. **관리자 웹에서 Firebase 사용**: 앱 등록 필요 ⚠️

## 📝 권장 설정 순서

### Phase 1: Firebase 프로젝트 기본 설정 (지금 할 수 있음)

```
1. Firebase 프로젝트 생성
   ↓
2. Firebase CLI 로그인
   ↓
3. 프로젝트 연결
   ↓
4. Firebase 서비스 활성화
   ↓
5. Firestore 규칙/인덱스 배포
   ↓
6. Functions 배포 (선택)
```

### Phase 2: 앱별 설정 (앱 개발 시작할 때)

```
7. Android 앱 등록
   ↓
8. iOS 앱 등록
   ↓
9. Web 앱 등록
   ↓
10. 모바일 앱 Firebase 설정 파일 추가
    ↓
11. 앱 개발 시작
```

## 🔍 현재 상태 확인

### 지금 할 수 있는 것

1. **Firebase CLI 로그인**
   ```bash
   firebase login
   ```

2. **프로젝트 목록 확인**
   ```bash
   firebase projects:list
   ```

3. **프로젝트 연결**
   ```bash
   firebase use your-project-id
   ```

4. **Firestore 규칙 배포**
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Firestore 인덱스 배포**
   ```bash
   firebase deploy --only firestore:indexes
   ```

### 나중에 할 것

- 앱 등록 (Android, iOS, Web)
- Firebase 설정 파일 추가
- 모바일 앱(mobile-rn) Firebase 설정

## 💡 실용적인 접근

### 옵션 1: 지금 Firebase CLI 설정 (권장)

Firebase CLI를 먼저 설정하고 Firestore 규칙을 배포하면:
- 프로젝트 구조를 먼저 확립할 수 있습니다
- 나중에 앱을 등록할 때 이미 규칙이 적용되어 있습니다

```bash
# 1. 로그인
firebase login

# 2. 프로젝트 연결
firebase use your-project-id

# 3. Firestore 규칙 배포
firebase deploy --only firestore
```

### 옵션 2: 앱 등록 후 설정

앱을 먼저 등록하고 설정 파일을 받은 후:
- 모바일 앱(mobile-rn) Firebase 설정을 한 번에 할 수 있습니다
- 설정 파일이 바로 준비됩니다

## 🎯 결론

**Firebase CLI를 사용하려면 앱 등록이 필요하지 않습니다.**

다음 순서로 진행하세요:

1. ✅ **Firebase 프로젝트 생성** (이미 되어 있음: `scorecard-app-6f9bd`)
2. ✅ **Firebase CLI 로그인** (`firebase login`)
3. ✅ **프로젝트 연결** (`firebase use scorecard-app-6f9bd`)
4. ✅ **Firestore 규칙 배포** (앱 등록 없이 가능)
5. ⏳ **앱 등록** (나중에 앱 개발 시작할 때)

## 다음 단계

Firebase CLI 로그인부터 시작하세요:

```bash
firebase login
```

로그인 후 프로젝트를 연결하고 Firestore 규칙을 배포할 수 있습니다.

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-01-26
