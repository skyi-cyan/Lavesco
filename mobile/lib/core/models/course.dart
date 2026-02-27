/// 코스 모델 (Firestore courses/{courseId})
class Course {
  final String id;
  final String name;
  final String region;
  final int holesCount;
  final String status;
  final int version;
  final DateTime? updatedAt;

  const Course({
    required this.id,
    required this.name,
    required this.region,
    this.holesCount = 18,
    this.status = 'ACTIVE',
    this.version = 1,
    this.updatedAt,
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
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'region': region,
      'holesCount': holesCount,
      'status': status,
      'version': version,
      'updatedAt': updatedAt,
    };
  }
}
