import { collections, convertTimestamps } from '../firebase/db';
import { Request as UserRequest, RequestType } from '../types';

export async function getRequestsByUserId(userId: string): Promise<UserRequest[]> {
  const snap = await collections.requests
    .where('userId', '==', userId)
    .get();
  return snap.docs
    .map((d) => convertTimestamps<UserRequest>({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createRequest(data: {
  userId: string;
  startDate: string;
  endDate: string;
  type: RequestType;
  description: string;
}): Promise<UserRequest> {
  const now = new Date();
  const doc: Omit<UserRequest, 'id'> = {
    userId: data.userId,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    type: data.type,
    description: data.description,
    createdAt: now,
  };
  const ref = await collections.requests.add(doc);
  return { id: ref.id, ...doc };
}

export async function deleteRequest(requestId: string, userId: string): Promise<void> {
  const doc = await collections.requests.doc(requestId).get();
  if (!doc.exists) throw new Error('בקשה לא נמצאה');

  const data = doc.data();
  if (data?.userId !== userId) throw new Error('אין הרשאה למחוק בקשה זו');

  await collections.requests.doc(requestId).delete();
}
