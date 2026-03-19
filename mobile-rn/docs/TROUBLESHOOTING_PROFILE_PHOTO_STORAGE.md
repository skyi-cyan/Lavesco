# 프로필 사진 업로드(Firebase Storage) 문제 점검

앱에서 `storage/object-not-found` 또는 「스토리지에 파일이 생성되지 않았습니다」가 반복될 때 아래를 **순서대로** 확인하세요.

## 1. Firebase 콘솔 — Storage 자체

- [ ] **빌드 → Storage** 메뉴에서 **한 번이라도 “시작하기”** 를 눌러 버킷이 생성되었는지  
  (미생성이면 업로드/URL 조회가 실패할 수 있음)
- [ ] **Storage → 파일** 탭에서, 앱으로 업로드 시도 직후 `users/{사용자UID}/` 아래에 객체가 생기는지  
  - **파일이 전혀 없음** → 업로드 단계 실패(규칙·인증·네트워크·네이티브 링크)
  - **파일은 있는데 앱만 실패** → 다운로드 URL/클라이언트 쪽(재시도·캐시)

## 2. Storage 보안 규칙 배포

- [ ] 저장소 규칙이 **콘솔에 배포된 내용**과 로컬 `storage.rules`가 일치하는지  
- [ ] CLI 배포: 프로젝트 루트에서  
  `firebase deploy --only storage`  
  (배포 안 된 오래된 규칙이면 `write` 거부 → 클라이언트 증상은 코드·SDK에 따라 다르게 보일 수 있음)

현재 저장소 규칙 요지(레포 기준):

- 경로: `users/{userId}/...`
- **쓰기**: `request.auth.uid == userId`
- **읽기**: 로그인 사용자

→ 앱에서 사용하는 `user.uid`와 **경로의 `userId`가 동일한지** 반드시 확인 (대소문자·다른 앱의 UID 혼용 없음).

## 3. 인증(Auth)과 Storage 연동

- [ ] 사진 변경 시점에 **`getAuth().currentUser`가 null이 아닌지** (익명/이메일/소셜 모두 OK)
- [ ] **로그아웃 후 재로그인** 한 번 시도 (토큰·세션 꼬임 배제)
- [ ] Firebase 콘솔 **Authentication**에 해당 사용자가 존재하는지

## 4. Android 네이티브 설정

- [ ] `android/app/google-services.json`의  
  - `project_id` / `storage_bucket`  
  - `package_name` (`com.lavesco.app`)  
  가 실제 빌드의 `applicationId`와 **일치**하는지
- [ ] **디버그/릴리스 서명이 다르면** 콘솔에 SHA-1이 맞게 등록돼 있는지 (주로 Google 로그인용이지만, 프로젝트 혼동 방지에도 유용)
- [ ] `@react-native-firebase/storage` 추가/업데이트 후  
  `cd android && ./gradlew clean` 후 **전체 재빌드**

## 5. iOS (해당 시)

- [ ] 레포에 `GoogleService-Info.plist`가 없으면 **iOS 빌드는 다른 프로젝트/구버전 plist**를 쓸 수 있음  
  → Xcode에 넣은 plist의 `STORAGE_BUCKET` / `PROJECT_ID`가 Android와 **같은 Firebase 프로젝트**인지 확인

## 6. 네트워크·환경

- [ ] 기기에서 VPN/사내 Wi-Fi/필터가 **`firebasestorage.googleapis.com` / Google Storage** 를 막지 않는지
- [ ] 개발 중 **Storage 에뮬레이터**(`useEmulator`)를 켠 적이 있다면, 프로덕션 빌드에서 꺼져 있는지

## 7. Metro / JS 번들

- [ ] `index.js`에 `import '@react-native-firebase/storage';`가 있어 Storage 모듈이 앱 시작 시 로드되는지
- [ ] 캐시 꼬임 시: `npx react-native start --reset-cache` 후 다시 설치·실행

## 8. Uncaught (in promise) / LogBox 숫자

- [ ] 같은 동작에서 **여러 번 재시도**하면 LogBox 카운트가 올라갈 수 있음  
- [ ] Metro 로그에 `[profileService] upload attempt failed`와 함께 찍히는 **code / message**를 기록해 두면 원인 특정에 도움됨

## 9. 빠른 콘솔 테스트 (규칙·경로 검증)

Firebase 콘솔 **Storage 규칙 시뮬레이터**에서:

- 인증된 사용자로 `users/{해당_UID}/test.txt` **write** 시뮬레이션이 허용되는지 확인

---

문제가 계속되면 **다음 3가지**를 이슈/채팅에 붙이면 분석이 빨라집니다.

1. Metro 전체 로그 중 `[profileService]` 줄  
2. Firebase 콘솔 Storage **파일 목록** 스크린샷(경로만 보여도 됨)  
3. 사용 OS(Android/iOS), 디버그/릴리스 빌드 여부
