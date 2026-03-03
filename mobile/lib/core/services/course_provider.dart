import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/golf_course.dart';
import '../models/course.dart';
import '../models/tee_set.dart';
import '../models/hole.dart';
import 'course_service.dart';

final courseServiceProvider = Provider<CourseService>((ref) {
  return CourseService();
});

/// 골프장 목록 (지역·이름 필터)
final golfCourseListProvider = FutureProvider.family<List<GolfCourse>, CourseListParams>((ref, params) async {
  final service = ref.watch(courseServiceProvider);
  return service.getGolfCourses(
    region: params.region,
    nameQuery: params.nameQuery,
  );
});

/// 골프장 단건
final golfCourseProvider = FutureProvider.family<GolfCourse?, String>((ref, golfCourseId) async {
  final service = ref.watch(courseServiceProvider);
  return service.getGolfCourse(golfCourseId);
});

/// 특정 골프장 하위 코스 목록
final coursesUnderGolfCourseProvider = FutureProvider.family<List<Course>, String>((ref, golfCourseId) async {
  final service = ref.watch(courseServiceProvider);
  return service.getCoursesUnderGolfCourse(golfCourseId);
});

/// 골프장 + 모든 코스 + 코스별 홀 정보 (1페이지 전체 조회용)
class GolfCourseFullDetail {
  final GolfCourse? golfCourse;
  final List<Course> courses;
  final Map<String, List<Hole>> holesByCourseId; // composite course id -> holes

  const GolfCourseFullDetail({
    this.golfCourse,
    this.courses = const [],
    this.holesByCourseId = const {},
  });
}

final golfCourseFullDetailProvider = FutureProvider.family<GolfCourseFullDetail, String>((ref, golfCourseId) async {
  final service = ref.watch(courseServiceProvider);
  final gc = await service.getGolfCourse(golfCourseId);
  final courses = await service.getCoursesUnderGolfCourse(golfCourseId);
  final holesByCourseId = <String, List<Hole>>{};
  for (final c in courses) {
    holesByCourseId[c.id] = await service.getHoles(c.id);
  }
  return GolfCourseFullDetail(
    golfCourse: gc,
    courses: courses,
    holesByCourseId: holesByCourseId,
  );
});

/// 코스 목록 (지역·이름 필터) — 평탄 전체용
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
