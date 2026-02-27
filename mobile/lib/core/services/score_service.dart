import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// 스코어 관리 및 집계 서비스
/// 
/// ⚠️ 임시 구현: Functions 없이 클라이언트에서 집계 처리
/// 나중에 Functions 트리거로 자동화 필요
class ScoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// 스코어 집계 결과
  class Aggregates {
    final int totalOut;
    final int totalIn;
    final int total;
    final int holesEntered;

    Aggregates({
      required this.totalOut,
      required this.totalIn,
      required this.total,
      required this.holesEntered,
    });
  }

  /// 홀별 스코어 데이터에서 집계 계산
  /// 
  /// [holes] 홀별 스코어 맵 (키: 홀 번호 '1'~'18', 값: HoleData)
  Aggregates calculateAggregates(Map<String, dynamic> holes) {
    int totalOut = 0;
    int totalIn = 0;
    int total = 0;
    int holesEntered = 0;

    holes.forEach((holeNo, holeData) {
      final holeNum = int.tryParse(holeNo) ?? 0;
      final strokes = (holeData as Map<String, dynamic>?)?['strokes'] as int? ?? 0;

      if (strokes > 0 && holeNum > 0) {
        holesEntered++;
        total += strokes;

        if (holeNum <= 9) {
          totalOut += strokes;
        } else {
          totalIn += strokes;
        }
      }
    });

    return Aggregates(
      totalOut: totalOut,
      totalIn: totalIn,
      total: total,
      holesEntered: holesEntered,
    );
  }

  /// 스코어 저장 및 집계 업데이트
  /// 
  /// [roundId] 라운드 ID
  /// [holes] 홀별 스코어 데이터
  /// 
  /// Throws: [Exception] 저장 실패 시
  Future<void> saveScore(String roundId, Map<String, dynamic> holes) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('인증이 필요합니다.');
    }

    // 집계 계산
    final aggregates = calculateAggregates(holes);

    // 트랜잭션으로 스코어 저장 및 집계 업데이트
    await _firestore.runTransaction((transaction) async {
      // 스코어 저장
      final scoreRef = _firestore
          .collection('rounds')
          .doc(roundId)
          .collection('scores')
          .doc(user.uid);

      transaction.set(
        scoreRef,
        {
          'holes': holes,
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true),
      );

      // participants 문서 업데이트 (집계 데이터)
      final participantRef = _firestore
          .collection('rounds')
          .doc(roundId)
          .collection('participants')
          .doc(user.uid);

      transaction.set(
        participantRef,
        {
          'totalOut': aggregates.totalOut,
          'totalIn': aggregates.totalIn,
          'total': aggregates.total,
          'holesEntered': aggregates.holesEntered,
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true),
      );
    });
  }

  /// 특정 홀의 스코어 업데이트
  /// 
  /// [roundId] 라운드 ID
  /// [holeNo] 홀 번호 (1~18)
  /// [holeData] 홀 데이터 (strokes, putts, fairway 등)
  Future<void> updateHoleScore(
    String roundId,
    int holeNo,
    Map<String, dynamic> holeData,
  ) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('인증이 필요합니다.');
    }

    // 현재 스코어 가져오기
    final scoreRef = _firestore
        .collection('rounds')
        .doc(roundId)
        .collection('scores')
        .doc(user.uid);

    final scoreDoc = await scoreRef.get();
    final currentHoles = scoreDoc.exists
        ? (scoreDoc.data()?['holes'] as Map<String, dynamic>? ?? {})
        : <String, dynamic>{};

    // 해당 홀 업데이트
    currentHoles[holeNo.toString()] = holeData;

    // 전체 스코어 저장 및 집계
    await saveScore(roundId, currentHoles);
  }

  /// 스코어 조회
  /// 
  /// [roundId] 라운드 ID
  /// [uid] 사용자 ID (null이면 현재 사용자)
  /// 
  /// Returns: 홀별 스코어 데이터
  Future<Map<String, dynamic>> getScore(String roundId, {String? uid}) async {
    final targetUid = uid ?? _auth.currentUser?.uid;
    if (targetUid == null) {
      throw Exception('인증이 필요합니다.');
    }

    final scoreDoc = await _firestore
        .collection('rounds')
        .doc(roundId)
        .collection('scores')
        .doc(targetUid)
        .get();

    if (!scoreDoc.exists) {
      return {};
    }

    return (scoreDoc.data()?['holes'] as Map<String, dynamic>? ?? {});
  }
}
