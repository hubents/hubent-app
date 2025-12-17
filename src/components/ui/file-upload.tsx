"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { RiUploadCloud2Line, RiFileTextLine, RiCloseLine, RiCheckLine } from "@remixicon/react";
import { Progress } from "./progress";
import { Button } from "./button";

interface FileInfo {
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "completed" | "error";
}

interface FileUploadProps {
  onFileSelect?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  className?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const FileUpload = ({ onFileSelect, accept, multiple = false, maxSize = 10, className }: FileUploadProps) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const simulateUpload = (file: File) => {
    const fileInfo: FileInfo = {
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading"
    };
    
    setFiles(prev => [...prev, fileInfo]);

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, progress: 100, status: "completed" } : f
        ));
      } else {
        setFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, progress } : f
        ));
      }
    }, 200);
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const filesArray = Array.from(fileList);
    filesArray.forEach(file => {
      if (file.size <= maxSize * 1024 * 1024) {
        simulateUpload(file);
      }
    });
    onFileSelect?.(filesArray);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed p-8 transition-all",
          isDragging 
            ? "border-[var(--primary)] bg-[var(--primary)]/5" 
            : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/30"
        )}
      >
        <RiUploadCloud2Line className={cn(
          "mb-4 h-12 w-12 transition-colors",
          isDragging ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
        )} />
        <p className="mb-1 text-sm font-medium">
          {isDragging ? "Suelta los archivos aquí" : "Arrastra archivos o haz clic para subir"}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Máximo {maxSize}MB por archivo
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-4 rounded-[var(--radius)] border border-[var(--border)] p-4 animate-slide-in-bottom"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-[var(--destructive)]/10">
                <RiFileTextLine className="h-5 w-5 text-[var(--destructive)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  {file.status === "completed" ? (
                    <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                      <RiCheckLine className="h-4 w-4" />
                      Completed
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {Math.round(file.progress)}%
                    </span>
                  )}
                </div>
                <Progress 
                  value={file.progress} 
                  className="h-1.5"
                  variant={file.status === "completed" ? "success" : "default"}
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {formatFileSize(file.size * (file.progress / 100))} of {formatFileSize(file.size)}
                </p>
              </div>
              {file.status === "completed" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Change</Button>
                  <Button variant="ghost" size="sm" className="text-[var(--destructive)]" onClick={() => removeFile(file.name)}>
                    Remove
                  </Button>
                </div>
              )}
              {file.status === "uploading" && (
                <button onClick={() => removeFile(file.name)} className="p-1 hover:bg-[var(--muted)] rounded">
                  <RiCloseLine className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { FileUpload };
