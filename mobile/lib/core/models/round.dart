import 'package:cloud_firestore/cloud_firestore.dart';

/// 라운드 모델 (Firestore rounds/{roundId})
class Round {
  final String id;
  final String courseId;
  final String courseName;
  final String region;
  final int holesCount;
  final String createdBy;
  final String status; // ACTIVE, FINISHED
  final DateTime? date;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? teeTime;
  final String? tee;
  final String? backCourseId;
  final String? backCourseName;
  /// 라운드 번호 4자리 (등록 시 랜덤 생성)
  final String? roundNo;
  /// 골프장명 (목록 상단 표시용)
  final String? golfCourseName;

  const Round({
    required this.id,
    required this.courseId,
    required this.courseName,
    required this.region,
    this.holesCount = 18,
    required this.createdBy,
    this.status = 'ACTIVE',
    this.date,
    this.createdAt,
    this.updatedAt,
    this.teeTime,
    this.tee,
    this.backCourseId,
    this.backCourseName,
    this.roundNo,
    this.golfCourseName,
  });

  factory Round.fromMap(String id, Map<String, dynamic> map) {
    return Round(
      id: id,
      courseId: map['courseId'] as String? ?? '',
      courseName: map['courseName'] as String? ?? '',
      region: map['region'] as String? ?? '',
      holesCount: (map['holesCount'] as int?) ?? 18,
      createdBy: map['createdBy'] as String? ?? '',
      status: map['status'] as String? ?? 'ACTIVE',
      date: _toDate(map['date']),
      createdAt: _toDate(map['createdAt']),
      updatedAt: _toDate(map['updatedAt']),
      teeTime: map['teeTime'] as String?,
      tee: map['tee'] as String?,
      backCourseId: map['backCourseId'] as String?,
      backCourseName: map['backCourseName'] as String?,
      roundNo: map['roundNo'] as String?,
      golfCourseName: map['golfCourseName'] as String?,
    );
  }

  static DateTime? _toDate(dynamic v) {
    if (v == null) return null;
    if (v is Timestamp) return v.toDate();
    return v as DateTime;
  }

  bool get isActive => status == 'ACTIVE';
}
