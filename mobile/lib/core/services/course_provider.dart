import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/course.dart';
import '../models/tee_set.dart';
import '../models/hole.dart';
import 'course_service.dart';

final courseServiceProvider = Provider<CourseService>((ref) {
  return CourseService();
});

/// 코스 목록 (지역·이름 필터)
final courseListProvider = FutureProvider.family<List<Course>, CourseListParams>((ref, params) async {
  final service = ref.watch(courseServiceProvider);
  return service.getCourses(
    region: params.region,
    nameQuery: params.nameQuery,
  );
});

class CourseListParams {
  final String? region;
  final String? nameQuery;
  const CourseListParams({this.region, this.nameQuery});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CourseListParams &&
          region == other.region &&
          nameQuery == other.nameQuery;

  @override
  int get hashCode => Object.hash(region, nameQuery);
}

/// 코스 단건
final courseDetailProvider = FutureProvider.family<Course?, String>((ref, courseId) async {
  final service = ref.watch(courseServiceProvider);
  return service.getCourse(courseId);
});

/// 티셋 목록
final teeSetsProvider = FutureProvider.family<List<TeeSet>, String>((ref, courseId) async {
  final service = ref.watch(courseServiceProvider);
  return service.getTeeSets(courseId);
});

/// 홀 목록
final holesProvider = FutureProvider.family<List<Hole>, String>((ref, courseId) async {
  final service = ref.watch(courseServiceProvider);
  return service.getHoles(courseId);
});

/// 지역 목록
final regionsProvider = FutureProvider<List<String>>((ref) async {
  final service = ref.watch(courseServiceProvider);
  return service.getRegions();
});
