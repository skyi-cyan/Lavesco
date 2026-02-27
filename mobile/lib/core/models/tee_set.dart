/// 티셋 모델 (Firestore courses/{courseId}/teesets/{teeId})
class TeeSet {
  final String id;
  final String name;
  final String? gender;
  final double? rating;
  final double? slope;

  const TeeSet({
    required this.id,
    required this.name,
    this.gender,
    this.rating,
    this.slope,
  });

  factory TeeSet.fromMap(String id, Map<String, dynamic> map) {
    return TeeSet(
      id: id,
      name: map['name'] as String? ?? '',
      gender: map['gender'] as String?,
      rating: (map['rating'] as num?)?.toDouble(),
      slope: (map['slope'] as num?)?.toDouble(),
    );
  }
}
