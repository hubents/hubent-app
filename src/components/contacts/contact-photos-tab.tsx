"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  RiImageLine,
  RiDeleteBinLine,
  RiAddLine,
} from "@remixicon/react";

interface ContactPhoto {
  id: number;
  url: string;
  thumbnail: string | null;
  caption: string | null;
  sortOrder: number | null;
  uploadedAt: string | null;
}

interface ContactPhotosTabProps {
  photos: ContactPhoto[];
  loading: boolean;
  onAddPhoto: (data: { url: string; thumbnail?: string; caption?: string }) => Promise<unknown>;
  onDeletePhoto: (photoId: number) => Promise<boolean>;
}

export function ContactPhotosTab({
  photos,
  loading,
  onAddPhoto,
  onDeletePhoto,
}: ContactPhotosTabProps) {
  const [showUploader, setShowUploader] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleUpload = async (result: { url: string; name: string }) => {
    await onAddPhoto({ url: result.url });
    setShowUploader(false);
  };

  const handleDelete = async (photoId: number) => {
    if (!confirm("¿Eliminar esta foto?")) return;
    setDeleting(photoId);
    await onDeletePhoto(photoId);
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RiImageLine className="h-5 w-5" />
          <h3 className="text-sm font-medium">Fotos</h3>
          <span className="text-xs">({photos.length})</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploader(!showUploader)}
          className="gap-2"
        >
          <RiAddLine className="h-4 w-4" />
          Subir foto
        </Button>
      </div>

      {showUploader && (
        <FileUploader
          folder="contacts/photos"
          accept="image/*"
          onUpload={handleUpload}
          onError={(error) => console.error("Upload error:", error)}
        />
      )}

      {photos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <RiImageLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Sin fotos aún</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sube tu primera foto
          </p>
          <Button variant="outline" onClick={() => setShowUploader(true)}>
            <RiAddLine className="h-4 w-4 mr-2" />
            Subir foto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden border"
            >
              <img
                src={photo.thumbnail || photo.url}
                alt={photo.caption || "Foto"}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(photo.id)}
                  disabled={deleting === photo.id}
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                </Button>
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 truncate">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
