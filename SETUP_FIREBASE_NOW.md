# 🔥 Firebase 설정 지금 바로 하기

## 현재 상태

✅ Firebase 프로젝트: `scorecard-app-6f9bd`  
✅ Firestore 규칙 배포 완료  
⏳ 모바일 앱 (React Native) Firebase 연동 필요

## 🚀 빠른 설정 (5분)

### 1. Firebase Console에서 앱 등록

#### Android 앱 등록

1. [Firebase Console - 프로젝트 설정](https://console.firebase.google.com/project/scorecard-app-6f9bd/settings/general) 접속
2. **내 앱** 섹션에서 **Android 앱 추가** 클릭
3. **Android 패키지 이름**: `com.lavesco.app` 입력
4. **앱 등록** 클릭
5. **google-services.json** 다운로드
6. 파일을 `mobile-rn/android/app/` 디렉토리에 복사

#### iOS 앱 등록 (iOS 빌드 시)

1. **iOS 앱 추가** 클릭
2. **번들 ID**: `com.lavesco.app` 입력 (또는 Xcode에 설정한 번들 ID)
3. **앱 등록** 클릭
4. **GoogleService-Info.plist** 다운로드
5. Xcode에서 `mobile-rn/ios/` 프로젝트를 연 뒤, 앱 타겟에 `GoogleService-Info.plist` 추가 (드래그 후 "Copy items if needed" 체크)

### 2. Firebase Authentication 활성화

1. [Firebase Console - Authentication](https://console.firebase.google.com/project/scorecard-app-6f9bd/authentication/providers) 접속
2. **Sign-in method** 탭
3. 다음 활성화:
   - ✅ **이메일/비밀번호**: 사용 설정
   - ✅ **Google**: 사용 설정 (Android/iOS에서 사용 시 OAuth 클라이언트 설정 필요)
   - ✅ **Apple**: 사용 설정 (iOS 개발 시)

### 3. 테스트

```bash
cd mobile-rn
npm install
npm start
# 별도 터미널에서
npm run android   # 또는 npm run ios
```

자세한 실행 방법과 트러블슈팅은 [mobile-rn/README.md](./mobile-rn/README.md)를 참고하세요.

## 📚 상세 가이드

- [Firebase 빠른 설정 가이드](./docs/FIREBASE_QUICK_SETUP.md)
- [Firebase 전체 설정 가이드](./docs/FIREBASE_SETUP_GUIDE.md)
- [모바일 앱 (RN) 설정 및 실행](./mobile-rn/README.md)

## ⚠️ 중요

1. **Android 앱 등록 필수**: `google-services.json` 파일이 `mobile-rn/android/app/`에 있어야 합니다.
2. **iOS 빌드 시**: `GoogleService-Info.plist`를 Xcode 프로젝트에 추가해야 합니다.
3. **Authentication 활성화 필수**: 로그인 기능을 사용하려면 반드시 활성화해야 합니다.

## ✅ 완료 체크리스트

- [ ] Android 앱 등록 완료
- [ ] `google-services.json` 다운로드 및 `mobile-rn/android/app/` 복사 완료
- [ ] (iOS) iOS 앱 등록 및 `GoogleService-Info.plist` 추가 완료
- [ ] Firebase Authentication 활성화 완료
- [ ] 앱 실행 테스트 완료

---

**설정 완료 후 알려주시면 다음 단계로 진행하겠습니다!**
