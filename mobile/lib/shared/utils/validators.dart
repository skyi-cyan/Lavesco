/// 입력 유효성 검증 유틸리티
class Validators {
  /// 이메일 유효성 검증
  static String? email(String? value) {
    if (value == null || value.isEmpty) {
      return '이메일을 입력해주세요';
    }
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value)) {
      return '유효한 이메일을 입력해주세요';
    }
    return null;
  }

  /// 비밀번호 유효성 검증
  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return '비밀번호를 입력해주세요';
    }
    if (value.length < 6) {
      return '비밀번호는 최소 6자 이상이어야 합니다';
    }
    return null;
  }

  /// 비밀번호 확인 검증
  static String? confirmPassword(String? value, String? password) {
    if (value == null || value.isEmpty) {
      return '비밀번호 확인을 입력해주세요';
    }
    if (value != password) {
      return '비밀번호가 일치하지 않습니다';
    }
    return null;
  }

  /// 닉네임 유효성 검증
  static String? nickname(String? value) {
    if (value == null || value.isEmpty) {
      return '닉네임을 입력해주세요';
    }
    if (value.length < 2) {
      return '닉네임은 최소 2자 이상이어야 합니다';
    }
    if (value.length > 20) {
      return '닉네임은 20자 이하여야 합니다';
    }
    return null;
  }
}
