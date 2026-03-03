import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/golf_course.dart';
import '../../../../core/models/course.dart';
import '../../../../core/models/hole.dart';
import '../../../../core/services/course_provider.dart';
import '../../../../core/router/routes.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart' as app;

/// 골프장 클릭 시 1페이지에 해당 골프장의 모든 코스·홀 정보 표시 (admin-web과 동일 구성)
class GolfCourseDetailPage extends ConsumerWidget {
  final String golfCourseId;

  const GolfCourseDetailPage({super.key, required this.golfCourseId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(golfCourseFullDetailProvider(golfCourseId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('코스 정보'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(AppRoutes.course),
        ),
      ),
      body: detailAsync.when(
        data: (detail) {
          if (detail.golfCourse == null && detail.courses.isEmpty) {
            return app.AppErrorWidget(
              message: '골프장 정보를 찾을 수 없습니다.',
              onRetry: () => ref.invalidate(golfCourseFullDetailProvider(golfCourseId)),
            );
          }
          final gc = detail.golfCourse;
          final distanceUnitShort = gc?.distanceUnitShort ?? 'm';

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(golfCourseFullDetailProvider(golfCourseId));
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (gc != null) ...[
                    Text(
                      gc.name,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      gc.region,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  if (detail.courses.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          '등록된 코스가 없습니다.',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ),
                    )
                  else
                    ...detail.courses.map((course) {
                      final holes = detail.holesByCourseId[course.id] ?? [];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _CourseNameBar(courseName: course.name),
                            const SizedBox(height: 12),
                            if (holes.isEmpty)
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                child: Text(
                                  '홀 정보가 없습니다.',
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        color: Theme.of(context).colorScheme.onSurface,
                                      ),
                                ),
                              )
                            else
                              _HolesTableAdminStyle(
                                holes: holes,
                                distanceUnitShort: course.distanceUnitShort,
                              ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
          );
        },
        loading: () => const LoadingWidget(message: '코스 정보 불러오는 중'),
        error: (e, st) => app.AppErrorWidget(
          message: e.toString().replaceAll('Exception: ', ''),
          onRetry: () => ref.invalidate(golfCourseFullDetailProvider(golfCourseId)),
        ),
      ),
    );
  }
}

class _CourseNameBar extends StatelessWidget {
  final String courseName;

  const _CourseNameBar({required this.courseName});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        courseName,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.primary,
            ),
      ),
    );
  }
}

class _HolesTableAdminStyle extends StatelessWidget {
  static const List<String> _teeKeys = ['black', 'blue', 'white', 'red'];
  static const Map<String, String> _teeLabels = {
    'black': 'Black',
    'blue': 'Blue',
    'white': 'White',
    'red': 'Red',
  };

  final List<Hole> holes;
  final String distanceUnitShort;

  const _HolesTableAdminStyle({
    required this.holes,
    required this.distanceUnitShort,
  });

  @override
  Widget build(BuildContext context) {
    return Table(
      columnWidths: const {
        0: FlexColumnWidth(0.7),
        1: FlexColumnWidth(1),
        2: FlexColumnWidth(1),
        3: FlexColumnWidth(1),
        4: FlexColumnWidth(1),
        5: FlexColumnWidth(0.6),
        6: FlexColumnWidth(0.6),
      },
      defaultColumnWidth: const FlexColumnWidth(1),
      children: [
        TableRow(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Theme.of(context).colorScheme.outline.withOpacity(0.5))),
          ),
          children: [
            _cell(context, 'HOLE', align: Alignment.centerLeft, isHeader: true),
            ..._teeKeys.map((k) => _cell(context, '${_teeLabels[k]} ($distanceUnitShort)', align: Alignment.centerRight, isHeader: true)),
            _cell(context, 'PAR', align: Alignment.centerRight, isHeader: true),
            _cell(context, 'HDCP', align: Alignment.centerRight, isHeader: true),
          ],
        ),
        ...holes.map(
          (h) => TableRow(
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Theme.of(context).colorScheme.outline.withOpacity(0.2))),
            ),
            children: [
              _cell(context, h.holeNo, align: Alignment.centerLeft, bold: true),
              ..._teeKeys.map((k) => _cell(context, _formatDistance(h.distanceForTee(k)), align: Alignment.centerRight)),
              _cell(context, '${h.par}', align: Alignment.centerRight),
              _cell(context, _formatHdcp(h.handicapIndex), align: Alignment.centerRight),
            ],
          ),
        ),
      ],
    );
  }

  Widget _cell(BuildContext context, String text, {Alignment align = Alignment.center, bool bold = false, bool isHeader = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
      child: Align(
        alignment: align,
        child: Text(
          text,
          style: isHeader
              ? Theme.of(context).textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.primary,
                  )
              : Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: bold ? FontWeight.w500 : null,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
        ),
      ),
    );
  }

  /// 0이면 공란, 없으면 공란
  static String _formatDistance(int? v) {
    if (v == null || v == 0) return '';
    return '$v';
  }

  /// 0이면 공란, 없으면 공란
  static String _formatHdcp(int? v) {
    if (v == null || v == 0) return '';
    return '$v';
  }
}
