import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/round.dart';
import 'round_service.dart';
import 'score_service.dart';

final roundServiceProvider = Provider<RoundService>((ref) {
  return RoundService();
});

final scoreServiceProvider = Provider<ScoreService>((ref) {
  return ScoreService();
});

/// 내 라운드 목록
final myRoundsProvider = FutureProvider<List<Round>>((ref) async {
  final service = ref.watch(roundServiceProvider);
  return service.getMyRounds();
});

/// 라운드 단건
final roundDetailProvider = FutureProvider.family<Round?, String>((ref, roundId) async {
  final service = ref.watch(roundServiceProvider);
  return service.getRound(roundId);
});

/// 라운드 참가자 수
final roundParticipantCountProvider = FutureProvider.family<int, String>((ref, roundId) async {
  final service = ref.watch(roundServiceProvider);
  return service.getParticipantCount(roundId);
});

/// 내 스코어 (라운드별)
final myScoreProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, roundId) async {
  final service = ref.watch(scoreServiceProvider);
  return service.getScore(roundId);
});
