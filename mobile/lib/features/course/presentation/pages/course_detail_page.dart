import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/course.dart';
import '../../../../core/models/tee_set.dart';
import '../../../../core/models/hole.dart';
import '../../../../core/services/course_provider.dart';
import '../../../../core/router/routes.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart' as app;

/// 코스 상세 화면 (티셋 선택, 홀별 Par/거리)
class CourseDetailPage extends ConsumerStatefulWidget {
  final String courseId;

  const CourseDetailPage({super.key, required this.courseId});

  @override
  ConsumerState<CourseDetailPage> createState() => _CourseDetailPageState();
}

class _CourseDetailPageState extends ConsumerState<CourseDetailPage> {
  TeeSet? _selectedTeeSet;

  @override
  Widget build(BuildContext context) {
    final courseAsync = ref.watch(courseDetailProvider(widget.courseId));
    final teeSetsAsync = ref.watch(teeSetsProvider(widget.courseId));
    final holesAsync = ref.watch(holesProvider(widget.courseId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('코스 정보'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(AppRoutes.course),
        ),
      ),
      body: courseAsync.when(
        data: (course) {
          if (course == null) {
            return app.AppErrorWidget(
              message: '코스를 찾을 수 없습니다.',
              onRetry: () => ref.invalidate(courseDetailProvider(widget.courseId)),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(courseDetailProvider(widget.courseId));
              ref.invalidate(teeSetsProvider(widget.courseId));
              ref.invalidate(holesProvider(widget.courseId));
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _CourseHeader(course: course),
                  const SizedBox(height: 24),
                  teeSetsAsync.when(
                    data: (teeSets) {
                      if (teeSets.isEmpty) {
                        return const SizedBox.shrink();
                      }
                      final currentId = _selectedTeeSet?.id;
                      TeeSet selected = teeSets.first;
                      if (currentId != null) {
                        final found = teeSets.where((t) => t.id == currentId);
                        if (found.isNotEmpty) selected = found.first;
                      }
                      if (_selectedTeeSet == null && teeSets.isNotEmpty) {
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (mounted) setState(() => _selectedTeeSet = teeSets.first);
                        });
                      }
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: DropdownButtonFormField<TeeSet>(
                          value: selected,
                          decoration: InputDecoration(
                            labelText: '티셋',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          items: teeSets
                              .map((t) => DropdownMenuItem(
                                    value: t,
                                    child: Text(
                                      t.name +
                                          (t.rating != null
                                              ? ' (Rating ${t.rating})'
                                              : ''),
                                    ),
                                  ))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) setState(() => _selectedTeeSet = v);
                          },
                        ),
                      );
                    },
                    loading: () => const SizedBox(height: 56),
                    error: (_, __) => const SizedBox.shrink(),
                  ),
                  holesAsync.when(
                    data: (holes) {
                      if (holes.isEmpty) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(24),
                            child: Text('홀 정보가 없습니다.'),
                          ),
                        );
                      }
                      final teeId = _selectedTeeSet?.id;
                      return _HolesTable(
                        holes: holes,
                        teeSetId: teeId,
                        teeSetName: _selectedTeeSet?.name ?? '',
                      );
                    },
                    loading: () => const LoadingWidget(),
                    error: (e, st) => app.AppErrorWidget(
                      message: e.toString().replaceAll('Exception: ', ''),
                      onRetry: () => ref.invalidate(holesProvider(widget.courseId)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        loading: () => const LoadingWidget(message: '코스 정보 불러오는 중'),
        error: (e, st) => app.AppErrorWidget(
          message: e.toString().replaceAll('Exception: ', ''),
          onRetry: () => ref.invalidate(courseDetailProvider(widget.courseId)),
        ),
      ),
    );
  }
}

class _CourseHeader extends StatelessWidget {
  final Course course;

  const _CourseHeader({required this.course});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.golf_course,
                  size: 40,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        course.name,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${course.region} · ${course.holesCount}홀',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HolesTable extends StatelessWidget {
  final List<Hole> holes;
  final String? teeSetId;
  final String teeSetName;

  const _HolesTable({
    required this.holes,
    this.teeSetId,
    required this.teeSetName,
  });

  @override
  Widget build(BuildContext context) {
    final id = teeSetId;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '홀별 정보',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Table(
          columnWidths: const {
            0: FlexColumnWidth(1),
            1: FlexColumnWidth(1),
            2: FlexColumnWidth(1.5),
          },
          children: [
            TableRow(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
              ),
              children: [
                _pad('홀'),
                _pad('Par'),
                _pad(id != null ? '거리(yd)' : '-'),
              ],
            ),
            ...holes.map(
              (h) => TableRow(
                children: [
                  _pad(h.holeNo),
                  _pad('${h.par}'),
                  _pad(id != null && h.distanceForTee(id) != null
                      ? '${h.distanceForTee(id)}'
                      : '-'),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _pad(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Text(text),
    );
  }
}
