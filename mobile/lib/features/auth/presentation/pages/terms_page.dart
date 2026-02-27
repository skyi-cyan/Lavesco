import 'package:flutter/material.dart';

/// 약관 화면
class TermsPage extends StatelessWidget {
  const TermsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('약관'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 서비스 이용약관
            Text(
              '서비스 이용약관',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Text(
              _serviceTermsText,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 32),
            // 개인정보 처리방침
            Text(
              '개인정보 처리방침',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Text(
              _privacyPolicyText,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  static const String _serviceTermsText = '''
제1조 (목적)
이 약관은 라베스코(이하 "회사")가 제공하는 골프 스코어 공유 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 골프 스코어 공유 애플리케이션 및 관련 서비스를 의미합니다.
2. "이용자"란 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 의미합니다.
3. "회원"이란 서비스에 회원등록을 하고 서비스를 이용하는 자를 의미합니다.

제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.
2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.
3. 약관이 변경되는 경우 회사는 변경사항을 서비스 내 공지하거나 이메일로 통지합니다.

제4조 (서비스의 제공 및 변경)
1. 회사는 다음과 같은 서비스를 제공합니다:
   - 골프 스코어 입력 및 관리
   - 라운드 생성 및 참가
   - 스코어보드 공유
   - 골프장 코스 정보 제공

2. 회사는 서비스의 내용을 변경할 수 있으며, 변경 시 사전에 공지합니다.
''';

  static const String _privacyPolicyText = '''
제1조 (개인정보의 처리목적)
회사는 다음의 목적을 위하여 개인정보를 처리합니다:
1. 서비스 제공 및 계약의 이행
2. 회원 관리 및 본인 확인
3. 서비스 개선 및 신규 서비스 개발
4. 마케팅 및 광고 활용 (동의 시)

제2조 (개인정보의 처리 및 보유기간)
1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
   - 회원 가입 및 관리: 회원 탈퇴 시까지
   - 서비스 이용 기록: 3년

제3조 (개인정보의 제3자 제공)
회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:
1. 이용자가 사전에 동의한 경우
2. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

제4조 (정보주체의 권리·의무 및 행사방법)
1. 정보주체는 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
   - 개인정보 열람 요구
   - 오류 등이 있을 경우 정정 요구
   - 삭제 요구
   - 처리정지 요구

2. 제1항에 따른 권리 행사는 회사에 대해 서면, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
''';
}
