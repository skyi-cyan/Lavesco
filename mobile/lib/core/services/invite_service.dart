import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// 초대 코드 생성 및 관리 서비스
/// 
/// ⚠️ 임시 구현: Functions 없이 클라이언트에서 처리
/// 나중에 Functions 배포 후 서버 측 로직으로 이동 필요
class InviteService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// 고유한 초대 코드 생성 (6자리 영숫자)
  String _generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final random = Random();
    final code = StringBuffer();

    for (int i = 0; i < 6; i++) {
      code.write(chars[random.nextInt(chars.length)]);
    }

    return code.toString();
  }

  /// 초대 코드 생성 및 Firestore에 저장
  /// 
  /// [roundId] 라운드 ID
  /// 
  /// Returns: 생성된 초대 코드
  /// 
  /// Throws: [Exception] 생성 실패 시
  Future<String> generateInviteCode(String roundId) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('인증이 필요합니다.');
    }

    // 고유 코드 생성 (중복 체크)
    String code = _generateUniqueCode();
    bool isUnique = false;
    int attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = _generateUniqueCode();
      
      // Firestore에서 중복 확인
      final doc = await _firestore.collection('invites').doc(code).get();
      if (!doc.exists) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw Exception('초대 코드 생성에 실패했습니다. 다시 시도해주세요.');
    }

    // Firestore에 저장
    await _firestore.collection('invites').doc(code).set({
      'roundId': roundId,
      'createdBy': user.uid,
      'expiresAt': Timestamp.fromDate(
        DateTime.now().add(const Duration(hours: 24)),
      ),
      'maxUses': 8,
      'useCount': 0,
      'active': true,
      'createdAt': FieldValue.serverTimestamp(),
    });

    return code;
  }

  /// 초대 코드 검증
  /// 
  /// [code] 검증할 초대 코드
  /// 
  /// Returns: 초대 정보 (roundId 등)
  /// 
  /// Throws: [Exception] 코드가 유효하지 않을 때
  Future<Map<String, dynamic>> validateInviteCode(String code) async {
    final doc = await _firestore.collection('invites').doc(code).get();

    if (!doc.exists) {
      throw Exception('초대 코드가 존재하지 않습니다.');
    }

    final data = doc.data()!;

    // 만료 확인
    final expiresAt = (data['expiresAt'] as Timestamp).toDate();
    if (DateTime.now().isAfter(expiresAt)) {
      throw Exception('초대 코드가 만료되었습니다.');
    }

    // 활성 상태 확인
    if (data['active'] != true) {
      throw Exception('초대 코드가 비활성화되었습니다.');
    }

    // 사용 횟수 확인
    final useCount = data['useCount'] as int;
    final maxUses = data['maxUses'] as int;
    if (useCount >= maxUses) {
      throw Exception('참가 인원이 가득 찼습니다.');
    }

    // 라운드 상태 확인
    final roundId = data['roundId'] as String;
    final roundDoc = await _firestore.collection('rounds').doc(roundId).get();
    
    if (!roundDoc.exists) {
      throw Exception('라운드를 찾을 수 없습니다.');
    }

    final roundData = roundDoc.data()!;
    if (roundData['status'] == 'FINISHED') {
      throw Exception('이미 종료된 라운드입니다.');
    }

    return {
      'roundId': roundId,
      'code': code,
      'expiresAt': expiresAt,
      'useCount': useCount,
      'maxUses': maxUses,
    };
  }

  /// 초대 코드 사용 (참가 시)
  /// 
  /// [code] 사용할 초대 코드
  Future<void> useInviteCode(String code) async {
    await _firestore.collection('invites').doc(code).update({
      'useCount': FieldValue.increment(1),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}
