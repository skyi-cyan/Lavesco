import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/round.dart';
import '../models/course.dart';
import 'course_service.dart';
import 'invite_service.dart';

/// 라운드 생성·조회·목록·참가 서비스
class RoundService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final CourseService _courseService = CourseService();
  final InviteService _inviteService = InviteService();

  static const String _kRounds = 'rounds';
  static const String _kParticipants = 'participants';

  /// roundNo 중복 여부 조회
  Future<bool> _existsRoundNo(String roundNo) async {
    final snapshot = await _firestore
        .collection(_kRounds)
        .where('roundNo', isEqualTo: roundNo)
        .limit(1)
        .get();
    return snapshot.docs.isNotEmpty;
  }

  /// 중복 없는 4자리 라운드 번호 생성 (1000~9999)
  Future<String> _generateUniqueRoundNo() async {
    const maxAttempts = 100;
    for (var i = 0; i < maxAttempts; i++) {
      final candidate = (Random().nextInt(9000) + 1000).toString();
      final exists = await _existsRoundNo(candidate);
      if (!exists) return candidate;
    }
    throw Exception('사용 가능한 라운드 번호를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  /// 라운드 생성 (등록 폼: 코스, 티타임, 티, 후반코스). 4자리 라운드 번호 랜덤 생성(중복 없음).
  Future<({String roundId, String roundNo})> createRound({
    required String courseId,
    required String courseName,
    required String region,
    required int holesCount,
    DateTime? date,
    String? teeTime,
    String? tee,
    String? backCourseId,
    String? backCourseName,
    String? golfCourseName,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('인증이 필요합니다.');

    final playDate = date ?? DateTime.now();
    final roundNo = await _generateUniqueRoundNo();
    final ref = await _firestore.collection(_kRounds).add({
      'roundNo': roundNo,
      'courseId': courseId,
      'courseName': courseName,
      'region': region,
      'holesCount': holesCount,
      'createdBy': user.uid,
      'status': 'ACTIVE',
      'date': Timestamp.fromDate(playDate),
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
      if (teeTime != null) 'teeTime': teeTime,
      if (tee != null) 'tee': tee,
      if (backCourseId != null) 'backCourseId': backCourseId,
      if (backCourseName != null) 'backCourseName': backCourseName,
      if (golfCourseName != null) 'golfCourseName': golfCourseName,
    });

    await _firestore
        .collection(_kRounds)
        .doc(ref.id)
        .collection(_kParticipants)
        .doc(user.uid)
        .set({
      'joinedAt': FieldValue.serverTimestamp(),
      'displayName': user.displayName ?? user.email ?? '참가자',
    });

    await _addToMyRoundIds(user.uid, ref.id);
    return (roundId: ref.id, roundNo: roundNo);
  }

  /// 라운드 단건 조회
  Future<Round?> getRound(String roundId) async {
    final doc = await _firestore.collection(_kRounds).doc(roundId).get();
    if (!doc.exists || doc.data() == null) return null;
    return Round.fromMap(doc.id, doc.data()!);
  }

  /// 내가 참가한 라운드 목록 (최신순) — users/{uid}/roundIds 보조 컬렉션 사용
  Future<List<Round>> getMyRounds({int limit = 20}) async {
    final user = _auth.currentUser;
    if (user == null) return [];

    final myRoundIdsSnap = await _firestore
        .collection('users')
        .doc(user.uid)
        .collection('roundIds')
        .orderBy('joinedAt', descending: true)
        .limit(limit)
        .get();

    final roundIds = myRoundIdsSnap.docs.map((d) => d.id).toList();
    if (roundIds.isEmpty) return [];

    final rounds = <Round>[];
    for (final id in roundIds) {
      final round = await getRound(id);
      if (round != null) rounds.add(round);
    }
    return rounds;
  }

  /// 사용자 roundIds에 라운드 추가 (생성/참가 시 호출)
  Future<void> _addToMyRoundIds(String uid, String roundId) async {
    await _firestore
        .collection('users')
        .doc(uid)
        .collection('roundIds')
        .doc(roundId)
        .set({'joinedAt': FieldValue.serverTimestamp()});
  }

  /// 라운드 참가자 수
  Future<int> getParticipantCount(String roundId) async {
    final snap = await _firestore
        .collection(_kRounds)
        .doc(roundId)
        .collection(_kParticipants)
        .get();
    return snap.docs.length;
  }

  /// 초대 코드로 라운드 참가
  Future<String> joinRoundByCode(String code) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('인증이 필요합니다.');

    final info = await _inviteService.validateInviteCode(code);
    final roundId = info['roundId'] as String;

    final round = await getRound(roundId);
    if (round == null) throw Exception('라운드를 찾을 수 없습니다.');
    if (!round.isActive) throw Exception('이미 종료된 라운드입니다.');

    final participantRef = _firestore
        .collection(_kRounds)
        .doc(roundId)
        .collection(_kParticipants)
        .doc(user.uid);

    final existing = await participantRef.get();
    if (existing.exists) return roundId;

    await participantRef.set({
      'joinedAt': FieldValue.serverTimestamp(),
      'displayName': user.displayName ?? user.email ?? '참가자',
    });

    await _addToMyRoundIds(user.uid, roundId);
    await _inviteService.useInviteCode(code);
    return roundId;
  }

  /// 초대 코드 생성
  Future<String> generateInviteCode(String roundId) async {
    return _inviteService.generateInviteCode(roundId);
  }

  /// 라운드 종료
  Future<void> finishRound(String roundId) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('인증이 필요합니다.');

    final round = await getRound(roundId);
    if (round == null) throw Exception('라운드를 찾을 수 없습니다.');
    if (round.createdBy != user.uid) throw Exception('라운드 생성자만 종료할 수 있습니다.');

    await _firestore.collection(_kRounds).doc(roundId).update({
      'status': 'FINISHED',
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// 라운드에 사용할 코스 정보 (스코어카드용)
  Future<Course?> getCourseForRound(String courseId) async {
    return _courseService.getCourse(courseId);
  }
}
