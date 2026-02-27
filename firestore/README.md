# Firestore 설정

Firestore 보안 규칙 및 인덱스 설정

## 파일 구조

- `rules/firestore.rules`: Firestore 보안 규칙
- `indexes/firestore.indexes.json`: Firestore 복합 인덱스 설정

## 배포

Firebase CLI를 사용하여 배포:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

또는 `firebase.json`에서 설정 후:

```bash
firebase deploy
```
