/// 코스 모델 (Firestore courses/{courseId} 또는 golfCourses 하위)
class Course {
  final String id;
  final String name;
  final String region;
  final int holesCount;
  final String status;
  final int version;
  final DateTime? updatedAt;
  /// 거리 단위: METER | YARD (골프장에서 상속, admin-web과 동일)
  final String? distanceUnit;

  const Course({
    required this.id,
    required this.name,
    required this.region,
    this.holesCount = 18,
    this.status = 'ACTIVE',
    this.version = 1,
    this.updatedAt,
    this.distanceUnit,
  });

  factory Course.fromMap(String id, Map<String, dynamic> map) {
    return Course(
      id: id,
      name: map['name'] as String? ?? '',
      region: map['region'] as String? ?? '',
      holesCount: (map['holesCount'] as int?) ?? 18,
      status: map['status'] as String? ?? 'ACTIVE',
      version: (map['version'] as int?) ?? 1,
      updatedAt: map['updatedAt'] != null
          ? (map['updatedAt'] as dynamic).toDate() as DateTime
          : null,
      distanceUnit: map['distanceUnit'] as String?,
    );
  }

  String get distanceUnitLabel => distanceUnit == 'YARD' ? 'Yard (yd)' : 'Meter (m)';
  String get distanceUnitShort => distanceUnit == 'YARD' ? 'yd' : 'm';

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'region': region,
      'holesCount': holesCount,
      'status': status,
      'version': version,
      'updatedAt': updatedAt,
      if (distanceUnit != null) 'distanceUnit': distanceUnit,
    };
  }
}
