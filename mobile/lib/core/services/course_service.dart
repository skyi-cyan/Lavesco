import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/golf_course.dart';
import '../models/course.dart';
import '../models/tee_set.dart';
import '../models/hole.dart';

/// admin-web과 동일한 Firestore 구조: golfCourses/{id}/courses/{id}/holes
const String _kGolfCourses = 'golfCourses';
const String _kCourses = 'courses';
const String _kHoles = 'holes';
const String _kCompositeIdSeparator = '__';

/// admin 구조용 가상 티색 (거리 키와 동일)
const List<String> _kTeeKeys = ['black', 'blue', 'white', 'red'];

/// 코스 조회 서비스 (Firestore 읽기 전용)
/// - admin-web 등록 코스: golfCourses/{golfCourseId}/courses/{courseId}/holes
/// - 복합 ID: golfCourseId__courseId 로 한 번에 식별
class CourseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  bool _isCompositeId(String id) => id.contains(_kCompositeIdSeparator);

  /// 골프장 목록 조회 (지역·이름 필터)
  Future<List<GolfCourse>> getGolfCourses({
    String? region,
    String? nameQuery,
    int limit = 100,
  }) async {
    Query<Map<String, dynamic>> q = _firestore
        .collection(_kGolfCourses)
        .where('status', isEqualTo: 'ACTIVE')
        .limit(limit);

    if (region != null && region.isNotEmpty) {
      q = q.where('region', isEqualTo: region);
    }

    final snapshot = await q.get();
    var list = snapshot.docs
        .map((d) => GolfCourse.fromMap(d.id, d.data()))
        .toList();

    if (nameQuery != null && nameQuery.trim().isNotEmpty) {
      final lower = nameQuery.trim().toLowerCase();
      list = list
          .where((c) =>
              c.name.toLowerCase().contains(lower) ||
              c.region.toLowerCase().contains(lower))
          .toList();
    }

    list.sort((a, b) {
      final r = a.region.compareTo(b.region);
      return r != 0 ? r : a.name.compareTo(b.name);
    });
    return list;
  }

  /// 골프장 단건 조회
  Future<GolfCourse?> getGolfCourse(String golfCourseId) async {
    final doc = await _firestore.collection(_kGolfCourses).doc(golfCourseId).get();
    if (!doc.exists || doc.data() == null) return null;
    return GolfCourse.fromMap(doc.id, doc.data()!);
  }

  /// 특정 골프장 하위 코스 목록 (황룡, 청룡 등)
  /// orderBy 사용 시 'order' 필드 없는 문서는 결과에서 제외되므로, 무조건 get() 후 메모리 정렬
  Future<List<Course>> getCoursesUnderGolfCourse(String golfCourseId) async {
    final gcDoc = await _firestore.collection(_kGolfCourses).doc(golfCourseId).get();
    if (!gcDoc.exists || gcDoc.data() == null) return [];
    final gcData = gcDoc.data()!;
    final gcRegion = gcData['region'] as String? ?? '';
    final distanceUnit = gcData['distanceUnit'] as String?;
    final unit = distanceUnit == 'YARD' ? 'YARD' : (distanceUnit == 'METER' ? 'METER' : null);

    final snapshot = await _firestore
        .collection(_kGolfCourses)
        .doc(golfCourseId)
        .collection(_kCourses)
        .get();

    final docs = snapshot.docs.toList();
    docs.sort((a, b) {
      final aOrder = a.data()['order'] as int?;
      final bOrder = b.data()['order'] as int?;
      if (aOrder != null && bOrder != null) return aOrder.compareTo(bOrder);
      return (a.data()['name'] as String? ?? '').compareTo(b.data()['name'] as String? ?? '');
    });
    return docs.map((d) {
      final data = d.data();
      final compositeId = '$golfCourseId$_kCompositeIdSeparator${d.id}';
      return Course(
        id: compositeId,
        name: data['name'] as String? ?? '',
        region: gcRegion,
        holesCount: (data['holeCount'] as int?) ?? 9,
        status: 'ACTIVE',
        version: 1,
        updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
        distanceUnit: unit,
      );
    }).toList();
  }

  /// 코스 목록 조회 (golfCourses 하위 courses 평탄화, 지역·이름 필터) — 전체 평탄 목록용
  Future<List<Course>> getCourses({
    String? region,
    String? nameQuery,
    int limit = 100,
  }) async {
    final gcSnap = await _firestore
        .collection(_kGolfCourses)
        .where('status', isEqualTo: 'ACTIVE')
        .limit(limit)
        .get();

    final list = <Course>[];
    for (final gcDoc in gcSnap.docs) {
      final gcData = gcDoc.data();
      final gcRegion = gcData['region'] as String? ?? '';
      final gcName = gcData['name'] as String? ?? '';

      final coursesSnap = await _firestore
          .collection(_kGolfCourses)
          .doc(gcDoc.id)
          .collection(_kCourses)
          .get();

      final cDocs = coursesSnap.docs.toList()
        ..sort((a, b) {
          final aOrder = a.data()['order'] as int?;
          final bOrder = b.data()['order'] as int?;
          if (aOrder != null && bOrder != null) return aOrder.compareTo(bOrder);
          return (a.data()['name'] as String? ?? '').compareTo(b.data()['name'] as String? ?? '');
        });

      for (final cDoc in cDocs) {
        final cData = cDoc.data();
        final courseName = cData['name'] as String? ?? '';
        final holeCount = (cData['holeCount'] as int?) ?? 9;
        final compositeId = '${gcDoc.id}$_kCompositeIdSeparator${cDoc.id}';
        list.add(Course(
          id: compositeId,
          name: courseName,
          region: gcRegion,
          holesCount: holeCount,
          status: 'ACTIVE',
          version: 1,
          updatedAt: (cData['updatedAt'] as Timestamp?)?.toDate(),
        ));
      }
    }

    if (region != null && region.isNotEmpty) {
      list.removeWhere((c) => c.region != region);
    }
    if (nameQuery != null && nameQuery.trim().isNotEmpty) {
      final lower = nameQuery.trim().toLowerCase();
      list.retainWhere((c) =>
          c.name.toLowerCase().contains(lower) ||
          c.region.toLowerCase().contains(lower));
    }

    list.sort((a, b) {
      final r = a.region.compareTo(b.region);
      return r != 0 ? r : a.name.compareTo(b.name);
    });
    return list;
  }

  /// 코스 단건 조회 (복합 ID: golfCourseId__courseId)
  Future<Course?> getCourse(String courseId) async {
    if (_isCompositeId(courseId)) {
      final parts = courseId.split(_kCompositeIdSeparator);
      if (parts.length != 2) return null;
      final gcId = parts[0];
      final cId = parts[1];
      final gcDoc = await _firestore.collection(_kGolfCourses).doc(gcId).get();
      if (!gcDoc.exists || gcDoc.data() == null) return null;
      final cDoc = await _firestore
          .collection(_kGolfCourses)
          .doc(gcId)
          .collection(_kCourses)
          .doc(cId)
          .get();
      if (!cDoc.exists || cDoc.data() == null) return null;
      final gcData = gcDoc.data()!;
      final cData = cDoc.data()!;
      final distanceUnit = gcData['distanceUnit'] as String?;
      return Course(
        id: courseId,
        name: cData['name'] as String? ?? '',
        region: gcData['region'] as String? ?? '',
        holesCount: (cData['holeCount'] as int?) ?? 9,
        status: 'ACTIVE',
        version: 1,
        updatedAt: (cData['updatedAt'] as Timestamp?)?.toDate(),
        distanceUnit: distanceUnit == 'YARD' ? 'YARD' : (distanceUnit == 'METER' ? 'METER' : null),
      );
    }

    final doc = await _firestore.collection('courses').doc(courseId).get();
    if (!doc.exists || doc.data() == null) return null;
    return Course.fromMap(doc.id, doc.data()!);
  }

  /// 티셋 목록: admin 구조는 Black/Blue/White/Red 가상 티셋
  Future<List<TeeSet>> getTeeSets(String courseId) async {
    if (_isCompositeId(courseId)) {
      return _kTeeKeys
          .map((k) => TeeSet(
                id: k,
                name: k[0].toUpperCase() + k.substring(1),
              ))
          .toList();
    }

    final snapshot = await _firestore
        .collection('courses')
        .doc(courseId)
        .collection('teesets')
        .orderBy('name')
        .get();

    return snapshot.docs
        .map((d) => TeeSet.fromMap(d.id, d.data()))
        .toList();
  }

  /// 홀 목록 조회 (admin: golfCourses/.../courses/.../holes)
  Future<List<Hole>> getHoles(String courseId) async {
    if (_isCompositeId(courseId)) {
      final parts = courseId.split(_kCompositeIdSeparator);
      if (parts.length != 2) return [];
      final gcId = parts[0];
      final cId = parts[1];
      final snapshot = await _firestore
          .collection(_kGolfCourses)
          .doc(gcId)
          .collection(_kCourses)
          .doc(cId)
          .collection(_kHoles)
          .get();

      final list = snapshot.docs
          .map((d) {
            final data = d.data();
            final dist = data['distances'] as Map<String, dynamic>? ?? {};
            final distances = <String, int>{};
            for (final k in _kTeeKeys) {
              final v = dist[k];
              if (v != null) distances[k] = (v is int) ? v : (v as num).toInt();
            }
            return Hole(
              holeNo: d.id,
              par: (data['par'] as int?) ?? 4,
              handicapIndex: data['handicapIndex'] as int?,
              order: data['order'] as int?,
              distances: distances,
            );
          })
          .toList();
      list.sort((a, b) {
        final na = int.tryParse(a.holeNo) ?? 0;
        final nb = int.tryParse(b.holeNo) ?? 0;
        return na.compareTo(nb);
      });
      return list;
    }

    final snapshot = await _firestore
        .collection('courses')
        .doc(courseId)
        .collection('holes')
        .get();

    final list = snapshot.docs
        .map((d) => Hole.fromMap(d.id, d.data()))
        .toList();
    list.sort((a, b) {
      final na = int.tryParse(a.holeNo) ?? 0;
      final nb = int.tryParse(b.holeNo) ?? 0;
      return na.compareTo(nb);
    });
    return list;
  }

  /// 지역 목록 (golfCourses 기준)
  Future<List<String>> getRegions() async {
    final snapshot = await _firestore
        .collection(_kGolfCourses)
        .where('status', isEqualTo: 'ACTIVE')
        .get();

    final set = <String>{};
    for (final d in snapshot.docs) {
      final r = d.data()['region'] as String?;
      if (r != null && r.isNotEmpty) set.add(r);
    }
    return set.toList()..sort();
  }
}
