import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

// The credentials from Vercel environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
};

// Check if all required environment variables are present
if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  throw new Error('Firebase Admin environment variables are not set. Please add them to your Vercel project settings.');
}

// Format the private key correctly
const formattedPrivateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');

if (getApps().length === 0) {
  app = initializeApp({
    credential: cert({
      ...serviceAccount,
      privateKey: formattedPrivateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
} else {
  app = getApps()[0];
}

const adminDb = getFirestore(app);
const adminAuth = getAuth(app);
// Correctly export the storage bucket instance
const adminStorage = getStorage(app).bucket();

export { adminDb, adminAuth, adminStorage, FieldValue };
