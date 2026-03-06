# Android Logcat 확인 방법

앱 동작 문제(예: 프로필 저장 멈춤)를 디버깅할 때 Android Logcat으로 에러·경고 로그를 확인할 수 있습니다.

---

## 1. 준비

- **실기기** 또는 **에뮬레이터**에 앱이 설치되어 실행 중이어야 합니다.
- **USB 디버깅** (실기기): 설정 → 개발자 옵션 → USB 디버깅 켜기 후 PC와 USB 연결.

---

## 2. 방법 A: Android Studio에서 보기

### 2-1. Logcat 열기

1. **Android Studio** 실행
2. 메뉴 **View** → **Tool Windows** → **Logcat**  
   또는 하단 **Logcat** 탭 클릭
3. 상단에서 **디바이스**와 **앱(패키지)** 선택  
   - 디바이스: 연결된 기기 또는 에뮬레이터  
   - 앱: **com.lavesco.app** (Lavesco 앱 패키지명, `mobile-rn/android/app/build.gradle`의 `applicationId`)

### 2-2. 필터로 Firebase / 에러만 보기

- **검색(필터)** 란에 아래 중 하나 입력:
  - `Firebase` — Firebase 관련 로그
  - `Firestore` — Firestore 관련
  - `FirebaseAuth` — 인증 관련
  - `Exception` 또는 `Error` — 예외·에러
  - `ReactNative` — RN 쪽 로그
- **로그 레벨** 드롭다운에서 **Error** 또는 **Warn** 선택 시 에러·경고만 표시

### 2-3. 프로필 저장 시 로그 보기

1. Logcat을 연 상태에서 **Clear** 로 기존 로그 지우기
2. 앱에서 **프로필 수정 → 저장** 실행
3. 저장 버튼 누른 직후 ~ 12초 사이에 새로 찍힌 로그 확인  
   - 빨간색(Error), 주황색(Warn) 줄을 우선 확인

---

## 3. 방법 B: 터미널(adb logcat)에서 보기

Android SDK의 `adb`가 설치되어 있어야 합니다. (Android Studio 설치 시 함께 들어 있음)

### 3-1. 기본 명령

```bash
adb logcat
```

- 연결된 기기 1대만 있으면 해당 기기 로그가 쭉 출력됩니다.
- **Ctrl+C** 로 중지.

### 3-2. 앱(패키지)만 보기

앱 패키지명을 알고 있을 때 (Lavesco: `com.lavesco.app`):

```bash
adb logcat --pid=$(adb shell pidof -s com.lavesco.app)
```

또는 태그로 필터:

```bash
adb logcat -s "ReactNativeJS:*" "FirebaseApp:*" "Firestore:*"
```

### 3-3. Firebase / Firestore / 에러 위주로 보기

```bash
adb logcat | findstr /i "firebase firestore exception error permission"
```

(Windows CMD 기준. PowerShell이면 `findstr` 대신 `Select-String` 사용 가능.)

### 3-4. 실행 순서 예시 (프로필 저장 디버깅)

1. 터미널에서 필터 걸고 대기:
   ```bash
   cd d:\NewProduct\Lavesco
   adb logcat *:E | findstr /i "firebase firestore"
   ```
   - `*:E` = 에러 레벨 로그만
2. 앱에서 **프로필 수정 후 저장** 실행
3. 터미널에 찍히는 에러 메시지 확인

---

## 4. Lavesco(React Native) 앱 패키지명 확인

- 경로: `mobile-rn/android/app/build.gradle`
- Lavesco 앱 패키지명: **com.lavesco.app** (`applicationId` 값)

---

## 5. 확인할 로그 키워드 (프로필 저장 문제 시)

| 키워드 | 의미 |
|--------|------|
| `PERMISSION_DENIED` | Firestore 규칙 거부 |
| `Firestore` | Firestore SDK 동작 |
| `FirebaseAuth` | 인증/토큰 관련 |
| `Exception` / `Error` | 예외·에러 |
| `ReactNativeJS` | JS(React Native) 쪽 로그 (console.log 등) |

---

## 6. 요약

- **가장 쉬운 방법**: Android Studio → **Logcat** 탭 → 디바이스·앱 선택 → **Error** 레벨 + 검색창에 `Firebase` 또는 `Firestore` 입력 후, 앱에서 프로필 저장을 한 다음 새로 찍힌 로그 확인.
- **터미널**: `adb logcat` 실행 후 위 필터로 Firebase/Firestore/에러만 보면서 같은 동작(저장)을 재현해 보면 됩니다.
