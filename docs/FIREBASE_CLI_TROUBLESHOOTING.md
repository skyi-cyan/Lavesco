# Firebase CLI 설정 문제 해결 가이드

## 현재 상태

✅ **Firebase CLI 설치됨**: v15.8.0  
❌ **Firebase 로그인 필요**: 인증되지 않음  
✅ **프로젝트 설정**: `.firebaserc` 파일에 프로젝트 ID 설정됨 (`scorecard-app-6f9bd`)

## 문제 해결 단계

### 1단계: Firebase 로그인

Firebase CLI에 로그인해야 합니다.

#### 방법 1: 일반 로그인 (권장)

PowerShell 또는 명령 프롬프트에서:

```bash
firebase login
```

이 명령어를 실행하면:
1. 브라우저가 자동으로 열립니다
2. Google 계정으로 로그인
3. Firebase CLI에 권한 부여 확인
4. 로그인 완료

#### 방법 2: 로그인 확인

로그인 상태 확인:

```bash
firebase login:list
```

현재 로그인된 계정이 표시됩니다.

### 2단계: 프로젝트 연결 확인

프로젝트가 올바르게 연결되었는지 확인:

```bash
firebase use
```

현재 사용 중인 프로젝트가 표시됩니다.

프로젝트 목록 확인:

```bash
firebase projects:list
```

### 3단계: 프로젝트 변경 (필요한 경우)

`.firebaserc` 파일에 설정된 프로젝트가 실제 Firebase 프로젝트와 다를 수 있습니다.

현재 설정:
```json
{
  "projects": {
    "default": "scorecard-app-6f9bd"
  }
}
```

프로젝트 변경:

```bash
firebase use --add
```

또는 특정 프로젝트로 직접 설정:

```bash
firebase use your-project-id
```

### 4단계: 설정 검증

모든 설정이 올바른지 확인:

```bash
# 로그인 상태 확인
firebase login:list

# 현재 프로젝트 확인
firebase use

# 프로젝트 정보 확인
firebase projects:list
```

## 일반적인 문제 해결

### 문제 1: "Failed to authenticate" 오류

**원인**: Firebase CLI에 로그인하지 않음

**해결**:
```bash
firebase login
```

### 문제 2: "Project not found" 오류

**원인**: 프로젝트 ID가 잘못되었거나 접근 권한 없음

**해결**:
1. Firebase Console에서 프로젝트 ID 확인
2. `.firebaserc` 파일의 프로젝트 ID 확인
3. 프로젝트 변경:
   ```bash
   firebase use your-correct-project-id
   ```

### 문제 3: 로그인은 되었지만 프로젝트를 찾을 수 없음

**원인**: 다른 Google 계정으로 로그인했거나 프로젝트 접근 권한 없음

**해결**:
1. 로그아웃:
   ```bash
   firebase logout
   ```
2. 올바른 계정으로 다시 로그인:
   ```bash
   firebase login
   ```

### 문제 4: "Permission denied" 오류

**원인**: 프로젝트에 대한 권한이 없음

**해결**:
1. Firebase Console에서 프로젝트 소유자에게 권한 요청
2. 또는 프로젝트 소유자 계정으로 로그인

## 단계별 설정 가이드

### 전체 설정 프로세스

1. **Firebase CLI 로그인**
   ```bash
   firebase login
   ```

2. **프로젝트 목록 확인**
   ```bash
   firebase projects:list
   ```

3. **프로젝트 선택**
   ```bash
   firebase use your-project-id
   ```
   
   또는 `.firebaserc` 파일 수정:
   ```json
   {
     "projects": {
       "default": "your-project-id"
     }
   }
   ```

4. **설정 확인**
   ```bash
   firebase use
   ```

5. **Firestore 규칙 배포 테스트**
   ```bash
   firebase deploy --only firestore:rules --dry-run
   ```

## 빠른 설정 스크립트

다음 명령어를 순서대로 실행하세요:

```bash
# 1. 로그인
firebase login

# 2. 프로젝트 확인
firebase projects:list

# 3. 프로젝트 설정 (프로젝트 ID를 실제 값으로 변경)
firebase use your-project-id

# 4. 설정 확인
firebase use

# 5. Firestore 규칙 배포 테스트
firebase deploy --only firestore:rules --dry-run
```

## 다음 단계

Firebase CLI 설정이 완료되면:

1. ✅ Firestore 보안 규칙 배포
2. ✅ Firestore 인덱스 배포
3. ✅ Firebase Functions 배포
4. ✅ 모바일 앱 (React Native) Firebase 설정 — [mobile-rn/README.md](../mobile-rn/README.md)

## 참고 자료

- [Firebase CLI 공식 문서](https://firebase.google.com/docs/cli)
- [Firebase CLI 설치 가이드](https://firebase.google.com/docs/cli#install_the_firebase_cli)
- [Firebase 프로젝트 관리](https://firebase.google.com/docs/cli#project_aliases)

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-01-26
