import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/golf_course.dart';
import '../../../../core/services/course_provider.dart';
import '../../../../core/router/routes.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart' as app;

/// 골프장 목록 화면 (코스보기 진입 시 첫 화면)
class GolfCourseListPage extends ConsumerStatefulWidget {
  const GolfCourseListPage({super.key});

  @override
  ConsumerState<GolfCourseListPage> createState() => _GolfCourseListPageState();
}

class _GolfCourseListPageState extends ConsumerState<GolfCourseListPage> {
  String? _selectedRegion;
  String _nameQuery = '';
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applyFilter() {
    setState(() {
      _nameQuery = _searchController.text.trim();
    });
  }

  @override
  Widget build(BuildContext context) {
    final params = CourseListParams(
      region: _selectedRegion,
      nameQuery: _nameQuery.isEmpty ? null : _nameQuery,
    );
    final golfCoursesAsync = ref.watch(golfCourseListProvider(params));
    final regionsAsync = ref.watch(regionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('골프장'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(AppRoutes.home),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: '골프장명·지역 검색',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _applyFilter();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onSubmitted: (_) => _applyFilter(),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: regionsAsync.when(
                        data: (regions) {
                          if (regions.isEmpty) {
                            return const SizedBox.shrink();
                          }
                          return DropdownButtonFormField<String?>(
                            value: _selectedRegion,
                            decoration: InputDecoration(
                              labelText: '지역',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            items: [
                              const DropdownMenuItem(
                                value: null,
                                child: Text('전체'),
                              ),
                              ...regions.map(
                                (r) => DropdownMenuItem(
                                  value: r,
                                  child: Text(r),
                                ),
                              ),
                            ],
                            onChanged: (v) {
                              setState(() => _selectedRegion = v);
                            },
                          );
                        },
                        loading: () => const SizedBox(
                          height: 56,
                          child: Center(child: CircularProgressIndicator()),
                        ),
                        error: (_, __) => const SizedBox.shrink(),
                      ),
                    ),
                    const SizedBox(width: 12),
                    FilledButton.icon(
                      onPressed: _applyFilter,
                      icon: const Icon(Icons.filter_list, size: 20),
                      label: const Text('검색'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: golfCoursesAsync.when(
              data: (golfCourses) {
                if (golfCourses.isEmpty) {
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
                          '등록된 골프장이 없습니다.',
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
                    ref.invalidate(golfCourseListProvider(params));
                    ref.invalidate(regionsProvider);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: golfCourses.length,
                    itemBuilder: (context, index) {
                      final gc = golfCourses[index];
                      return _GolfCourseTile(
                        golfCourse: gc,
                        onTap: () => context.push(
                          '${AppRoutes.course}/${gc.id}',
                        ),
                      );
                    },
                  ),
                );
              },
              loading: () => const LoadingWidget(message: '골프장 목록 불러오는 중'),
              error: (e, st) => app.AppErrorWidget(
                message: e.toString().replaceAll('Exception: ', ''),
                onRetry: () => ref.invalidate(golfCourseListProvider(params)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GolfCourseTile extends StatelessWidget {
  final GolfCourse golfCourse;
  final VoidCallback onTap;

  const _GolfCourseTile({required this.golfCourse, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(
          Icons.golf_course,
          color: Theme.of(context).colorScheme.primary,
          size: 28,
        ),
        title: Text(
          golfCourse.name,
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
        ),
        subtitle: Text(
          golfCourse.region,
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7)),
        ),
        trailing: Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.onSurfaceVariant),
        onTap: onTap,
      ),
    );
  }
}
