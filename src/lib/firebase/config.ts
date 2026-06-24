import { firebaseConfig as defaults, isFirebaseConfigured } from "@/lib/public-config";

export { isFirebaseConfigured };
export const firebaseConfig = defaults;

export const CITY_RUN_STORAGE_ROOT = "city-run";

export function firebaseConsoleStorageUrl() {
  const projectId = defaults.projectId;
  if (!projectId) return "https://console.firebase.google.com/";
  return `https://console.firebase.google.com/project/${projectId}/storage`;
}
