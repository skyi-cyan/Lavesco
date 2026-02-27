import 'package:cloud_firestore/cloud_firestore.dart';

/// 사용자 프로필 모델
class UserProfile {
  final String uid;
  final String email;
  final String? displayName;
  final String? nickname;
  final String? photoURL;
  final String? provider; // 'email', 'google', 'apple'
  final int? handicap; // 핸디캡
  final String? defaultTee; // 기본 티셋
  final Map<String, bool>? termsAgreement; // 약관 동의 내역
  final DateTime createdAt;
  final DateTime updatedAt;

  UserProfile({
    required this.uid,
    required this.email,
    this.displayName,
    this.nickname,
    this.photoURL,
    this.provider,
    this.handicap,
    this.defaultTee,
    this.termsAgreement,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'email': email,
      'displayName': displayName,
      'nickname': nickname,
      'photoURL': photoURL,
      'provider': provider,
      'handicap': handicap,
      'defaultTee': defaultTee,
      'termsAgreement': termsAgreement,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory UserProfile.fromMap(Map<String, dynamic> map) {
    return UserProfile(
      uid: map['uid'] as String,
      email: map['email'] as String,
      displayName: map['displayName'] as String?,
      nickname: map['nickname'] as String?,
      photoURL: map['photoURL'] as String?,
      provider: map['provider'] as String?,
      handicap: map['handicap'] as int?,
      defaultTee: map['defaultTee'] as String?,
      termsAgreement: (map['termsAgreement'] as Map<String, dynamic>?)
          ?.map((k, v) => MapEntry(k, v as bool)),
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      updatedAt: (map['updatedAt'] as Timestamp).toDate(),
    );
  }

  UserProfile copyWith({
    String? uid,
    String? email,
    String? displayName,
    String? nickname,
    String? photoURL,
    String? provider,
    int? handicap,
    String? defaultTee,
    Map<String, bool>? termsAgreement,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserProfile(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      nickname: nickname ?? this.nickname,
      photoURL: photoURL ?? this.photoURL,
      provider: provider ?? this.provider,
      handicap: handicap ?? this.handicap,
      defaultTee: defaultTee ?? this.defaultTee,
      termsAgreement: termsAgreement ?? this.termsAgreement,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
