# 인증 시스템 구현 계획

라베스코 앱의 인증 시스템 구현을 위한 상세 계획서입니다.

## 📋 목차

1. [요구사항 분석](#요구사항-분석)
2. [기술 스택](#기술-스택)
3. [화면 구조](#화면-구조)
4. [데이터 모델](#데이터-모델)
5. [상태 관리](#상태-관리)
6. [구현 단계](#구현-단계)
7. [코드 구조](#코드-구조)
8. [보안 고려사항](#보안-고려사항)

---

## 요구사항 분석

### PRD 요구사항

#### 인증 방법
- ✅ **이메일/비밀번호** 로그인
- ✅ **Google 로그인** (소셜)
- ✅ **Apple 로그인** (소셜, iOS 필수)

#### 화면 플로우
- **스플래시 화면**: 앱 아이콘 1.5초 후 로그인 여부 분기
- **로그인/회원가입 화면**: 이메일, 소셜 로그인 제공
- **약관/개인정보 동의**: 필수/선택 분리 표시

#### 권한 요청
- **알림 (FCM)**: 초대 수신, 라운드 시작·종료 알림
- **연락처**: 친구 초대 기능 사용 시에만 요청
- ⚠️ 권한 요청은 기능 사용 시점에 컨텍스트와 함께 요청

### 기능 범위

#### Phase 1 (MVP)
- [x] 이메일/비밀번호 로그인
- [x] Google 로그인
- [x] Apple 로그인 (iOS)
- [x] 회원가입
- [x] 로그아웃
- [x] 인증 상태 관리
- [x] 약관/개인정보 동의

#### Phase 2 (추후)
- [ ] 비밀번호 재설정
- [ ] 이메일 인증
- [ ] 계정 삭제
- [ ] 프로필 관리

---

## 기술 스택

### 필수 패키지

```yaml
dependencies:
  # Firebase
  firebase_core: ^3.0.0
  firebase_auth: ^5.0.0
  
  # 소셜 로그인
  google_sign_in: ^6.0.0
  sign_in_with_apple: ^6.0.0
  
  # 상태 관리
  flutter_riverpod: ^2.5.0
  
  # 네비게이션
  go_router: ^14.0.0
  
  # 유틸리티
  intl: ^0.19.0  # 날짜/시간 포맷
```

### 아키텍처

- **상태 관리**: Riverpod
- **네비게이션**: go_router (딥링크 지원)
- **인증**: Firebase Auth
- **데이터 저장**: Firestore (사용자 프로필)

---

## 화면 구조

### 1. 스플래시 화면

**경로**: `/` (루트)

**기능**:
- 앱 아이콘 표시
- 1.5초 대기
- 로그인 상태 확인
- 분기:
  - 로그인됨 → 홈 화면 (`/home`)
  - 미로그인 → 로그인 화면 (`/auth/login`)

**구현**:
```dart
class SplashScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 1.5초 후 인증 상태 확인
    Future.delayed(Duration(milliseconds: 1500), () {
      final authState = ref.read(authStateProvider);
      if (authState.isAuthenticated) {
        context.go('/home');
      } else {
        context.go('/auth/login');
      }
    });
    
    return Scaffold(
      body: Center(
        child: Image.asset('assets/logo.png'),
      ),
    );
  }
}
```

### 2. 로그인 화면

**경로**: `/auth/login`

**기능**:
- 이메일/비밀번호 입력
- Google 로그인 버튼
- Apple 로그인 버튼 (iOS만)
- 회원가입 링크
- 비밀번호 찾기 (Phase 2)

**UI 구성**:
```
┌─────────────────────┐
│      로고/이름       │
├─────────────────────┤
│  이메일 입력         │
│  비밀번호 입력       │
│  [로그인 버튼]       │
├─────────────────────┤
│  ──── 또는 ────     │
├─────────────────────┤
│  [Google 로그인]    │
│  [Apple 로그인]     │
├─────────────────────┤
│  회원가입 링크       │
│  비밀번호 찾기       │
└─────────────────────┘
```

### 3. 회원가입 화면

**경로**: `/auth/signup`

**기능**:
- 이메일/비밀번호 입력
- 비밀번호 확인
- 닉네임 입력
- 약관/개인정보 동의
  - 서비스 이용약관 (필수)
  - 개인정보 처리방침 (필수)
  - 마케팅 수신 동의 (선택)
- 회원가입 버튼

**UI 구성**:
```
┌─────────────────────┐
│      회원가입       │
├─────────────────────┤
│  이메일 입력         │
│  비밀번호 입력       │
│  비밀번호 확인       │
│  닉네임 입력         │
├─────────────────────┤
│  ☑ 서비스 이용약관  │
│  ☑ 개인정보 처리방침│
│  ☐ 마케팅 수신 동의  │
├─────────────────────┤
│  [회원가입 버튼]     │
└─────────────────────┘
```

### 4. 약관 동의 화면

**경로**: `/auth/terms`

**기능**:
- 서비스 이용약관 표시
- 개인정보 처리방침 표시
- 동의 체크박스
- 확인 버튼

---

## 데이터 모델

### 사용자 프로필 (Firestore)

**컬렉션**: `users/{uid}`

```dart
class UserProfile {
  final String uid;
  final String email;
  final String? displayName;
  final String? nickname;
  final String? photoURL;
  final String? provider; // 'email', 'google', 'apple'
  final int? handicap; // 핸디캡
  final String? defaultTee; // 기본 티셋
  final Map<String, bool>? termsAgreement; // 약관 동의 내역
  final DateTime createdAt;
  final DateTime updatedAt;

  UserProfile({
    required this.uid,
    required this.email,
    this.displayName,
    this.nickname,
    this.photoURL,
    this.provider,
    this.handicap,
    this.defaultTee,
    this.termsAgreement,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'email': email,
      'displayName': displayName,
      'nickname': nickname,
      'photoURL': photoURL,
      'provider': provider,
      'handicap': handicap,
      'defaultTee': defaultTee,
      'termsAgreement': termsAgreement,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory UserProfile.fromMap(Map<String, dynamic> map) {
    return UserProfile(
      uid: map['uid'] as String,
      email: map['email'] as String,
      displayName: map['displayName'] as String?,
      nickname: map['nickname'] as String?,
      photoURL: map['photoURL'] as String?,
      provider: map['provider'] as String?,
      handicap: map['handicap'] as int?,
      defaultTee: map['defaultTee'] as String?,
      termsAgreement: (map['termsAgreement'] as Map<String, dynamic>?)
          ?.map((k, v) => MapEntry(k, v as bool)),
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      updatedAt: (map['updatedAt'] as Timestamp).toDate(),
    );
  }
}
```

### 약관 동의 내역

```dart
class TermsAgreement {
  final bool serviceTerms; // 서비스 이용약관 (필수)
  final bool privacyPolicy; // 개인정보 처리방침 (필수)
  final bool marketing; // 마케팅 수신 동의 (선택)
  final DateTime agreedAt;

  TermsAgreement({
    required this.serviceTerms,
    required this.privacyPolicy,
    this.marketing = false,
    required this.agreedAt,
  });
}
```

---

## 상태 관리

### Riverpod Providers

#### 1. 인증 상태 Provider

```dart
// auth_state_provider.dart
final authStateProvider = StreamProvider<User?>((ref) {
  return FirebaseAuth.instance.authStateChanges();
});

// 인증 상태 확인
final isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.value != null;
});

// 현재 사용자
final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.value;
});
```

#### 2. 사용자 프로필 Provider

```dart
// user_profile_provider.dart
final userProfileProvider = StreamProvider<UserProfile?>((ref) {
  final user = ref.watch(currentUserProvider);
  
  if (user == null) {
    return Stream.value(null);
  }
  
  return FirebaseFirestore.instance
    .collection('users')
    .doc(user.uid)
    .snapshots()
    .map((doc) {
      if (!doc.exists) return null;
      return UserProfile.fromMap(doc.data()!);
    });
});
```

#### 3. 인증 서비스 Provider

```dart
// auth_service_provider.dart
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});
```

---

## 구현 단계

### Step 1: Firebase Authentication 설정

#### 1.1. Firebase Console 설정
- [ ] 이메일/비밀번호 활성화
- [ ] Google 로그인 활성화
- [ ] Apple 로그인 활성화 (iOS)

#### 1.2. Flutter 설정
- [ ] `firebase_options.dart` 생성 확인
- [ ] `main.dart`에서 Firebase 초기화

### Step 2: 인증 서비스 구현

#### 2.1. AuthService 클래스 생성
- [ ] 이메일/비밀번호 로그인
- [ ] 이메일/비밀번호 회원가입
- [ ] Google 로그인
- [ ] Apple 로그인
- [ ] 로그아웃
- [ ] 사용자 프로필 생성/업데이트

#### 2.2. 파일 구조
```
mobile/lib/core/auth/
├── auth_service.dart          # 인증 서비스
├── auth_state_provider.dart   # Riverpod providers
└── models/
    └── user_profile.dart      # 사용자 프로필 모델
```

### Step 3: 화면 구현

#### 3.1. 스플래시 화면
- [ ] SplashScreen 위젯
- [ ] 로그인 상태 확인 로직
- [ ] 네비게이션 분기

#### 3.2. 로그인 화면
- [ ] LoginScreen 위젯
- [ ] 이메일/비밀번호 입력 폼
- [ ] Google 로그인 버튼
- [ ] Apple 로그인 버튼
- [ ] 에러 처리

#### 3.3. 회원가입 화면
- [ ] SignUpScreen 위젯
- [ ] 회원가입 폼
- [ ] 약관 동의 체크박스
- [ ] 유효성 검증

#### 3.4. 약관 화면
- [ ] TermsScreen 위젯
- [ ] 약관 내용 표시
- [ ] 동의 확인

### Step 4: 네비게이션 설정

#### 4.1. go_router 설정
- [ ] 라우트 정의
- [ ] 인증 가드 (로그인 필요 화면)
- [ ] 딥링크 처리

#### 4.2. 파일 구조
```
mobile/lib/core/router/
├── app_router.dart            # 라우터 설정
└── routes.dart                # 라우트 상수
```

### Step 5: 권한 요청

#### 5.1. 알림 권한 (FCM)
- [ ] 권한 요청 로직
- [ ] 권한 상태 확인
- [ ] FCM 토큰 저장

#### 5.2. 연락처 권한
- [ ] 권한 요청 로직 (친구 초대 시)
- [ ] 권한 상태 확인

---

## 코드 구조

### 디렉토리 구조

```
mobile/lib/
├── core/
│   ├── auth/
│   │   ├── auth_service.dart
│   │   ├── auth_state_provider.dart
│   │   └── models/
│   │       └── user_profile.dart
│   ├── router/
│   │   ├── app_router.dart
│   │   └── routes.dart
│   └── firebase/
│       └── firebase_config.dart
│
├── features/
│   └── auth/
│       ├── presentation/
│       │   ├── pages/
│       │   │   ├── splash_page.dart
│       │   │   ├── login_page.dart
│       │   │   ├── signup_page.dart
│       │   │   └── terms_page.dart
│       │   └── widgets/
│       │       ├── login_form.dart
│       │       ├── social_login_buttons.dart
│       │       └── terms_checkbox.dart
│       └── domain/
│           └── models/
│               └── terms_agreement.dart
│
└── shared/
    ├── widgets/
    │   ├── loading_widget.dart
    │   └── error_widget.dart
    └── utils/
        └── validators.dart
```

### 주요 파일

#### 1. AuthService (`core/auth/auth_service.dart`)

```dart
class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // 이메일/비밀번호 로그인
  Future<UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return credential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // 이메일/비밀번호 회원가입
  Future<UserCredential> signUpWithEmail({
    required String email,
    required String password,
    required String nickname,
    required TermsAgreement terms,
  }) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      // 사용자 프로필 생성
      await _createUserProfile(
        credential.user!,
        nickname: nickname,
        provider: 'email',
        terms: terms,
      );

      return credential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // Google 로그인
  Future<UserCredential> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await GoogleSignIn().signIn();
      if (googleUser == null) {
        throw Exception('Google 로그인이 취소되었습니다.');
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential =
          await _auth.signInWithCredential(credential);

      // 프로필이 없으면 생성
      await _ensureUserProfile(
        userCredential.user!,
        provider: 'google',
      );

      return userCredential;
    } catch (e) {
      throw Exception('Google 로그인 실패: $e');
    }
  }

  // Apple 로그인 (iOS만)
  Future<UserCredential> signInWithApple() async {
    try {
      final appleCredential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      final oauthCredential = OAuthProvider("apple.com").credential(
        idToken: appleCredential.identityToken,
        accessToken: appleCredential.authorizationCode,
      );

      final userCredential =
          await _auth.signInWithCredential(oauthCredential);

      // 프로필이 없으면 생성
      await _ensureUserProfile(
        userCredential.user!,
        provider: 'apple',
      );

      return userCredential;
    } catch (e) {
      throw Exception('Apple 로그인 실패: $e');
    }
  }

  // 로그아웃
  Future<void> signOut() async {
    await _auth.signOut();
    await GoogleSignIn().signOut();
  }

  // 사용자 프로필 생성
  Future<void> _createUserProfile(
    User user, {
    String? nickname,
    required String provider,
    TermsAgreement? terms,
  }) async {
    final profile = UserProfile(
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName,
      nickname: nickname,
      photoURL: user.photoURL,
      provider: provider,
      termsAgreement: terms != null
          ? {
              'serviceTerms': terms.serviceTerms,
              'privacyPolicy': terms.privacyPolicy,
              'marketing': terms.marketing,
            }
          : null,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await _firestore.collection('users').doc(user.uid).set(profile.toMap());
  }

  // 사용자 프로필 확인 및 생성
  Future<void> _ensureUserProfile(User user, {required String provider}) async {
    final doc = await _firestore.collection('users').doc(user.uid).get();
    
    if (!doc.exists) {
      await _createUserProfile(user, provider: provider);
    }
  }

  // 에러 처리
  Exception _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return Exception('등록되지 않은 이메일입니다.');
      case 'wrong-password':
        return Exception('비밀번호가 잘못되었습니다.');
      case 'email-already-in-use':
        return Exception('이미 사용 중인 이메일입니다.');
      case 'weak-password':
        return Exception('비밀번호가 너무 약합니다.');
      case 'invalid-email':
        return Exception('유효하지 않은 이메일입니다.');
      default:
        return Exception('인증 오류: ${e.message}');
    }
  }
}
```

#### 2. AppRouter (`core/router/app_router.dart`)

```dart
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isAuthenticated = authState.value != null;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      // 로그인되지 않았고 인증 화면이 아니면 로그인으로
      if (!isAuthenticated && !isAuthRoute) {
        return '/auth/login';
      }

      // 로그인되었고 인증 화면이면 홈으로
      if (isAuthenticated && isAuthRoute) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/auth/signup',
        builder: (context, state) => const SignUpPage(),
      ),
      GoRoute(
        path: '/auth/terms',
        builder: (context, state) => const TermsPage(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomePage(),
      ),
    ],
  );
});
```

---

## 보안 고려사항

### 1. 비밀번호 정책
- 최소 8자 이상
- 영문, 숫자, 특수문자 조합 권장
- 클라이언트에서 기본 검증

### 2. 약관 동의
- 필수 약관은 반드시 동의해야 회원가입 가능
- 동의 내역을 Firestore에 저장
- 약관 버전 관리 (추후)

### 3. 에러 처리
- 사용자에게 친화적인 에러 메시지
- 민감한 정보 노출 방지
- 로그에 상세 에러 기록

### 4. 세션 관리
- Firebase Auth가 자동으로 토큰 관리
- 토큰 만료 시 자동 갱신
- 로그아웃 시 모든 세션 종료

---

## 테스트 계획

### 단위 테스트
- [ ] AuthService 메서드 테스트
- [ ] 유효성 검증 테스트
- [ ] 에러 처리 테스트

### 통합 테스트
- [ ] 로그인 플로우 테스트
- [ ] 회원가입 플로우 테스트
- [ ] 소셜 로그인 테스트

### UI 테스트
- [ ] 화면 전환 테스트
- [ ] 폼 유효성 검증 테스트
- [ ] 에러 메시지 표시 테스트

---

## 다음 단계

인증 시스템 구현 완료 후:

1. ✅ 홈 화면 구현
2. ✅ 코스 기능 구현
3. ✅ 라운드 기능 구현
4. ✅ 스코어 입력 기능 구현

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-01-26
