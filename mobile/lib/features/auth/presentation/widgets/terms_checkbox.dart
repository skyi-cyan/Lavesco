import 'package:flutter/material.dart';

/// 약관 동의 체크박스 위젯
class TermsCheckbox extends StatelessWidget {
  final bool serviceTerms;
  final bool privacyPolicy;
  final bool marketing;
  final ValueChanged<bool> onServiceTermsChanged;
  final ValueChanged<bool> onPrivacyPolicyChanged;
  final ValueChanged<bool> onMarketingChanged;
  final VoidCallback onTermsTap;

  const TermsCheckbox({
    super.key,
    required this.serviceTerms,
    required this.privacyPolicy,
    required this.marketing,
    required this.onServiceTermsChanged,
    required this.onPrivacyPolicyChanged,
    required this.onMarketingChanged,
    required this.onTermsTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '약관 동의',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        // 서비스 이용약관
        CheckboxListTile(
          value: serviceTerms,
          onChanged: (value) => onServiceTermsChanged(value ?? false),
          title: Row(
            children: [
              const Text('서비스 이용약관'),
              Text(
                ' (필수)',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                ),
              ),
            ],
          ),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          dense: true,
        ),
        // 개인정보 처리방침
        CheckboxListTile(
          value: privacyPolicy,
          onChanged: (value) => onPrivacyPolicyChanged(value ?? false),
          title: Row(
            children: [
              const Text('개인정보 처리방침'),
              Text(
                ' (필수)',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                ),
              ),
            ],
          ),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          dense: true,
        ),
        // 마케팅 수신 동의
        CheckboxListTile(
          value: marketing,
          onChanged: (value) => onMarketingChanged(value ?? false),
          title: const Text('마케팅 수신 동의'),
          subtitle: const Text('(선택)'),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          dense: true,
        ),
        const SizedBox(height: 8),
        // 약관 보기 링크
        TextButton(
          onPressed: onTermsTap,
          child: const Text('약관 전체 보기'),
        ),
      ],
    );
  }
}
