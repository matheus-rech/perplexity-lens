import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from './config';

let app;
if (!getApps().length) {
  app = initializeApp(FIREBASE_CONFIG);
} else {
  app = getApps()[0];
}

export const db = getFirestore(app); 