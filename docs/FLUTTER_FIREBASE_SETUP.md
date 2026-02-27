# Flutter Firebase 설정 가이드

Flutter 앱에 Firebase를 연동하는 단계별 가이드입니다.

## 현재 상태

- ✅ Firebase 프로젝트: `scorecard-app-6f9bd`
- ✅ Firestore 규칙 배포 완료
- ✅ FlutterFire CLI 설치 완료
- ⏳ Flutter 앱 Firebase 연동 필요

## 설정 방법

### 방법 1: FlutterFire CLI 사용 (권장)

#### 1단계: FlutterFire CLI 실행

```bash
cd D:\NewProduct\Lavesco\mobile
flutterfire configure
```

또는 전체 경로로 실행:

```bash
cd D:\NewProduct\Lavesco\mobile
C:\Users\sdbang\AppData\Local\Pub\Cache\bin\flutterfire.bat configure
```

#### 2단계: 대화형 설정

FlutterFire CLI가 실행되면:

1. **Firebase 프로젝트 선택**
   - `scorecard-app-6f9bd` 선택

2. **플랫폼 선택**
   - Android 선택 (필수)
   - iOS 선택 (iOS 개발 시)
   - Web 선택 (웹 개발 시)

3. **자동 생성**
   - `lib/firebase_options.dart` 파일 자동 생성
   - Android: `google-services.json` 자동 다운로드
   - iOS: `GoogleService-Info.plist` 자동 다운로드

### 방법 2: 수동 설정

FlutterFire CLI가 작동하지 않는 경우 수동으로 설정할 수 있습니다.

#### 1단계: Firebase Console에서 설정 정보 확인

1. [Firebase Console](https://console.firebase.google.com/project/scorecard-app-6f9bd/settings/general) 접속
2. **프로젝트 설정** > **일반** 탭
3. **내 앱** 섹션에서 웹 앱 설정 정보 확인

#### 2단계: firebase_options.dart 생성

`mobile/lib/firebase_options.dart` 파일을 생성하고 다음 내용을 추가:

```dart
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'YOUR_WEB_API_KEY',
    appId: 'YOUR_WEB_APP_ID',
    messagingSenderId: 'YOUR_SENDER_ID',
    projectId: 'scorecard-app-6f9bd',
    authDomain: 'scorecard-app-6f9bd.firebaseapp.com',
    storageBucket: 'scorecard-app-6f9bd.appspot.com',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'YOUR_ANDROID_API_KEY',
    appId: 'YOUR_ANDROID_APP_ID',
    messagingSenderId: 'YOUR_SENDER_ID',
    projectId: 'scorecard-app-6f9bd',
    storageBucket: 'scorecard-app-6f9bd.appspot.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'YOUR_IOS_API_KEY',
    appId: 'YOUR_IOS_APP_ID',
    messagingSenderId: 'YOUR_SENDER_ID',
    projectId: 'scorecard-app-6f9bd',
    storageBucket: 'scorecard-app-6f9bd.appspot.com',
    iosBundleId: 'com.lavesco.app',
  );
}
```

**⚠️ 중요**: Firebase Console에서 실제 값으로 교체하세요.

#### 3단계: Android 설정

1. Firebase Console > **프로젝트 설정** > **내 앱** > **Android 앱 추가**
2. 패키지 이름: `com.lavesco.app` (또는 원하는 패키지 이름)
3. `google-services.json` 다운로드
4. `mobile/android/app/` 디렉토리에 복사

#### 4단계: iOS 설정 (iOS 개발 시)

1. Firebase Console > **프로젝트 설정** > **내 앱** > **iOS 앱 추가**
2. 번들 ID: `com.lavesco.app` (Android와 동일 권장)
3. `GoogleService-Info.plist` 다운로드
4. `mobile/ios/Runner/` 디렉토리에 복사

## main.dart 업데이트

`firebase_options.dart` 파일이 생성되면 `main.dart`를 업데이트합니다:

```dart
import 'firebase_options.dart'; // 주석 해제

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Hive.initFlutter();
  
  // Firebase 초기화 (주석 해제)
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(...);
}
```

## Firebase Authentication 활성화

Firebase Console에서 인증 방법을 활성화해야 합니다:

1. [Firebase Console](https://console.firebase.google.com/project/scorecard-app-6f9bd/authentication/providers) 접속
2. **Authentication** > **Sign-in method** 탭
3. 다음 인증 방법 활성화:
   - ✅ **이메일/비밀번호**: 사용 설정
   - ✅ **Google**: 사용 설정
   - ✅ **Apple**: 사용 설정 (iOS)

## 테스트

설정이 완료되면 앱을 실행하여 테스트:

```bash
cd mobile
flutter run
```

로그인 화면이 표시되고 Firebase 연결이 정상 작동하는지 확인합니다.

## 문제 해결

### firebase_options.dart를 찾을 수 없음

- 파일이 `mobile/lib/` 디렉토리에 있는지 확인
- `main.dart`에서 import 경로 확인

### Firebase 초기화 오류

- `google-services.json` (Android) 또는 `GoogleService-Info.plist` (iOS) 파일 위치 확인
- Firebase Console에서 앱이 올바르게 등록되었는지 확인

### 인증 오류

- Firebase Console에서 인증 방법이 활성화되었는지 확인
- API 키가 올바른지 확인

---

**다음 단계**: Firebase 설정 완료 후 앱을 실행하여 로그인 기능을 테스트하세요.
