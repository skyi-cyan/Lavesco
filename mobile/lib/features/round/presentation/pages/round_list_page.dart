import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/round.dart';
import '../../../../core/services/round_provider.dart';
import '../../../../core/router/routes.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart' as app;

/// 라운드 목록 (내 라운드)
class RoundListPage extends ConsumerWidget {
  const RoundListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roundsAsync = ref.watch(myRoundsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('라운드'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(AppRoutes.home),
        ),
        actions: [
          TextButton.icon(
            onPressed: () => context.push(AppRoutes.roundJoin),
            icon: const Icon(Icons.group_add, size: 20),
            label: const Text('참가'),
          ),
        ],
      ),
      body: roundsAsync.when(
        data: (rounds) {
          if (rounds.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.sports_golf,
                    size: 64,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '참가한 라운드가 없습니다.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: () => context.go(AppRoutes.roundRegister),
                    icon: const Icon(Icons.add),
                    label: const Text('새 라운드 등록'),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myRoundsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: rounds.length,
              itemBuilder: (context, index) {
                final round = rounds[index];
                return _RoundTile(
                  round: round,
                        onTap: () => context.push('${AppRoutes.round}/${round.id}'),
                );
              },
            ),
          );
        },
        loading: () => const LoadingWidget(message: '라운드 목록 불러오는 중'),
        error: (e, st) => app.AppErrorWidget(
          message: e.toString().replaceAll('Exception: ', ''),
          onRetry: () => ref.invalidate(myRoundsProvider),
        ),
      ),
      floatingActionButton: roundsAsync.hasValue && roundsAsync.value!.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () => context.go(AppRoutes.roundRegister),
              icon: const Icon(Icons.add),
              label: const Text('새 라운드'),
            )
          : null,
    );
  }
}

class _RoundTile extends StatelessWidget {
  final Round round;
  final VoidCallback onTap;

  const _RoundTile({required this.round, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final dateStr = round.date != null
        ? '${round.date!.year}.${round.date!.month.toString().padLeft(2, '0')}.${round.date!.day.toString().padLeft(2, '0')}'
        : '-';
    final golfCourseName = round.golfCourseName ?? round.courseName;
    final bottomStr = '${round.roundNo ?? '-'} · ${round.courseName} · $dateStr';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(
          round.isActive ? Icons.sports_golf : Icons.check_circle_outline,
          color: round.isActive
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.onSurfaceVariant,
          size: 28,
        ),
        title: Text(
          golfCourseName,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          bottomStr,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (round.isActive)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '진행중',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                      ),
                ),
              ),
            const SizedBox(width: 8),
            Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.onSurfaceVariant),
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}
