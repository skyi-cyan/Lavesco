import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/round.dart';
import '../../../../core/auth/auth_state_provider.dart';
import '../../../../core/services/round_provider.dart';
import '../../../../core/router/routes.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart' as app;

/// 라운드 상세 (정보, 초대, 스코어 입력)
class RoundDetailPage extends StatefulWidget {
  final String roundId;

  const RoundDetailPage({super.key, required this.roundId});

  @override
  State<RoundDetailPage> createState() => _RoundDetailPageState();
}

class _RoundDetailPageState extends State<RoundDetailPage> {
  Map<String, dynamic> _holes = {};
  bool _saving = false;

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) {
    final roundAsync = ref.watch(roundDetailProvider(widget.roundId));
    final scoreAsync = ref.watch(myScoreProvider(widget.roundId));
    final countAsync = ref.watch(roundParticipantCountProvider(widget.roundId));
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('라운드'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(AppRoutes.roundList),
        ),
      ),
      body: roundAsync.when(
        data: (round) {
          if (round == null) {
            return app.AppErrorWidget(
              message: '라운드를 찾을 수 없습니다.',
              onRetry: () => ref.invalidate(roundDetailProvider(widget.roundId)),
            );
          }
          return scoreAsync.when(
            data: (savedHoles) {
              if (_holes.isEmpty) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted) {
                    setState(() {
                      _holes = {};
                      for (var i = 1; i <= round.holesCount; i++) {
                        _holes['$i'] = Map<String, dynamic>.from(savedHoles['$i'] ?? {'strokes': 0});
                      }
                    });
                  }
                });
              }
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(roundDetailProvider(widget.roundId));
                  ref.invalidate(myScoreProvider(widget.roundId));
                  ref.invalidate(roundParticipantCountProvider(widget.roundId));
                },
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _RoundInfoCard(round: round),
                      const SizedBox(height: 16),
                      countAsync.when(
                        data: (count) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            '참가자 $count명',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: Theme.of(context).colorScheme.onSurface,
                                ),
                          ),
                        ),
                        loading: () => const SizedBox.shrink(),
                        error: (_, __) => const SizedBox.shrink(),
                      ),
                      if (round.isActive && user?.uid == round.createdBy) ...[
                        OutlinedButton.icon(
                          onPressed: () => _showInviteDialog(context, ref),
                          icon: const Icon(Icons.link, size: 20),
                          label: const Text('초대 코드 공유'),
                        ),
                        const SizedBox(height: 16),
                      ],
                      if (round.isActive) ...[
                        Text(
                          '스코어 입력',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                        ),
                        const SizedBox(height: 8),
                        _Scorecard(
                          holesCount: round.holesCount,
                          holes: _holes,
                          saving: _saving,
                          onStrokesChanged: (holeNo, strokes) async {
                            setState(() {
                              _holes['$holeNo'] = {'strokes': strokes};
                            });
                            await _saveScore(ref);
                          },
                        ),
                        const SizedBox(height: 24),
                        if (user?.uid == round.createdBy)
                          OutlinedButton(
                            onPressed: () => _finishRound(context, ref, round),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Theme.of(context).colorScheme.error,
                            ),
                            child: const Text('라운드 종료'),
                          ),
                      ] else
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: Center(
                            child: Text(
                              '종료된 라운드입니다.',
                              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
            loading: () => const LoadingWidget(),
            error: (e, st) => app.AppErrorWidget(
              message: e.toString().replaceAll('Exception: ', ''),
              onRetry: () => ref.invalidate(myScoreProvider(widget.roundId)),
            ),
          );
        },
        loading: () => const LoadingWidget(message: '라운드 불러오는 중'),
        error: (e, st) => app.AppErrorWidget(
          message: e.toString().replaceAll('Exception: ', ''),
          onRetry: () => ref.invalidate(roundDetailProvider(widget.roundId)),
        ),
      ),
    );
      },
    );
  }

  Future<void> _saveScore(WidgetRef ref) async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final scoreService = ref.read(scoreServiceProvider);
      await scoreService.saveScore(widget.roundId, _holes);
      if (mounted) ref.invalidate(myScoreProvider(widget.roundId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showInviteDialog(BuildContext context, WidgetRef ref) async {
    try {
      final service = ref.read(roundServiceProvider);
      final code = await service.generateInviteCode(widget.roundId);
      if (!context.mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('초대 코드'),
          content: SelectableText(
            code,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  letterSpacing: 4,
                  fontWeight: FontWeight.bold,
                ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('닫기'),
            ),
            FilledButton(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: code));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('초대 코드가 복사되었습니다.')),
                );
                Navigator.pop(ctx);
              },
              child: const Text('복사'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
    }
  }

  Future<void> _finishRound(BuildContext context, WidgetRef ref, Round round) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('라운드 종료'),
        content: const Text('종료하면 스코어를 더 이상 수정할 수 없습니다. 계속하시겠습니까?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('종료')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      final service = ref.read(roundServiceProvider);
      await service.finishRound(round.id);
      if (!context.mounted) return;
      ref.invalidate(roundDetailProvider(widget.roundId));
      setState(() {});
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
    }
  }
}

class _RoundInfoCard extends StatelessWidget {
  final Round round;

  const _RoundInfoCard({required this.round});

  @override
  Widget build(BuildContext context) {
    final dateStr = round.date != null
        ? '${round.date!.year}.${round.date!.month.toString().padLeft(2, '0')}.${round.date!.day.toString().padLeft(2, '0')}'
        : '-';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              round.courseName,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              '${round.region} · ${round.holesCount}홀 · $dateStr',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Scorecard extends StatelessWidget {
  final int holesCount;
  final Map<String, dynamic> holes;
  final bool saving;
  final void Function(int holeNo, int strokes) onStrokesChanged;

  const _Scorecard({
    required this.holesCount,
    required this.holes,
    required this.saving,
    required this.onStrokesChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Table(
      columnWidths: const {
        0: FlexColumnWidth(0.8),
        1: FlexColumnWidth(1.5),
      },
      children: [
        TableRow(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Theme.of(context).colorScheme.outline.withOpacity(0.5))),
          ),
          children: [
            _cell(context, '홀', isHeader: true),
            _cell(context, '타수', isHeader: true),
          ],
        ),
        ...List.generate(holesCount, (i) {
          final holeNo = i + 1;
          final key = '$holeNo';
          final data = holes[key] as Map<String, dynamic>?;
          final strokes = (data?['strokes'] as int?) ?? 0;

          return TableRow(
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Theme.of(context).colorScheme.outline.withOpacity(0.2))),
            ),
            children: [
              _cell(context, '$holeNo'),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                child: TextFormField(
                  initialValue: strokes > 0 ? '$strokes' : '',
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    isDense: true,
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  onChanged: (v) {
                    final n = int.tryParse(v);
                    onStrokesChanged(holeNo, n ?? 0);
                  },
                ),
              ),
            ],
          );
        }),
      ],
    );
  }

  Widget _cell(BuildContext context, String text, {bool isHeader = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      child: Text(
        text,
        style: isHeader
            ? Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).colorScheme.primary,
                )
            : Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
      ),
    );
  }
}
