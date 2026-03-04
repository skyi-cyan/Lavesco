# Firebase 빠른 설정 가이드

React Native 모바일 앱(mobile-rn)에 Firebase를 빠르게 연동하는 방법입니다.

## 📋 체크리스트

- [ ] Firebase Console에서 Android 앱 등록
- [ ] Firebase Console에서 iOS 앱 등록 (iOS 빌드 시)
- [ ] `google-services.json` 다운로드 후 `mobile-rn/android/app/`에 복사
- [ ] `GoogleService-Info.plist` 다운로드 후 Xcode 프로젝트에 추가 (iOS)
- [ ] Firebase Authentication 활성화

## 🚀 단계별 설정

### Step 1: Firebase Console에서 앱 등록

#### Android 앱 등록

1. [Firebase Console](https://console.firebase.google.com/project/scorecard-app-6f9bd/settings/general) 접속
2. **프로젝트 설정** > **일반** 탭
3. **내 앱** 섹션에서 **Android 앱 추가** 클릭
4. **Android 패키지 이름** 입력: `com.lavesco.app`
5. **앱 닉네임** 입력: `Lavesco` (선택)
6. **앱 등록** 클릭
7. **google-services.json 다운로드**
8. 파일을 `mobile-rn/android/app/` 디렉토리에 복사

#### iOS 앱 등록 (iOS 개발 시)

1. **iOS 앱 추가** 클릭
2. **iOS 번들 ID** 입력: `com.lavesco.app` (또는 Xcode에 설정한 번들 ID)
3. **앱 닉네임** 입력: `Lavesco` (선택)
4. **앱 등록** 클릭
5. **GoogleService-Info.plist 다운로드**
6. Xcode에서 `mobile-rn/ios/` 프로젝트를 연 뒤, 앱 타겟에 `GoogleService-Info.plist` 추가 (드래그 후 "Copy items if needed" 체크)

### Step 2: Firebase Authentication 활성화

1. [Firebase Console](https://console.firebase.google.com/project/scorecard-app-6f9bd/authentication/providers) 접속
2. **Authentication** > **Sign-in method** 탭
3. 다음 인증 방법 활성화:
   - **이메일/비밀번호**: 클릭 > 사용 설정 > 저장
   - **Google**: 클릭 > 사용 설정 > 프로젝트 지원 이메일 선택 > 저장
   - **Apple**: 클릭 > 사용 설정 > 저장 (iOS)

### Step 3: 테스트

```bash
cd mobile-rn
npm install
npm start
# 별도 터미널에서
npm run android   # 또는 npm run ios
```

## 🔍 설정 확인

### Firebase 연결 확인

앱 실행 후:
1. 로그인 화면이 표시되는지 확인
2. Firebase Console > Authentication > 사용자에서 테스트 계정 생성 확인

### 에러 발생 시

1. **Android: No matching client for package name**
   - `google-services.json`의 `package_name`이 `com.lavesco.app`인지 확인
   - [mobile-rn/README.md](../mobile-rn/README.md) 트러블슈팅 참고

2. **Firebase 초기화 오류**
   - `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) 파일 위치 확인

3. **인증 오류**
   - Firebase Console에서 인증 방법이 활성화되었는지 확인

## 📝 참고

- 모바일 앱 상세 설정 및 실행: [mobile-rn/README.md](../mobile-rn/README.md)
- Firebase 전체 설정 가이드: [FIREBASE_SETUP_GUIDE.md](./FIREBASE_SETUP_GUIDE.md)

---

**설정 완료 후**: 앱을 실행하여 로그인 기능을 테스트하세요!
