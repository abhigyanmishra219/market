"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { ListingPhotoInput } from "@/lib/validations/listing";
import { UploadCloud, X, Star, AlertCircle, Loader2 } from "lucide-react";

interface PropertyImageUploaderProps {
  photos: ListingPhotoInput[];
  onChange: (photos: ListingPhotoInput[]) => void;
  maxPhotos?: number;
}

export function PropertyImageUploader({
  photos,
  onChange,
  maxPhotos = 12,
}: PropertyImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      setUploadError(`Maximum ${maxPhotos} photos allowed. Please select fewer images.`);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const newPhotos: ListingPhotoInput[] = [...photos];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Client-side file type validation
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
          throw new Error(`"${file.name}" is not a supported image format. Only JPG, PNG, and WebP are allowed.`);
        }

        // Client-side file size validation (5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" exceeds the 5MB size limit.`);
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/v1/uploads/direct", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || `Failed to upload "${file.name}".`);
        }

        const uploaded = json.data;
        newPhotos.push({
          id: uploaded.id,
          url: uploaded.url,
          key: uploaded.key,
          isPrimary: newPhotos.length === 0, // First photo uploaded is primary by default
          caption: null,
        });
      }

      onChange(newPhotos);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    // If the primary photo was removed, make the new first photo primary
    if (updated.length > 0 && !updated.some((p) => p.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  const setPrimary = (index: number) => {
    const updated = photos.map((p, i) => ({
      ...p,
      isPrimary: i === index,
    }));
    onChange(updated);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-border-subtle hover:border-forest-green hover:bg-light-green/20 rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 group"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading || photos.length >= maxPhotos}
        />
        <div className="w-12 h-12 rounded-full bg-light-green text-forest-green flex items-center justify-center group-hover:scale-105 transition-transform">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-dark-text">
            {isUploading ? "Uploading images..." : "Click or drag images to upload"}
          </p>
          <p className="text-xs text-muted-text mt-0.5">
            PNG, JPG, or WebP up to 5MB each. ({photos.length}/{maxPhotos} uploaded)
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-red-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Uploaded Photos Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
          {photos.map((photo, index) => (
            <div
              key={photo.id || index}
              className="relative group rounded-xl border border-border-subtle bg-white overflow-hidden shadow-xs flex flex-col"
            >
              <div className="relative aspect-4/3 w-full bg-off-white overflow-hidden">
                <Image
                  src={photo.url}
                  alt={photo.caption || `Property photo ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {photo.isPrimary && (
                  <span className="absolute top-2 left-2 rounded-md bg-forest-green text-white text-[10px] font-bold px-2 py-0.5 shadow-sm flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" /> Primary
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(index);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                  title="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2 flex items-center justify-between text-xs border-t border-border-subtle bg-white">
                <span className="text-[11px] text-muted-text">Photo #{index + 1}</span>
                {!photo.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(index)}
                    className="text-[11px] font-semibold text-forest-green hover:underline flex items-center gap-1"
                  >
                    <Star className="w-3 h-3" /> Make Primary
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
