import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/course.dart';
import '../../../../core/services/course_provider.dart';
import '../../../../core/router/routes.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart' as app;

/// 코스 목록·검색 화면
class CourseListPage extends ConsumerStatefulWidget {
  const CourseListPage({super.key});

  @override
  ConsumerState<CourseListPage> createState() => _CourseListPageState();
}

class _CourseListPageState extends ConsumerState<CourseListPage> {
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
    final coursesAsync = ref.watch(courseListProvider(params));
    final regionsAsync = ref.watch(regionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('코스'),
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
                    hintText: '코스명·지역 검색',
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
            child: coursesAsync.when(
              data: (courses) {
                if (courses.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.golf_course,
                          size: 64,
                          color: Theme.of(context).colorScheme.outline,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '등록된 코스가 없습니다.',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(courseListProvider(params));
                    ref.invalidate(regionsProvider);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: courses.length,
                    itemBuilder: (context, index) {
                      final course = courses[index];
                      return _CourseTile(
                        course: course,
                        onTap: () => context.push(
                          '${AppRoutes.course}/${course.id}',
                        ),
                      );
                    },
                  ),
                );
              },
              loading: () => const LoadingWidget(message: '코스 목록 불러오는 중'),
              error: (e, st) => app.AppErrorWidget(
                message: e.toString().replaceAll('Exception: ', ''),
                onRetry: () => ref.invalidate(courseListProvider(params)),
              ),
            ),
          ),
        ],
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
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          child: Icon(
            Icons.golf_course,
            color: Theme.of(context).colorScheme.onPrimaryContainer,
          ),
        ),
        title: Text(course.name),
        subtitle: Text('${course.region} · ${course.holesCount}홀'),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
