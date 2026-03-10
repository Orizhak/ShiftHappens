/**
 * Typed collection helpers so that every service gets consistent
 * Firestore references without repeating collection names.
 */
import { db } from './admin';
import { FirestoreDataConverter, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';

/** Generic converter that injects the Firestore document id into the typed object */
function makeConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
      const { id: _id, ...rest } = data as any;
      return rest;
    },
    fromFirestore(snap: QueryDocumentSnapshot): T {
      return { id: snap.id, ...snap.data() } as T;
    },
  };
}

// Helper: convert Firestore Timestamps to JS Dates recursively
export function convertTimestamps<T>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj.toDate === 'function') return obj.toDate();
  if (Array.isArray(obj)) return obj.map(convertTimestamps) as any;
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertTimestamps(obj[key]);
    }
    return result;
  }
  return obj;
}

export const collections = {
  users: db.collection('users'),
  groups: db.collection('groups'),
  shifts: db.collection('shifts'),
  requests: db.collection('requests'),
  userGroupPoints: db.collection('userGroupPoints'),
  userCategories: db.collection('userCategories'),
  templates: db.collection('templates'),
} as const;
