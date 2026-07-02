import firestore from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { DistanceRecord, DistanceRecordInput } from '../types/distanceRecord';

const USERS_COLLECTION = 'users';
const DISTANCE_RECORDS = 'distanceRecords';

function toDate(value: FirebaseFirestoreTypes.Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

function mapDoc(id: string, data: FirebaseFirestoreTypes.DocumentData): DistanceRecord {
  return {
    id,
    clubId: data.clubId,
    clubLabel: data.clubLabel,
    startLat: data.startLat,
    startLng: data.startLng,
    endLat: data.endLat,
    endLng: data.endLng,
    distanceMeters: data.distanceMeters,
    startAccuracyMeters: data.startAccuracyMeters ?? null,
    endAccuracyMeters: data.endAccuracyMeters ?? null,
    method: data.method ?? 'GPS',
    roundId: data.roundId ?? null,
    golfCourseName: data.golfCourseName ?? null,
    roundDate: data.roundDate ?? null,
    recordedAt: toDate(data.recordedAt) ?? new Date(),
  };
}

export async function fetchDistanceRecords(uid: string): Promise<DistanceRecord[]> {
  const snap = await firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(DISTANCE_RECORDS)
    .orderBy('recordedAt', 'desc')
    .get();

  return snap.docs.map((doc) => mapDoc(doc.id, doc.data()));
}

export async function createDistanceRecord(
  uid: string,
  input: DistanceRecordInput
): Promise<string> {
  const ref = firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(DISTANCE_RECORDS)
    .doc();

  await ref.set({
    ...input,
    recordedAt: firestore.FieldValue.serverTimestamp(),
  });

  return ref.id;
}

export async function deleteDistanceRecord(uid: string, recordId: string): Promise<void> {
  await firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(DISTANCE_RECORDS)
    .doc(recordId)
    .delete();
}
