import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/golf_course.dart';
import '../../../../core/models/course.dart';
import '../../../../core/services/course_provider.dart';
import '../../../../core/services/course_service.dart';
import '../../../../core/services/round_provider.dart';
import '../../../../core/router/routes.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart' as app;

/// 새 라운드용 코스 선택 (골프장 → 코스)
class RoundSelectCoursePage extends ConsumerStatefulWidget {
  const RoundSelectCoursePage({super.key});

  @override
  ConsumerState<RoundSelectCoursePage> createState() => _RoundSelectCoursePageState();
}

class _RoundSelectCoursePageState extends ConsumerState<RoundSelectCoursePage> {
  GolfCourse? _selectedGolfCourse;
  List<Course> _courses = [];
  bool _loadingCourses = false;

  @override
  Widget build(BuildContext context) {
    final golfCoursesAsync = ref.watch(golfCourseListProvider(const CourseListParams()));

    return Scaffold(
      appBar: AppBar(
        title: Text(_selectedGolfCourse == null ? '코스 선택' : _selectedGolfCourse!.name),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_selectedGolfCourse != null) {
              setState(() {
                _selectedGolfCourse = null;
                _courses = [];
              });
            } else {
              context.pop();
            }
          },
        ),
      ),
      body: _selectedGolfCourse == null
          ? golfCoursesAsync.when(
              data: (list) {
                if (list.isEmpty) {
                  return Center(
                    child: Text(
                      '등록된 골프장이 없습니다.',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (context, index) {
                    final gc = list[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: Icon(Icons.golf_course, color: Theme.of(context).colorScheme.primary, size: 28),
                        title: Text(gc.name, style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                        subtitle: Text(gc.region, style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7))),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () async {
                          setState(() {
                            _selectedGolfCourse = gc;
                            _loadingCourses = true;
                          });
                          final courseService = ref.read(courseServiceProvider);
                          final courses = await courseService.getCoursesUnderGolfCourse(gc.id);
                          if (!mounted) return;
                          setState(() {
                            _courses = courses;
                            _loadingCourses = false;
                          });
                        },
                      ),
                    );
                  },
                );
              },
              loading: () => const LoadingWidget(message: '골프장 목록 불러오는 중'),
              error: (e, st) => app.AppErrorWidget(
                message: e.toString().replaceAll('Exception: ', ''),
                onRetry: () => ref.invalidate(golfCourseListProvider(const CourseListParams())),
              ),
            )
          : _loadingCourses
              ? const Center(child: LoadingWidget(message: '코스 목록 불러오는 중'))
              : _courses.isEmpty
                  ? Center(
                      child: Text(
                        '등록된 코스가 없습니다.',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _courses.length,
                      itemBuilder: (context, index) {
                        final course = _courses[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            leading: Icon(Icons.flag, color: Theme.of(context).colorScheme.primary, size: 28),
                            title: Text(course.name, style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                            subtitle: Text(
                              '${course.region} · ${course.holesCount}홀',
                              style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7)),
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => _createRound(context, course),
                          ),
                        );
                      },
                    ),
    );
  }

  Future<void> _createRound(BuildContext context, Course course) async {
    final service = ref.read(roundServiceProvider);
    try {
      final result = await service.createRound(
        courseId: course.id,
        courseName: course.name,
        region: course.region,
        holesCount: course.holesCount,
      );
      if (!mounted) return;
      ref.invalidate(myRoundsProvider);
      context.go('${AppRoutes.round}/${result.roundId}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
    }
  }
}
