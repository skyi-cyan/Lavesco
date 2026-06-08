# 앱스토어 등록 자료 준비 가이드 (Lavesco)

Apple App Store와 Google Play에 앱을 등록하기 위해 준비할 항목과 권장 순서를 정리한 문서입니다.

---

## 1. 사전 결정 (스토어 계정·식별자)

| 항목 | Apple | Google |
|------|--------|--------|
| 개발자 계정 | [Apple Developer Program](https://developer.apple.com/programs/) (유료) | [Google Play Console](https://play.google.com/console) (일회성 등록비) |
| 앱 ID | Bundle ID 확정 (예: `com.lavesco.app`) | 패키지명을 iOS와 동일하게 유지하는 것을 권장 |
| 서명·빌드 | 인증서, 프로비저닝, App Store Connect에서 앱 생성 | Play App Signing, 내부 테스트 트랙 |

**체크리스트**

- [ ] Apple Developer Program 가입·결제
- [ ] Google Play Console 개발자 계정 생성·등록비 결제
- [ ] Bundle ID / Android `applicationId` 확정 및 스토어 앱 레코드 생성
- [ ] 실제 빌드의 식별자가 스토어 설정과 일치하는지 확인

---

## 2. 필수 그래픽 자산

- **앱 아이콘:** 스토어별 규격 PNG(배경 투명 없음). iOS는 Asset Catalog, Android는 Play용 512×512 등.
- **스크린샷:** 기기·해상도 요구가 스토어마다 다름. 최신 규격은 공식 문서를 확인할 것.
  - Apple: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications)
  - Google: [Graphic assets](https://support.google.com/googleplay/android-developer/answer/9866151)
- **기능 그래픽 (Google Play):** 1024×500 배너.
- **프로모션 이미지:** 선택 사항이지만 전환에 도움이 될 수 있음.

**체크리스트**

- [ ] iPhone용 스크린샷 세트 (필수 해상도)
- [ ] iPad 지원 시 iPad용 스크린샷
- [ ] Android 폰(및 태블릿 지원 시) 스크린샷 세트
- [ ] Play 기능 그래픽
- [ ] 스토어용 아이콘 최종본

**다국어**

- [ ] 스크린샷에 문구를 넣을지, 스토어 텍스트만 다국어로 할지 결정

---

## 3. 스토어 메타데이터 (텍스트)

- 앱 이름 (글자 수 제한 준수)
- 짧은 설명 (Play: 80자)
- 전체 설명 (기능, 대상 사용자, 차별점)
- 키워드 (iOS 전용 필드 활용, Play는 설명에 자연스럽게)
- 카테고리·연령 등급
- 지원 URL·문의 이메일
- **개인정보처리방침 URL** (수집 데이터와 반드시 일치)

**체크리스트**

- [ ] 한글 초안
- [ ] 영문 초안 (글로벌 배포 시)
- [ ] 법무·마케팅 검토

---

## 4. 개인정보·법무·정책

- **개인정보처리방침:** 실제 수집·전송·제3자 제공 데이터와 일치해야 함.
- **Apple:** [App Privacy](https://developer.apple.com/app-store/app-privacy-details/)에 맞춰 Privacy Nutrition Labels 입력.
- **Google:** [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469) 양식 작성.
- **권한:** 카메라, 위치, 알림 등 — 스토어 설명·앱 내 설명과 동일하게 유지.

**체크리스트**

- [ ] 앱·서버·SDK 기준 수집 데이터 목록 정리
- [ ] 개인정보처리방침 게시 및 URL 확정
- [ ] App Store Connect 개인정보 질문지 작성
- [ ] Play Console 데이터 안전 양식 작성

---

## 5. 빌드·기술

- [ ] 버전명·빌드 번호 규칙 정의
- [ ] 릴리스 빌드 (난독화/ProGuard·R8 규칙 점검)
- [ ] 내부·비공개 테스트 트랙으로 실기기 검증
- [ ] 크래시·ANR 모니터링 도구 검토 (예: Firebase Crashlytics)

---

## 6. Apple App Store 전용

- [ ] App Store Connect: 앱 정보, 스크린샷, 연령, 심사 정보 입력
- [ ] **앱 심사 노트:** 로그인 필요 시 데모 계정·절차 명시
- [ ] Export Compliance / 암호화 관련 질문 답변
- [ ] 광고·추적 사용 시 App Tracking Transparency(ATT) 문구 및 흐름

---

## 7. Google Play 전용

- [ ] 콘텐츠 등급 설문 (IARC 등)
- [ ] 대상 연령·가족 정책 해당 여부 명확히 선택
- [ ] 데이터 안전 + 광고 ID·광고 여부 선언

---

## 8. 권장 일정 (순서)

1. 개발자 계정 개설·결제 완료
2. Bundle ID / 패키지명 고정 + 스토어에 앱 생성
3. 개인정보·데이터 수집 목록화 → 방침 URL + Apple/Google 양식 초안
4. 스크린샷·아이콘·기능 그래픽 제작
5. 스토어 문구(이름, 설명, 심사 노트) 확정
6. 릴리스 빌드 업로드 → 내부/비공개 테스트
7. 프로덕션 제출 → 심사 피드백 대응

---

## 9. Lavesco 프로젝트에서 바로 할 일

- `mobile-rn` 기준으로 **표시 이름**, **Bundle ID / applicationId**, **권한**, **포함 SDK**를 `AndroidManifest`, `Info.plist`, Gradle 등에서 목록화한다.
- 핵심 사용자 시나리오(예: 라운드·스코어 등) 기준 **스크린샷 스토리보드** 5~8장을 정한다.
- 로그인·유료 기능이 있으면 **심사용 데모 계정**과 테스트 절차를 문서로 남긴다.

---

## 참고 링크

- Apple App Store Connect: https://appstoreconnect.apple.com
- Google Play Console: https://play.google.com/console
- Apple 스크린샷 규격: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
- Google 그래픽 자산: https://support.google.com/googleplay/android-developer/answer/9866151
- Apple App Privacy: https://developer.apple.com/app-store/app-privacy-details/
- Google Data safety: https://support.google.com/googleplay/android-developer/answer/10787469

---

*문서 버전: 초안 — 스토어 정책은 수시로 바뀌므로 제출 전 공식 가이드를 다시 확인할 것.*
