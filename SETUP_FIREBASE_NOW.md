# 🔥 Firebase 설정 지금 바로 하기

## 현재 상태

✅ Firebase 프로젝트: `scorecard-app-6f9bd`  
✅ Firestore 규칙 배포 완료  
⏳ Flutter 앱 Firebase 연동 필요

## 🚀 빠른 설정 (5분)

### 1. Firebase Console에서 앱 등록

#### Android 앱 등록

1. [Firebase Console - 프로젝트 설정](https://console.firebase.google.com/project/scorecard-app-6f9bd/settings/general) 접속
2. **내 앱** 섹션에서 **Android 앱 추가** 클릭
3. **Android 패키지 이름**: `com.lavesco.app` 입력
4. **앱 등록** 클릭
5. **google-services.json** 다운로드
6. 파일을 `mobile/android/app/` 디렉토리에 복사

#### Web 앱 등록 (firebase_options.dart용)

1. **웹 앱 추가** 클릭
2. **앱 닉네임**: `Lavesco Web` 입력
3. **앱 등록** 클릭
4. 설정 정보 복사 (나중에 사용)

### 2. firebase_options.dart 생성

1. `mobile/lib/firebase_options.dart.template` 파일을 `mobile/lib/firebase_options.dart`로 복사
2. Firebase Console에서 설정 정보 확인:
   - **프로젝트 설정** > **일반** > **내 앱** 섹션
3. `firebase_options.dart` 파일 열기
4. 다음 값들을 실제 값으로 교체:
   - `YOUR_WEB_API_KEY` → 웹 앱의 API 키
   - `YOUR_WEB_APP_ID` → 웹 앱의 App ID
   - `YOUR_ANDROID_API_KEY` → Android 앱의 API 키
   - `YOUR_ANDROID_APP_ID` → Android 앱의 App ID
   - `YOUR_SENDER_ID` → Messaging Sender ID (모든 플랫폼 동일)

### 3. main.dart 업데이트

`mobile/lib/main.dart` 파일에서:

```dart
// 이 줄의 주석 해제
import 'firebase_options.dart';

// 이 부분의 주석 해제
await Firebase.initializeApp(
  options: DefaultFirebaseOptions.currentPlatform,
);
```

### 4. Firebase Authentication 활성화

1. [Firebase Console - Authentication](https://console.firebase.google.com/project/scorecard-app-6f9bd/authentication/providers) 접속
2. **Sign-in method** 탭
3. 다음 활성화:
   - ✅ **이메일/비밀번호**: 사용 설정
   - ✅ **Google**: 사용 설정
   - ✅ **Apple**: 사용 설정 (iOS 개발 시)

### 5. 테스트

```bash
cd mobile
flutter pub get
flutter run
```

## 📚 상세 가이드

- [빠른 설정 가이드](./docs/FIREBASE_QUICK_SETUP.md)
- [상세 설정 가이드](./docs/FLUTTER_FIREBASE_SETUP.md)
- [Firebase 전체 설정 가이드](./docs/FIREBASE_SETUP_GUIDE.md)

## ⚠️ 중요

1. **Android 앱 등록 필수**: `google-services.json` 파일이 필요합니다
2. **Web 앱 등록 필수**: `firebase_options.dart`의 웹 설정에 필요합니다
3. **Authentication 활성화 필수**: 로그인 기능을 사용하려면 반드시 활성화해야 합니다

## ✅ 완료 체크리스트

- [ ] Android 앱 등록 완료
- [ ] `google-services.json` 다운로드 및 복사 완료
- [ ] Web 앱 등록 완료
- [ ] `firebase_options.dart` 생성 및 값 입력 완료
- [ ] `main.dart`에서 Firebase 초기화 활성화 완료
- [ ] Firebase Authentication 활성화 완료
- [ ] 앱 실행 테스트 완료

---

**설정 완료 후 알려주시면 다음 단계로 진행하겠습니다!**
