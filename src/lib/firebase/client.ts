"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig, isFirebaseConfigured } from "@/lib/firebase/config";

let app: FirebaseApp | undefined;
let storage: FirebaseStorage | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Add env vars to .env.local.");
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}
