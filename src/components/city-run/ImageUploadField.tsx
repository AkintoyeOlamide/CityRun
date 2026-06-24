"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { uploadCityRunFile } from "@/lib/firebase/storage";

type ImageUploadFieldProps = {
  label: string;
  folder: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  optional?: boolean;
};

export function ImageUploadField({
  label,
  folder,
  value,
  onChange,
  optional = true,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    if (!isFirebaseConfigured()) {
      setError("Firebase Storage is not configured.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const { url } = await uploadCityRunFile(file, folder);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-white/80">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleSelect(e.target.files)}
      />

      {value ? (
        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-cr-surface">
          <Image
            src={value}
            alt={label}
            fill
            className="object-cover"
            sizes="400px"
            unoptimized
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading || !isFirebaseConfigured()}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 bg-cr-surface px-4 py-8 text-sm text-white/50 disabled:opacity-40"
        >
          <Camera className="h-6 w-6 text-accent" />
          {uploading
            ? "Uploading…"
            : isFirebaseConfigured()
              ? "Add a photo"
              : "Storage not configured"}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
