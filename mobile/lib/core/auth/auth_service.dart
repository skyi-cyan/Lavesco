import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../models/user_profile.dart';
import '../../features/auth/domain/models/terms_agreement.dart';

/// 인증 서비스
class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  /// 이메일/비밀번호 로그인
  Future<UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      return credential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  /// 이메일/비밀번호 회원가입
  Future<UserCredential> signUpWithEmail({
    required String email,
    required String password,
    required String nickname,
    required TermsAgreement terms,
  }) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
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

  /// Google 로그인
  Future<UserCredential> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        throw Exception('Google 로그인이 취소되었습니다.');
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential = await _auth.signInWithCredential(credential);

      // 프로필이 없으면 생성
      await _ensureUserProfile(
        userCredential.user!,
        provider: 'google',
      );

      return userCredential;
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Google 로그인 실패: $e');
    }
  }

  /// Apple 로그인 (iOS만)
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

      final userCredential = await _auth.signInWithCredential(oauthCredential);

      // 프로필이 없으면 생성
      await _ensureUserProfile(
        userCredential.user!,
        provider: 'apple',
        displayName: appleCredential.givenName != null
            ? '${appleCredential.givenName} ${appleCredential.familyName ?? ""}'.trim()
            : null,
      );

      return userCredential;
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Apple 로그인 실패: $e');
    }
  }

  /// 로그아웃
  Future<void> signOut() async {
    await Future.wait([
      _auth.signOut(),
      _googleSignIn.signOut(),
    ]);
  }

  /// 사용자 프로필 생성
  Future<void> _createUserProfile(
    User user, {
    String? nickname,
    required String provider,
    TermsAgreement? terms,
    String? displayName,
  }) async {
    final profile = UserProfile(
      uid: user.uid,
      email: user.email ?? '',
      displayName: displayName ?? user.displayName,
      nickname: nickname,
      photoURL: user.photoURL,
      provider: provider,
      termsAgreement: terms?.toMap(),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await _firestore.collection('users').doc(user.uid).set(profile.toMap());
  }

  /// 사용자 프로필 확인 및 생성
  Future<void> _ensureUserProfile(
    User user, {
    required String provider,
    String? displayName,
  }) async {
    final doc = await _firestore.collection('users').doc(user.uid).get();

    if (!doc.exists) {
      await _createUserProfile(
        user,
        provider: provider,
        displayName: displayName,
      );
    }
  }

  /// 에러 처리
  Exception _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return Exception('등록되지 않은 이메일입니다.');
      case 'wrong-password':
        return Exception('비밀번호가 잘못되었습니다.');
      case 'email-already-in-use':
        return Exception('이미 사용 중인 이메일입니다.');
      case 'weak-password':
        return Exception('비밀번호는 최소 6자 이상이어야 합니다.');
      case 'invalid-email':
        return Exception('유효하지 않은 이메일입니다.');
      case 'user-disabled':
        return Exception('비활성화된 계정입니다.');
      case 'too-many-requests':
        return Exception('너무 많은 시도가 있었습니다. 나중에 다시 시도해주세요.');
      case 'operation-not-allowed':
        return Exception('이 로그인 방법은 허용되지 않습니다.');
      default:
        return Exception('인증 오류: ${e.message ?? e.code}');
    }
  }
}
