import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

function getStorageBucket() {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    (getProjectId() ? `${getProjectId()}.appspot.com` : undefined)
  );
}

function getCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    return cert(JSON.parse(serviceAccountJson));
  }

  return applicationDefault();
}

function ensureAdminApp() {
  if (!getApps().length) {
    initializeApp({
      credential: getCredential(),
      projectId: getProjectId(),
      storageBucket: getStorageBucket(),
    });
  }
}

export function getAdminDb() {
  ensureAdminApp();
  return getFirestore();
}

export function getAdminBucket() {
  ensureAdminApp();
  return getStorage().bucket(getStorageBucket());
}
