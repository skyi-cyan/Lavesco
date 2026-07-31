/**
 * users/{uid}.roundCount 를 roundIds 서브컬렉션 문서 수로 백필합니다.
 *
 * PowerShell 예:
 *   cd D:\NewProduct\Lavesco\functions
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *   node scripts/backfill-round-count.js
 *   node scripts/backfill-round-count.js --dry-run
 */

const admin = require('firebase-admin');

const dryRun = process.argv.includes('--dry-run');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'scorecard-app-6f9bd',
  });
}

const db = admin.firestore();

async function main() {
  const usersSnap = await db.collection('users').get();
  console.log(`Users: ${usersSnap.size}${dryRun ? ' (dry-run)' : ''}`);

  let updated = 0;
  for (const userDoc of usersSnap.docs) {
    const roundIdsSnap = await userDoc.ref.collection('roundIds').get();
    const roundCount = roundIdsSnap.size;
    const current = userDoc.data().roundCount;
    if (current === roundCount) continue;

    console.log(`${userDoc.id}: ${current ?? '(missing)'} -> ${roundCount}`);
    if (!dryRun) {
      await userDoc.ref.set(
        {
          roundCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    updated += 1;
  }

  console.log(dryRun ? `Would update ${updated} users.` : `Updated ${updated} users.`);
}

main().catch((err) => {
  console.error('ERROR:', err.message || err);
  process.exit(1);
});
