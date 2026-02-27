class AppConstants {
  // 앱 정보
  static const String appName = 'Lavesco';
  static const String appVersion = '1.0.0';

  // 라운드 설정
  static const int maxParticipants = 8;
  static const int inviteCodeLength = 6;
  static const Duration inviteCodeExpiry = Duration(hours: 24);

  // 스코어 입력
  static const int minStrokes = 1;
  static const int maxStrokes = 20;

  // 페이지네이션
  static const int roundsPerPage = 20;
}
