/**
 * Firebase Auth 사용자에 admin 커스텀 클레임 부여
 *
 * 사전 준비:
 *   1. Firebase Console → Authentication → 사용자 → 관리자 계정의 UID 복사
 *   2. 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 (JSON 다운로드)
 *
 * PowerShell 실행 예:
 *   cd D:\NewProduct\Lavesco\functions
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *   node scripts/set-admin.js <UID>
 *
 * 확인만 할 때:
 *   node scripts/set-admin.js <UID> --check
 */

const admin = require('firebase-admin');

const uid = process.argv[2];
const checkOnly = process.argv.includes('--check');

if (!uid || uid.startsWith('--')) {
  console.error('Usage: node scripts/set-admin.js <UID> [--check]');
  console.error('Example: node scripts/set-admin.js abc123XYZ --check');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'scorecard-app-6f9bd',
  });
}

async function main() {
  const user = await admin.auth().getUser(uid);
  console.log('User:', user.email || '(no email)', '| UID:', user.uid);
  console.log('Current claims:', user.customClaims || {});

  if (checkOnly) {
    const isAdmin = user.customClaims && user.customClaims.admin === true;
    console.log(isAdmin ? 'OK: admin claim is set.' : 'NO: admin claim is missing.');
    return;
  }

  await admin.auth().setCustomUserClaims(uid, {
    ...(user.customClaims || {}),
    admin: true,
  });

  const updated = await admin.auth().getUser(uid);
  console.log('Updated claims:', updated.customClaims || {});
  console.log('SUCCESS: admin claim set. Ask the user to sign out and sign in again on admin-web.');
}

main().catch((err) => {
  console.error('ERROR:', err.message || err);
  process.exit(1);
});
