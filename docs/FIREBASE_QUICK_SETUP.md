# Firebase 빠른 설정 가이드

Flutter 앱에 Firebase를 빠르게 연동하는 방법입니다.

## 📋 체크리스트

- [ ] Firebase Console에서 Android 앱 등록
- [ ] Firebase Console에서 iOS 앱 등록 (선택)
- [ ] Firebase Console에서 Web 앱 등록
- [ ] `firebase_options.dart` 파일 생성
- [ ] `google-services.json` 다운로드 (Android)
- [ ] `GoogleService-Info.plist` 다운로드 (iOS, 선택)
- [ ] `main.dart`에서 Firebase 초기화 활성화
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
8. 파일을 `mobile/android/app/` 디렉토리에 복사

#### iOS 앱 등록 (iOS 개발 시)

1. **iOS 앱 추가** 클릭
2. **iOS 번들 ID** 입력: `com.lavesco.app`
3. **앱 닉네임** 입력: `Lavesco` (선택)
4. **앱 등록** 클릭
5. **GoogleService-Info.plist 다운로드**
6. 파일을 `mobile/ios/Runner/` 디렉토리에 복사

#### Web 앱 등록

1. **웹 앱 추가** 클릭
2. **앱 닉네임** 입력: `Lavesco Web`
3. **Firebase Hosting 설정** 체크 해제
4. **앱 등록** 클릭
5. 설정 정보 복사 (나중에 사용)

### Step 2: firebase_options.dart 생성

1. `mobile/lib/firebase_options.dart.template` 파일을 `firebase_options.dart`로 복사
2. Firebase Console에서 각 플랫폼의 설정 정보 확인:
   - **프로젝트 설정** > **일반** > **내 앱** 섹션
3. `firebase_options.dart` 파일에서 다음 값들을 실제 값으로 교체:
   - `YOUR_WEB_API_KEY` → 웹 앱의 API 키
   - `YOUR_WEB_APP_ID` → 웹 앱의 App ID
   - `YOUR_ANDROID_API_KEY` → Android 앱의 API 키
   - `YOUR_ANDROID_APP_ID` → Android 앱의 App ID
   - `YOUR_IOS_API_KEY` → iOS 앱의 API 키 (iOS 개발 시)
   - `YOUR_IOS_APP_ID` → iOS 앱의 App ID (iOS 개발 시)
   - `YOUR_SENDER_ID` → Messaging Sender ID (모든 플랫폼 동일)

### Step 3: main.dart 업데이트

`mobile/lib/main.dart` 파일을 열고:

```dart
// 주석 해제
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Hive.initFlutter();
  
  // 주석 해제
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(...);
}
```

### Step 4: Firebase Authentication 활성화

1. [Firebase Console](https://console.firebase.google.com/project/scorecard-app-6f9bd/authentication/providers) 접속
2. **Authentication** > **Sign-in method** 탭
3. 다음 인증 방법 활성화:
   - **이메일/비밀번호**: 클릭 > 사용 설정 > 저장
   - **Google**: 클릭 > 사용 설정 > 프로젝트 지원 이메일 선택 > 저장
   - **Apple**: 클릭 > 사용 설정 > 저장 (iOS)

### Step 5: Android 프로젝트 설정

`mobile/android/app/build.gradle` 파일 하단에 추가:

```gradle
apply plugin: 'com.google.gms.google-services'
```

`mobile/android/build.gradle` 파일의 `dependencies` 섹션에 추가:

```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.4.0'
}
```

### Step 6: 테스트

```bash
cd mobile
flutter pub get
flutter run
```

## 🔍 설정 확인

### Firebase 연결 확인

앱 실행 후:
1. 로그인 화면이 표시되는지 확인
2. Firebase Console > Authentication > 사용자에서 테스트 계정 생성 확인

### 에러 발생 시

1. **firebase_options.dart를 찾을 수 없음**
   - 파일이 `mobile/lib/` 디렉토리에 있는지 확인
   - 파일 이름이 정확한지 확인

2. **Firebase 초기화 오류**
   - `google-services.json` 파일 위치 확인
   - API 키가 올바른지 확인

3. **인증 오류**
   - Firebase Console에서 인증 방법이 활성화되었는지 확인
   - API 키가 올바른지 확인

## 📝 참고

- 상세한 설정 가이드: [FLUTTER_FIREBASE_SETUP.md](./FLUTTER_FIREBASE_SETUP.md)
- Firebase 설정 가이드: [FIREBASE_SETUP_GUIDE.md](./FIREBASE_SETUP_GUIDE.md)

---

**설정 완료 후**: 앱을 실행하여 로그인 기능을 테스트하세요!
