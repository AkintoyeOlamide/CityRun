"use client";

import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
  type UploadMetadata,
} from "firebase/storage";
import { CITY_RUN_STORAGE_ROOT } from "@/lib/firebase/config";
import { getFirebaseStorage } from "@/lib/firebase/client";

export type StorageItem = {
  name: string;
  path: string;
  url: string;
  folder: string;
};

export type StorageFolder = {
  name: string;
  path: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadCityRunFile(
  file: File,
  folder: string,
  metadata?: UploadMetadata,
): Promise<{ path: string; url: string }> {
  const storage = getFirebaseStorage();
  const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const path = `${CITY_RUN_STORAGE_ROOT}/${folder}/${safeName}`;
  const fileRef = ref(storage, path);

  await uploadBytes(fileRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
    },
    ...metadata,
  });

  const url = await getDownloadURL(fileRef);
  return { path, url };
}

export async function listCityRunStorage(prefix = CITY_RUN_STORAGE_ROOT): Promise<{
  folders: StorageFolder[];
  files: StorageItem[];
}> {
  const storage = getFirebaseStorage();
  const rootRef = ref(storage, prefix);
  const result = await listAll(rootRef);

  const folders: StorageFolder[] = result.prefixes.map((folderRef) => ({
    name: folderRef.name,
    path: folderRef.fullPath,
  }));

  const files = await Promise.all(
    result.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef);
      const parts = itemRef.fullPath.split("/");
      const folder = parts.slice(0, -1).join("/");

      return {
        name: itemRef.name,
        path: itemRef.fullPath,
        url,
        folder,
      };
    }),
  );

  files.sort((a, b) => b.name.localeCompare(a.name));

  return { folders, files };
}

export async function deleteCityRunFile(path: string) {
  const storage = getFirebaseStorage();
  await deleteObject(ref(storage, path));
}
