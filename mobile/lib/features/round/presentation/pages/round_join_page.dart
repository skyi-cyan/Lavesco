import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/services/round_provider.dart';
import '../../../../core/router/routes.dart';

/// 초대 코드로 라운드 참가
class RoundJoinPage extends ConsumerStatefulWidget {
  const RoundJoinPage({super.key});

  @override
  ConsumerState<RoundJoinPage> createState() => _RoundJoinPageState();
}

class _RoundJoinPageState extends ConsumerState<RoundJoinPage> {
  final _codeController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    final code = _codeController.text.trim().toUpperCase();
    if (code.isEmpty) {
      setState(() {
        _error = '초대 코드를 입력하세요.';
      });
      return;
    }

    setState(() {
      _error = null;
      _loading = true;
    });

    try {
      final service = ref.read(roundServiceProvider);
      final roundId = await service.joinRoundByCode(code);
      if (!mounted) return;
      ref.invalidate(myRoundsProvider);
      context.go('${AppRoutes.round}/$roundId');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('초대 코드로 참가'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 24),
            Text(
              '친구에게 받은 6자리 초대 코드를 입력하세요.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _codeController,
              decoration: InputDecoration(
                labelText: '초대 코드',
                hintText: '예: ABC123',
                errorText: _error,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.vpn_key_outlined),
              ),
              textCapitalization: TextCapitalization.characters,
              maxLength: 6,
              onChanged: (_) => setState(() => _error = null),
              onSubmitted: (_) => _join(),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _join,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _loading
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('참가하기'),
            ),
          ],
        ),
      ),
    );
  }
}
