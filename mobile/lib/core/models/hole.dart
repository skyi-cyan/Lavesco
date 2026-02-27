/// 홀 모델 (Firestore courses/{courseId}/holes/{holeNo})
class Hole {
  final String holeNo;
  final int par;
  final int? handicapIndex;
  final int? order;
  /// 티별 거리 (teeId -> 거리 야드)
  final Map<String, int> distances;

  const Hole({
    required this.holeNo,
    required this.par,
    this.handicapIndex,
    this.order,
    this.distances = const {},
  });

  factory Hole.fromMap(String holeNo, Map<String, dynamic> map) {
    final distancesRaw = map['distances'] as Map<String, dynamic>? ?? {};
    final distances = <String, int>{};
    for (final e in distancesRaw.entries) {
      final v = e.value;
      if (v is int) {
        distances[e.key] = v;
      } else if (v != null) {
        distances[e.key] = (v as num).toInt();
      }
    }
    return Hole(
      holeNo: holeNo,
      par: (map['par'] as int?) ?? 4,
      handicapIndex: map['handicapIndex'] as int?,
      order: map['order'] as int?,
      distances: distances,
    );
  }

  /// 특정 티의 거리(야드)
  int? distanceForTee(String teeId) => distances[teeId];
}
