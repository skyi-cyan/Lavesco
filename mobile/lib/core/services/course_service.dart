import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/course.dart';
import '../models/tee_set.dart';
import '../models/hole.dart';

/// 코스 조회 서비스 (Firestore 읽기 전용)
class CourseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// 코스 목록 조회 (지역·이름 필터, 클라이언트 정렬)
  Future<List<Course>> getCourses({
    String? region,
    String? nameQuery,
    int limit = 100,
  }) async {
    Query<Map<String, dynamic>> q = _firestore
        .collection('courses')
        .where('status', isEqualTo: 'ACTIVE')
        .limit(limit);

    if (region != null && region.isNotEmpty) {
      q = q.where('region', isEqualTo: region);
    }

    final snapshot = await q.get();
    var list = snapshot.docs
        .map((d) => Course.fromMap(d.id, d.data()))
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

  /// 코스 단건 조회
  Future<Course?> getCourse(String courseId) async {
    final doc = await _firestore.collection('courses').doc(courseId).get();
    if (!doc.exists || doc.data() == null) return null;
    return Course.fromMap(doc.id, doc.data()!);
  }

  /// 티셋 목록 조회
  Future<List<TeeSet>> getTeeSets(String courseId) async {
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

  /// 홀 목록 조회 (홀 번호 순)
  Future<List<Hole>> getHoles(String courseId) async {
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

  /// 지역 목록 (코스에 등록된 지역만, 간단 구현: 목록에서 추출)
  Future<List<String>> getRegions() async {
    final snapshot = await _firestore
        .collection('courses')
        .where('status', isEqualTo: 'ACTIVE')
        .orderBy('region')
        .get();

    final set = <String>{};
    for (final d in snapshot.docs) {
      final r = d.data()['region'] as String?;
      if (r != null && r.isNotEmpty) set.add(r);
    }
    return set.toList()..sort();
  }
}
