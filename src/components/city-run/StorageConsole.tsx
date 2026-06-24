"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  ExternalLink,
  FolderOpen,
  ImageIcon,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { CityRunShell } from "@/components/city-run/CityRunShell";
import {
  CITY_RUN_STORAGE_ROOT,
  firebaseConsoleStorageUrl,
  isFirebaseConfigured,
} from "@/lib/firebase/config";
import {
  deleteCityRunFile,
  listCityRunStorage,
  uploadCityRunFile,
  type StorageFolder,
  type StorageItem,
} from "@/lib/firebase/storage";

const UPLOAD_FOLDERS = [
  { id: "items", label: "Item photos" },
  { id: "proof-of-delivery", label: "Proof of delivery" },
  { id: "misc", label: "Misc" },
] as const;

export function StorageConsole() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentPath, setCurrentPath] = useState(CITY_RUN_STORAGE_ROOT);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [files, setFiles] = useState<StorageItem[]>([]);
  const [uploadFolder, setUploadFolder] = useState<(typeof UPLOAD_FOLDERS)[number]["id"]>("items");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
    setLoading(true);
    setError("");
    try {
      const result = await listCityRunStorage(currentPath);
      setFolders(result.folders);
      setFiles(result.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load storage");
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    if (isFirebaseConfigured()) void load();
  }, [load]);

  async function handleUpload(selected: FileList | null) {
    if (!selected?.length) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      for (const file of Array.from(selected)) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Only image files are allowed.");
        }
        await uploadCityRunFile(file, uploadFolder);
      }
      setMessage(`${selected.length} file(s) uploaded.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(path: string) {
    if (!confirm("Delete this file from storage?")) return;
    setError("");
    try {
      await deleteCityRunFile(path);
      setMessage("File deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <CityRunShell title="Storage" backHref="/cityrun/home">
        <div className="space-y-4 px-4 py-5">
          <p className="text-sm text-white/70">
            Firebase Storage is not configured yet. Add your Firebase web app
            credentials to <code className="text-accent">.env.local</code> and
            restart the dev server.
          </p>
          <SetupSteps />
        </div>
      </CityRunShell>
    );
  }

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <CityRunShell title="Storage" backHref="/cityrun/home">
      <div className="px-4 py-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/50">Firebase Storage console</p>
          <a
            href={firebaseConsoleStorageUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent"
          >
            Open Firebase
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/45">
          <button
            type="button"
            onClick={() => setCurrentPath(CITY_RUN_STORAGE_ROOT)}
            className="rounded-md bg-cr-surface px-2 py-1 hover:text-white"
          >
            city-run
          </button>
          {breadcrumbs.slice(1).map((part, index) => {
            const path = breadcrumbs.slice(0, index + 2).join("/");
            return (
              <span key={path} className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3" />
                <button
                  type="button"
                  onClick={() => setCurrentPath(path)}
                  className="rounded-md bg-cr-surface px-2 py-1 hover:text-white"
                >
                  {part}
                </button>
              </span>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-cr-surface p-4">
          <p className="text-sm font-medium">Upload images</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {UPLOAD_FOLDERS.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setUploadFolder(folder.id)}
                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                  uploadFolder === folder.id
                    ? "bg-accent text-white"
                    : "bg-cr-surface-muted text-white/60"
                }`}
              >
                {folder.label}
              </button>
            ))}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Choose images"}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-medium">
            {folders.length} folder(s) · {files.length} file(s)
          </p>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}

        {loading && <p className="mt-4 text-sm text-white/50">Loading…</p>}

        {!loading && folders.length > 0 && (
          <ul className="mt-4 space-y-2">
            {folders.map((folder) => (
              <li key={folder.path}>
                <button
                  type="button"
                  onClick={() => setCurrentPath(folder.path)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-cr-surface-muted px-4 py-3 text-left"
                >
                  <FolderOpen className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">{folder.name}</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-white/30" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {!loading && files.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {files.map((file) => (
              <li
                key={file.path}
                className="overflow-hidden rounded-xl border border-white/10 bg-cr-surface-muted"
              >
                <div className="relative aspect-square bg-black/20">
                  <Image
                    src={file.url}
                    alt={file.name}
                    fill
                    className="object-cover"
                    sizes="200px"
                    unoptimized
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-medium">{file.name}</p>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md bg-accent/20 px-2 py-1 text-[0.65rem] font-medium text-accent"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(file.path)}
                      className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[0.65rem] font-medium text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && folders.length === 0 && files.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center text-white/45">
            <ImageIcon className="h-10 w-10" />
            <p className="text-sm">No files in this folder yet.</p>
            <Link href="/cityrun/send" className="text-sm text-accent">
              Create a delivery with a photo →
            </Link>
          </div>
        )}

        <SetupSteps compact />
      </div>
    </CityRunShell>
  );
}

function SetupSteps({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="mt-8 text-xs text-white/35">
        Deploy rules from <code>firebase/storage.rules</code> in Firebase Console
        → Storage → Rules.
      </p>
    );
  }

  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-white/60">
      <li>
        Create a project at{" "}
        <a
          href="https://console.firebase.google.com/"
          className="text-accent"
          target="_blank"
          rel="noopener noreferrer"
        >
          Firebase Console
        </a>
      </li>
      <li>Enable Storage and copy your web app config into <code>.env.local</code></li>
      <li>Paste rules from <code>firebase/storage.rules</code></li>
      <li>Restart <code>yarn dev</code></li>
    </ol>
  );
}
