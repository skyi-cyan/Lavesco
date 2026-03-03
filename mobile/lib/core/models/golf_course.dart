/// 골프장 모델 (Firestore golfCourses/{id})
class GolfCourse {
  final String id;
  final String name;
  final String region;
  final String status;
  /// 거리 단위: METER | YARD (admin-web과 동일)
  final String? distanceUnit;

  const GolfCourse({
    required this.id,
    required this.name,
    required this.region,
    this.status = 'ACTIVE',
    this.distanceUnit,
  });

  factory GolfCourse.fromMap(String id, Map<String, dynamic> map) {
    final du = map['distanceUnit'] as String?;
    return GolfCourse(
      id: id,
      name: map['name'] as String? ?? '',
      region: map['region'] as String? ?? '',
      status: map['status'] as String? ?? 'ACTIVE',
      distanceUnit: du == 'YARD' || du == 'METER' ? du : null,
    );
  }

  String get distanceUnitLabel => distanceUnit == 'YARD' ? 'Yard (yd)' : 'Meter (m)';
  String get distanceUnitShort => distanceUnit == 'YARD' ? 'yd' : 'm';
}
