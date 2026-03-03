import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/course.dart';
import '../../../../core/services/course_provider.dart';
import '../../../../core/router/routes.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart' as app;

/// 특정 골프장 하위 코스 목록 (황룡, 청룡 등) — 골프장 선택 후 표시
class CourseListUnderGolfCoursePage extends ConsumerWidget {
  final String golfCourseId;

  const CourseListUnderGolfCoursePage({
    super.key,
    required this.golfCourseId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coursesAsync = ref.watch(coursesUnderGolfCourseProvider(golfCourseId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('코스 정보'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(AppRoutes.course),
        ),
      ),
      body: coursesAsync.when(
        data: (courses) {
          if (courses.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.golf_course,
                    size: 64,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '등록된 코스가 없습니다.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(coursesUnderGolfCourseProvider(golfCourseId));
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: courses.length,
              itemBuilder: (context, index) {
                final course = courses[index];
                final courseDocId = course.id.contains('__')
                    ? course.id.split('__').last
                    : course.id;
                return _CourseTile(
                  course: course,
                  onTap: () => context.push(
                    '${AppRoutes.course}/$golfCourseId/$courseDocId',
                  ),
                );
              },
            ),
          );
        },
        loading: () => const LoadingWidget(message: '코스 목록 불러오는 중'),
        error: (e, st) => app.AppErrorWidget(
          message: e.toString().replaceAll('Exception: ', ''),
          onRetry: () => ref.invalidate(coursesUnderGolfCourseProvider(golfCourseId)),
        ),
      ),
    );
  }
}

class _CourseTile extends StatelessWidget {
  final Course course;
  final VoidCallback onTap;

  const _CourseTile({required this.course, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(
          Icons.flag,
          color: Theme.of(context).colorScheme.primary,
          size: 28,
        ),
        title: Text(
          course.name,
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
        ),
        subtitle: Text(
          '${course.region} · ${course.holesCount}홀',
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7)),
        ),
        trailing: Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.onSurfaceVariant),
        onTap: onTap,
      ),
    );
  }
}
