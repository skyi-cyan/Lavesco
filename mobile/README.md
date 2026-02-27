# Lavesco Mobile App

라베스코 골프 스코어 공유 앱 (Flutter)

## 시작하기

### 필수 요구사항
- Flutter SDK 3.0.0 이상
- Dart SDK 3.0.0 이상
- Firebase 프로젝트 설정 완료

### 설치

```bash
flutter pub get
```

### Firebase 설정

1. `firebase_options.dart` 파일 생성 (Firebase CLI 사용)
2. `google-services.json` (Android) 및 `GoogleService-Info.plist` (iOS) 추가

### 실행

```bash
flutter run
```

## 프로젝트 구조

```
lib/
├── core/              # 핵심 기능
│   ├── auth/
│   ├── firebase/
│   ├── models/
│   ├── services/
│   └── utils/
├── features/          # 기능별 모듈
│   ├── home/
│   ├── round/
│   ├── course/
│   ├── profile/
│   └── score/
├── shared/            # 공통 위젯/유틸
│   ├── widgets/
│   ├── theme/
│   └── constants/
└── main.dart
```
