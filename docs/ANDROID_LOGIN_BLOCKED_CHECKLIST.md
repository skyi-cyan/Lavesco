# 로그인 인증 오류 "… are blocked" 체크리스트

로그인 시 **"Requests from this Android client application com.lavesco.app are blocked"** 가 나올 때, 아래 항목을 **순서대로** 하나씩 확인하세요.

---

## 1. Android 앱이 Firebase 프로젝트에 등록되어 있는지

- [ ] [Firebase Console](https://console.firebase.google.com/) → 프로젝트 **scorecard-app-6f9bd** 선택
- [ ] **프로젝트 설정**(톱니바퀴) → **일반** 탭 → **내 앱**
- [ ] **Android** 앱이 있고, **패키지 이름**이 `com.lavesco.app` 인지 확인  
  - 없으면 **앱 추가** → Android → 패키지 이름 `com.lavesco.app` 입력 후 등록

---

## 2. 지금 빌드에 사용된 SHA-1 확인

- [ ] **지금 앱을 빌드한 PC**에서 아래 실행 (다른 PC에서 빌드했다면 그 PC에서 실행):

  ```powershell
  cd D:\NewProduct\Lavesco\mobile-rn\android
  .\gradlew.bat signingReport
  ```

- [ ] 출력에서 **Variant: debug** (또는 사용 중인 빌드 타입) 찾기
- [ ] **SHA1:** 뒤의 값 **전부 복사** (콜론 포함, 예: `5f:f4:1b:09:69:48:...`)
- [ ] 이 값을 메모장 등에 붙여넣어 두기 → **3번**에서 사용

---

## 3. Firebase에 해당 SHA-1이 등록되어 있는지

- [ ] Firebase Console → **프로젝트 설정** → **일반** → Android 앱 (`com.lavesco.app`) 클릭
- [ ] **SHA 인증서 지문** 섹션으로 스크롤
- [ ] **2번에서 복사한 SHA-1**이 목록에 **있는지** 확인
  - **없으면**: **지문 추가** 클릭 → SHA-1 붙여넣기 → **저장**
  - **있으면**: 4번으로 이동 (그래도 blocked면 4번에서 google-services.json 갱신)

---

## 4. google-services.json이 최신인지

- [ ] Firebase Console → 같은 Android 앱 화면에서 **google-services.json** 다운로드
- [ ] 프로젝트의 `mobile-rn\android\app\google-services.json` 을 **다운로드한 파일로 덮어쓰기**
- [ ] 3번에서 SHA-1을 **방금 추가했다면** 반드시 한 번 더 다운로드해서 덮어쓰기

---

## 5. google-services.json 내용 확인 (선택)

- [ ] `mobile-rn\android\app\google-services.json` 열기
- [ ] `project_info.project_id` 가 `scorecard-app-6f9bd` 인지
- [ ] `client[0].client_info.android_client_info.package_name` 이 `com.lavesco.app` 인지
- [ ] `oauth_client` 에 `client_type: 1` 이 있고, `android_info.certificate_hash` 가 **콜론 없이** SHA-1인지 (예: `5ff41b0969482f3a973f466454fce6f18d2ebf83`)

---

## 6. 클린 빌드 후 재설치

- [ ] 터미널에서:

  ```powershell
  cd D:\NewProduct\Lavesco\mobile-rn\android
  .\gradlew.bat clean
  cd ..
  npx react-native run-android
  ```

- [ ] 빌드가 끝나면 기기에 앱이 설치됨  
  - **기존 앱이 이미 있으면**: 한 번 **삭제**한 뒤 위 명령으로 다시 설치하는 것을 권장

---

## 7. 앱 데이터 삭제 후 재로그인

- [ ] 기기 **설정** → **앱** → **Lavesco** (또는 해당 앱 이름)
- [ ] **저장공간** → **데이터 삭제** (캐시 삭제만 해도 됨)
- [ ] 앱 실행 → **다시 로그인** 시도

---

## 8. (선택) Google Cloud Console에서 API 차단 여부 확인

Firebase에 SHA-1을 넣었는데도 blocked가 계속되면:

- [ ] [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 **scorecard-app-6f9bd** 선택
- [ ] **API 및 서비스** → **사용자 인증 정보**
- [ ] **API 키** 중 Firebase/Android에서 쓰는 키 클릭
- [ ] **애플리케이션 제한** 이 **Android 앱**으로 되어 있다면:
  - [ ] 해당 목록에 **패키지 이름** `com.lavesco.app` 과 **지금 사용 중인 SHA-1**이 포함되어 있는지 확인
  - [ ] 제한을 **없음**으로 두면 (개발 중) blocked 원인이 다른 곳일 수 있으므로, 우선 1~7번 재확인

---

## 요약

| 순서 | 확인 항목 |
|------|-----------|
| 1 | Firebase에 Android 앱(`com.lavesco.app`) 등록 여부 |
| 2 | `.\gradlew.bat signingReport` 로 SHA-1 확인 |
| 3 | Firebase SHA 인증서 지문에 위 SHA-1 추가 |
| 4 | google-services.json 최신으로 다운로드 후 덮어쓰기 |
| 5 | (선택) google-services.json 내용 점검 |
| 6 | 클린 빌드 + 앱 재설치 |
| 7 | 앱 데이터 삭제 후 재로그인 |
| 8 | (필요 시) Google Cloud API 키 제한 확인 |

**가장 흔한 원인**: 2번에서 확인한 SHA-1이 3번 Firebase 목록에 **없는 경우**입니다. 2번과 3번을 꼭 맞춘 뒤 4번으로 google-services.json을 갱신하고 6~7번을 진행하세요.
