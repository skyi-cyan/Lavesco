# Firestore 규칙 시뮬레이션 방법 (규칙 재생)

프로필 저장 시 권한 문제가 있는지 확인하려면 Firebase Console에서 **규칙 재생(시뮬레이션)**으로 쓰기를 테스트할 수 있습니다.

---

## 1. Firebase Console 접속

1. 브라우저에서 [Firebase Console](https://console.firebase.google.com/) 접속
2. 사용 중인 **프로젝트** 선택 (예: Lavesco / scorecard-app 등)
3. 왼쪽 메뉴에서 **Build** → **Firestore Database** 클릭
4. 상단 탭에서 **규칙(Rules)** 선택

---

## 2. 규칙 재생(시뮬레이션) 열기

1. 규칙 편집 화면 **위쪽** 또는 **오른쪽**에 있는 **"규칙 재생"** 또는 **"규칙 플레이그라운드"** / **"Rules Playground"** 버튼 클릭  
   - (영문 콘솔: **Rules Playground**)
2. 시뮬레이션 패널이 열리면 아래 단계대로 입력합니다.

---

## 3. 시뮬레이션 값 입력

### 3-1. 위치(경로) 설정

- **위치** / **Location** / **Path** 입력란에 아래처럼 입력합니다.

  ```
  /users/여기에_실제_uid_입력
  ```

- **실제 uid 확인 방법**
  - **방법 A (앱에서)**  
    - 앱에서 로그인한 뒤, 프로필 화면 등에서 `user.uid`를 임시로 화면에 표시하거나  
    - `console.log(auth().currentUser?.uid)` 로그를 보고 복사
  - **방법 B (Firebase Console)**  
    - **Authentication** → **Users** 탭에서 해당 사용자 행 클릭  
    - **User UID** 값 복사 (예: `xYz123AbC456...`)

- 예시 (uid가 `abc123xyz` 인 경우):
  ```
  /users/abc123xyz
  ```

### 3-2. 작업 유형 선택

- **쓰기** / **Write** / **update** 또는 **create** 선택  
  - "쓰기"가 하나만 있으면 그걸 선택  
  - **create**, **update**, **delete**가 따로 있으면 **update** 선택 (프로필 수정은 update에 해당)

### 3-3. 인증 시뮬레이션 (중요)

규칙이 `request.auth.uid == uid` 를 검사하므로, **인증된 사용자**로 시뮬레이션해야 합니다.

- **인증된 사용자로 시뮬레이션**
  - "인증된 사용자로 시뮬레이션" / **"Authenticated"** 같은 옵션을 **사용**으로 둡니다.
  - **UID** 입력란에 **위에서 쓴 것과 동일한 uid**를 넣습니다.  
    - 경로: `/users/abc123xyz`  
    - 시뮬레이션 UID: `abc123xyz`  
    → 이렇게 해야 `request.auth.uid == uid` 가 **true**가 됩니다.

- **비인증으로 시뮬레이션**
  - "비인증" / **"Unauthenticated"** 로 두면 규칙에서 `request.auth != null` 이 false가 되어 **거부**됩니다.  
  - 규칙에 `request.auth != null` 검사가 있어야 비인증 시 "Null value error" 없이 **거부**만 됩니다.

---

## 4. 시뮬레이션 실행 및 결과 확인

1. **"시뮬레이션 실행"** / **"Run"** / **"Simulate"** 버튼 클릭
2. 결과 확인
   - **허용** / **Allow** / **Allowed**  
     → 이 경로·조건에서는 쓰기가 허용됨. 규칙 자체는 정상.
   - **거부** / **Deny** / **Denied**  
     → 이 경로·인증 조합에서는 쓰기가 거부됨. UID가 경로의 uid와 같은지, 인증 UID 입력이 맞는지 다시 확인.

---

## 5. 체크리스트 (쓰기가 허용되려면)

- [ ] **위치(경로)** 가 `users/(실제 uid)` 형식인가?
- [ ] **쓰기(update 또는 write)** 를 선택했는가?
- [ ] **인증된 사용자**로 시뮬레이션했는가?
- [ ] 시뮬레이션에 넣은 **UID**가 **경로의 uid와 동일**한가?  
  - 경로: `/users/abc123xyz` → 시뮬레이션 UID: `abc123xyz`

---

## 6. 참고: 규칙 재생 UI가 다른 경우

Firebase Console 버전에 따라 문구가 조금 다를 수 있습니다.

- **경로**: "리소스 경로", "Document path", "Path"
- **작업**: "읽기" / "쓰기", "get" / "set" / "update" / "delete"
- **인증**: "인증 모드", "Authentication", "Simulate with authenticated user"
- **UID**: "사용자 UID", "User UID", "Custom auth token" 등

쓰기 테스트라면 **경로 = `/users/(본인 uid)`**, **작업 = 쓰기(update)**, **인증 = 해당 uid로 인증** 이 세 가지만 맞추면 됩니다.

이렇게 시뮬레이션했을 때 **허용**이 나오면, 규칙 상으로는 해당 경로에 대한 쓰기가 가능한 상태입니다. 실제 앱에서만 실패한다면 네트워크·타임아웃·토큰 전달 등 다른 원인을 의심할 수 있습니다.
