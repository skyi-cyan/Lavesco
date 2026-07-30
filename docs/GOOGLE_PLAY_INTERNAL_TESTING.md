# Google Play 내부 테스트 배포 가이드 (Lavesco)

라베스코 Android 앱(`com.lavesco.app`)을 **Google Play Console 내부 테스트** 트랙에 올리기 위한 절차입니다.

---

## 사전 준비 체크리스트

| 항목 | 상태 |
|------|------|
| Google Play Console 개발자 계정 (등록비 결제) | 팀에서 확인 |
| Firebase Android 앱 `com.lavesco.app` | Firebase Console |
| `android/app/google-services.json` | 로컬에 배치 (Git 제외) |
| JDK 17+ (`keytool`, `java` 명령) | PC에 설치 |
| Android SDK / `ANDROID_HOME` | Android Studio |

---

## 1. 업로드 키스토어 생성 (최초 1회)

```powershell
cd D:\NewProduct\Lavesco\mobile-rn
powershell -ExecutionPolicy Bypass -File .\scripts\generate-release-keystore.ps1
```

생성되는 파일:

- `android/app/lavesco-upload.keystore` — **절대 Git에 커밋하지 마세요**
- `android/keystore.properties` — 비밀번호 입력 후 저장 (Git 제외)

`keystore.properties` 예시:

```properties
storeFile=lavesco-upload.keystore
storePassword=실제_비밀번호
keyAlias=lavesco-upload
keyPassword=실제_비밀번호
```

> 키스토어 파일과 비밀번호는 **안전한 곳에 백업**하세요. 분실 시 동일 키로 앱 업데이트가 불가능합니다.

---

## 2. Firebase / Google 로그인 (릴리스 빌드)

릴리스 키스토어의 **SHA-1**을 Firebase에 등록해야 Google 로그인이 동작합니다.

```powershell
keytool -list -v -keystore android\app\lavesco-upload.keystore -alias lavesco-upload
```

1. [Firebase Console](https://console.firebase.google.com/) → 프로젝트 설정 → Android 앱 (`com.lavesco.app`)
2. **SHA 인증서 지문**에 위 **SHA-1** 추가
3. 필요 시 `google-services.json` 다시 다운로드 → `android/app/`에 덮어쓰기

---

## 3. 릴리스 AAB 빌드

```powershell
cd D:\NewProduct\Lavesco\mobile-rn
npm run android:bundle:release
```

또는:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-play-aab.ps1
```

성공 시 산출물:

```
mobile-rn/dist/lavesco-1.0.1-internal.aab
```

### 버전 올리기 (재업로드 시)

`android/app/build.gradle`에서:

- `versionCode` — **매 업로드마다 1씩 증가** (필수)
- `versionName` — 사용자에게 보이는 버전 (예: `1.0.1`)

`dist/lavesco-*.aab` 파일명은 스크립트에서 필요 시 수정하세요.

---

## 4. Google Play Console 설정

### 4.1 앱 생성 (최초 1회)

1. [Google Play Console](https://play.google.com/console) 로그인
2. **앱 만들기** → 이름: **라베스코**
3. 기본 설정에서 **패키지명**이 빌드와 일치하는지 확인: `com.lavesco.app`

### 4.2 스토어 등록정보 (내부 테스트에도 일부 필수)

| 항목 | 권장 내용 |
|------|-----------|
| 앱 이름 | 라베스코 |
| 짧은 설명 | 골프 라운드 스코어 공유 및 코스 관리 |
| 전체 설명 | `docs/user-manual.md` 기반 요약 |
| 앱 아이콘 | 512×512 PNG |
| 스크린샷 | 폰 2장 이상 (로그인, 홈, 라운드 등) |
| 개인정보처리방침 URL | **필수** — 팀에서 호스팅할 URL 준비 |
| 카테고리 | 스포츠 |
| 문의 이메일 | 팀 이메일 |

### 4.3 데이터 안전 / 콘텐츠 등급

- **데이터 안전**: 이메일, 위치(GPS 거리기록), Firebase 인증 등 실제 수집 항목에 맞게 작성
- **콘텐츠 등급**: IARC 설문 완료
- **광고**: 없음 (해당 시)

### 4.4 내부 테스트 트랙

1. **테스트 및 출시** → **내부 테스트**
2. **새 버전 만들기**
3. **App Bundle 업로드** → `dist/lavesco-1.0.1-internal.aab`
4. 출시 노트 작성 (예: `내부 테스트 1.0.0 — 초기 빌드`)
5. **검토 후 출시** (내부 테스트는 보통 즉시 테스터에게 제공)

### 4.5 테스터 추가

1. **내부 테스트** → **테스터** 탭
2. **이메일 목록** 생성 (예: `lavesco-internal-testers`)
3. Google 계정 이메일 추가 (최대 100명)
4. **테스트 참여 링크**를 테스터에게 공유

테스터는 링크로 Play 스토어에서 앱을 설치합니다.

---

## 5. 내부 테스트 시 확인할 기능

- [ ] 이메일 로그인 / 회원가입
- [ ] Google 로그인 (SHA-1 등록 후)
- [ ] 라운드 생성·참여·스코어 입력
- [ ] 코스 목록·상세
- [ ] 거리기록 (GPS 권한)
- [ ] 프로필·로그아웃

### 심사용 데모 계정 (선택)

Firebase에 테스트 계정을 만들어 두고, 테스터에게 공유:

```
이메일: (팀에서 생성)
비밀번호: (팀에서 생성)
```

---

## 6. 자주 발생하는 오류

| 오류 | 해결 |
|------|------|
| `Release keystore not configured` | `keystore.properties` 생성 및 비밀번호 입력 |
| `google-services.json` 없음 | Firebase에서 다운로드 후 `android/app/`에 배치 |
| Google 로그인 실패 (릴리스만) | 업로드 키 SHA-1을 Firebase에 추가 |
| `versionCode` 중복 | `build.gradle`에서 `versionCode` 증가 후 재빌드 |
| Play 업로드 거부 (서명) | debug 키가 아닌 upload keystore로 서명했는지 확인 |

---

## 7. 파일 요약

| 파일 | 용도 |
|------|------|
| `android/keystore.properties.example` | 서명 설정 템플릿 |
| `android/keystore.properties` | 실제 비밀번호 (Git 제외) |
| `android/app/lavesco-upload.keystore` | 업로드 키 (Git 제외) |
| `android/app/google-services.json` | Firebase (Git 제외) |
| `scripts/generate-release-keystore.ps1` | 키스토어 생성 |
| `scripts/build-play-aab.ps1` | AAB 빌드 |
| `dist/lavesco-*.aab` | Play Console 업로드 파일 |

---

## 8. 빠른 명령 요약

```powershell
# 1) 키스토어 (최초 1회)
cd D:\NewProduct\Lavesco\mobile-rn
powershell -ExecutionPolicy Bypass -File .\scripts\generate-release-keystore.ps1
# keystore.properties 비밀번호 수정

# 2) google-services.json 배치
# android\app\google-services.json

# 3) SHA-1 Firebase 등록
keytool -list -v -keystore android\app\lavesco-upload.keystore -alias lavesco-upload

# 4) AAB 빌드
npm run android:bundle:release

# 5) Play Console → 내부 테스트 → dist\lavesco-1.0.1-internal.aab 업로드
```

---

*앱 패키지: `com.lavesco.app` | 표시 이름: 라베스코 | 현재 버전: 1.0.1 (versionCode 2)*
