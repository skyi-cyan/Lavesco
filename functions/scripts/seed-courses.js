/**
 * 테스트용 코스 데이터 2개를 Firestore에 넣는 스크립트
 *
 * 실행 방법 (프로젝트 루트에서):
 *   cd functions && node scripts/seed-courses.js
 *
 * 환경 변수 (선택):
 *   GOOGLE_APPLICATION_CREDENTIALS - 서비스 계정 키 JSON 경로
 *   또는 gcloud auth application-default login 후 실행
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'scorecard-app-6f9bd' });
}

const db = admin.firestore();

const now = () => admin.firestore.Timestamp.now();

// 18홀 공통 Par (실제 코스에 맞게 조정 가능)
const defaultPars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 5, 3, 4, 4, 5, 3, 4, 4];
// Blue 티 거리 예시 (야드)
const blueDistances = [380, 520, 165, 530, 400, 380, 195, 410, 520, 390, 540, 170, 430, 380, 500, 155, 420, 400];
const whiteDistances = [360, 490, 150, 500, 380, 360, 180, 390, 490, 370, 510, 155, 410, 360, 480, 140, 400, 380];

function makeHoles(teeIds) {
  const holes = {};
  for (let i = 1; i <= 18; i++) {
    const holeNo = String(i);
    const par = defaultPars[i - 1];
    const distances = {};
    if (teeIds.includes('blue')) distances.blue = blueDistances[i - 1];
    if (teeIds.includes('white')) distances.white = whiteDistances[i - 1];
    holes[holeNo] = {
      par,
      order: i,
      handicapIndex: i <= 9 ? i : i - 9,
      distances,
    };
  }
  return holes;
}

async function seed() {
  const batch = db.batch();

  // 코스 1: 남서울 컨트리클럽
  const course1Id = 'course-namseoul';
  const course1Ref = db.collection('courses').doc(course1Id);
  batch.set(course1Ref, {
    name: '남서울 컨트리클럽',
    region: '경기',
    holesCount: 18,
    status: 'ACTIVE',
    version: 1,
    updatedAt: now(),
  });

  const teesets1 = [
    { id: 'blue', name: 'Blue', gender: 'M', rating: 72.1, slope: 132 },
    { id: 'white', name: 'White', gender: 'M', rating: 70.2, slope: 128 },
  ];
  for (const t of teesets1) {
    batch.set(course1Ref.collection('teesets').doc(t.id), {
      name: t.name,
      gender: t.gender,
      rating: t.rating,
      slope: t.slope,
    });
  }
  const holes1 = makeHoles(['blue', 'white']);
  for (const [holeNo, data] of Object.entries(holes1)) {
    batch.set(course1Ref.collection('holes').doc(holeNo), data);
  }

  // 코스 2: 강남 골프클럽
  const course2Id = 'course-gangnam';
  const course2Ref = db.collection('courses').doc(course2Id);
  batch.set(course2Ref, {
    name: '강남 골프클럽',
    region: '서울',
    holesCount: 18,
    status: 'ACTIVE',
    version: 1,
    updatedAt: now(),
  });

  const teesets2 = [
    { id: 'blue', name: 'Blue', gender: 'M', rating: 71.5, slope: 130 },
    { id: 'white', name: 'White', gender: 'M', rating: 69.8, slope: 126 },
  ];
  for (const t of teesets2) {
    batch.set(course2Ref.collection('teesets').doc(t.id), {
      name: t.name,
      gender: t.gender,
      rating: t.rating,
      slope: t.slope,
    });
  }
  const holes2 = makeHoles(['blue', 'white']);
  for (const [holeNo, data] of Object.entries(holes2)) {
    batch.set(course2Ref.collection('holes').doc(holeNo), data);
  }

  await batch.commit();
  console.log('테스트 코스 2개 추가 완료:', course1Id, course2Id);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
