import 'package:flutter/material.dart';

/// 소셜 로그인 버튼 위젯
class SocialLoginButtons extends StatelessWidget {
  final VoidCallback onGoogleLogin;
  final VoidCallback? onAppleLogin;
  final bool isLoading;

  const SocialLoginButtons({
    super.key,
    required this.onGoogleLogin,
    this.onAppleLogin,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Google 로그인 버튼 (Material 아이콘 사용 - asset 404 방지)
        OutlinedButton.icon(
          onPressed: isLoading ? null : onGoogleLogin,
          icon: const Icon(Icons.g_mobiledata, size: 20),
          label: const Text('Google로 로그인'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            side: BorderSide(
              color: Theme.of(context).colorScheme.outline,
            ),
          ),
        ),
        if (onAppleLogin != null) ...[
          const SizedBox(height: 12),
          // Apple 로그인 버튼
          OutlinedButton.icon(
            onPressed: isLoading ? null : onAppleLogin,
            icon: const Icon(Icons.apple, size: 20),
            label: const Text('Apple로 로그인'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              side: BorderSide(
                color: Theme.of(context).colorScheme.outline,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
