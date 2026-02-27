/// 약관 동의 모델
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

  Map<String, bool> toMap() {
    return {
      'serviceTerms': serviceTerms,
      'privacyPolicy': privacyPolicy,
      'marketing': marketing,
    };
  }

  bool get isAllRequiredAgreed => serviceTerms && privacyPolicy;
}
