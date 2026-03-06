# Android: Auth 토큰 실패 / UNAUTHENTICATED 에러 대응

Logcat에 아래와 같은 메시지가 나오는 경우입니다.

- `Failed to get auth token: FirebaseException: An internal error has occurred.`
- `[WriteStream]: Stream closed with status: UNAUTHENTICATED`
- `getIdToken:onComplete:failure`
- `Requests from this Android client application com...`

---

## 의미

- **Firestore 쓰기**가 **UNAUTHENTICATED**로 거부됩니다.
- Firebase가 이 Android 앱에 **인증 토큰을 발급하지 않아서**, Firestore 요청에 유효한 토큰이 붙지 않는 상태입니다.
- 규칙에서 `request.auth != null` 이므로, 토큰이 없으면 쓰기가 항상 거부됩니다.

**코드만으로는 해결되지 않습니다.** Firebase Console에서 **Android 앱에 SHA-1을 등록**해야 합니다.

---

## 해결 방법: SHA-1 등록 (필수)

### 1단계: 디버그 SHA-1 확인

**Windows (PowerShell 또는 CMD):**

```bash
cd d:\NewProduct\Lavesco\mobile-rn\android
gradlew.bat signingReport
```

**Mac/Linux:**

```bash
cd mobile-rn/android
./gradlew signingReport
```

- 출력에서 **Variant: debug** / **Config: debug** 항목을 찾습니다.
- **SHA1:** 뒤에 나오는 값(예: `A1:B2:C3:...`)을 **전부 복사**합니다. 콜론(`:`) 포함.

### 2단계: Firebase Console에 SHA-1 추가

1. [Firebase Console](https://console.firebase.google.com/) 접속 → 프로젝트 **scorecard-app-6f9bd** 선택
2. 왼쪽 아래 **프로젝트 설정**(톱니바퀴) → **일반** 탭
3. **내 앱** 목록에서 **Android** 앱 (`com.lavesco.app`) 클릭
4. **SHA 인증서 지문** 섹션으로 내려감
5. **지문 추가** → 1단계에서 복사한 **SHA-1** 붙여넣기 → 저장

### 3단계: 앱 다시 실행

- SHA-1 저장 후 **앱 완전 종료** 후 다시 실행하거나, 기기에서 앱 **재설치** 후 로그인 → 프로필 저장 다시 시도

---

## 참고

- **디버그 빌드**로 실행 중이면 **디버그 SHA-1**만 등록해도 됩니다.
- **릴리스 빌드**(서명된 APK/AAB)로 배포할 때는 **릴리스 키의 SHA-1**도 Firebase에 추가해야 합니다. (`signingReport` 출력의 `release` 항목)
- `google-services.json`은 이미 `com.lavesco.app` / 현재 프로젝트로 되어 있으면 그대로 두면 됩니다. SHA-1만 추가하면 됩니다.

---

## 정리

| 로그 메시지 | 의미 | 조치 |
|------------|------|------|
| Failed to get auth token | 이 앱에 토큰 발급 실패 | Firebase에 SHA-1 등록 |
| UNAUTHENTICATED | 토큰 없이 요청 → 규칙 거부 | 위와 동일 |
| X-Firebase-Locale null | 로케일 헤더 경고 | 무시 가능 |

**SHA-1을 등록한 뒤 앱을 다시 실행하면**, Firestore 쓰기(프로필 저장 등)가 정상 동작해야 합니다.

---

## 로그인 시 "Requests from this Android client application ... are blocked"

로그인할 때 위와 같은 **blocked** 메시지가 나오면, **지금 앱을 빌드한 기기/PC의 SHA-1**이 Firebase에 없어서 Google이 해당 앱의 요청을 막는 상태입니다.

### 원인

- **다른 PC에서 빌드**한 경우 → 그 PC의 `debug.keystore` SHA-1이 Firebase에 없음
- **에뮬레이터 vs 실기기**, **디버그 vs 릴리스** 등 **서로 다른 키**로 빌드한 경우 → 사용 중인 키의 SHA-1이 Firebase에 없음

### 해결 순서

1. **지금 앱을 빌드하는 환경**에서 SHA-1 확인:
   ```powershell
   cd D:\NewProduct\Lavesco\mobile-rn\android
   .\gradlew.bat signingReport
   ```
   - **실기기 디버그**로 실행 중이면 **Variant: debug** 의 **SHA1** 값을 복사 (콜론 포함, 예: `AA:BB:CC:...`).

2. **Firebase Console** → 프로젝트 설정 → Android 앱 (`com.lavesco.app`) → **SHA 인증서 지문**  
   - 1번에서 복사한 값이 **목록에 없으면** → **지문 추가**로 그 SHA-1을 추가 후 저장.

3. **google-services.json 다시 받기**  
   - Firebase Console → 같은 Android 앱 화면에서 **google-services.json** 다운로드  
   - `mobile-rn/android/app/google-services.json` 을 **덮어쓰기**.

4. **클린 빌드 후 재설치**  
   ```powershell
   cd D:\NewProduct\Lavesco\mobile-rn\android
   .\gradlew.bat clean
   cd ..
   npx react-native run-android
   ```

5. 앱 **완전 종료** 후 다시 실행하거나, 기기에서 **앱 삭제 후 재설치**한 뒤 로그인 재시도.

### 여러 PC에서 개발할 때

- **각 PC의 debug.keystore**는 서로 다릅니다.
- Firebase에는 **SHA-1을 여러 개** 등록할 수 있으므로, **사용하는 PC마다** `signingReport`로 나온 SHA-1을 모두 **지문 추가**로 등록한 뒤, **google-services.json을 한 번 더 받아** 프로젝트에 넣으면 됩니다.
