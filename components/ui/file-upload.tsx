"use client";

import * as React from "react";
import { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  File,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/formatters";

// ============================================
// TYPES
// ============================================

export interface FileWithPreview extends File {
  preview?: string;
}

interface UploadedFile {
  id: string;
  file: FileWithPreview;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  url?: string;
}

interface FileUploadProps {
  /** Callback lors de la sélection de fichiers */
  onFilesSelect?: (files: File[]) => void;
  /** Callback lors de l'upload */
  onUpload?: (file: File) => Promise<{ url: string } | void>;
  /** Callback lors de la suppression */
  onRemove?: (file: File) => void;
  /** Types de fichiers acceptés */
  accept?: string;
  /** Nombre maximum de fichiers */
  maxFiles?: number;
  /** Taille maximum par fichier (en bytes) */
  maxSize?: number;
  /** Permettre plusieurs fichiers */
  multiple?: boolean;
  /** Désactiver l'upload */
  disabled?: boolean;
  /** Upload automatique à la sélection */
  autoUpload?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
  /** Afficher les aperçus pour les images */
  showPreviews?: boolean;
  /** Fichiers existants */
  value?: File[];
}

// ============================================
// HELPERS
// ============================================

function getFileIcon(file: File) {
  const type = file.type;

  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo;
  if (type.startsWith("audio/")) return FileAudio;
  if (type.includes("spreadsheet") || type.includes("excel")) return FileSpreadsheet;
  if (type.includes("pdf") || type.includes("document") || type.includes("text"))
    return FileText;

  return File;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function validateFile(
  file: File,
  accept?: string,
  maxSize?: number
): string | null {
  // Vérifier le type
  if (accept) {
    const acceptedTypes = accept.split(",").map((t) => t.trim());
    const fileType = file.type;
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

    const isAccepted = acceptedTypes.some((type) => {
      if (type.startsWith(".")) {
        return fileExtension === type.toLowerCase();
      }
      if (type.endsWith("/*")) {
        return fileType.startsWith(type.replace("/*", "/"));
      }
      return fileType === type;
    });

    if (!isAccepted) {
      return `Type de fichier non autorisé: ${file.type || fileExtension}`;
    }
  }

  // Vérifier la taille
  if (maxSize && file.size > maxSize) {
    return `Fichier trop volumineux (max: ${formatFileSize(maxSize)})`;
  }

  return null;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Composant d'upload de fichiers avec drag & drop
 *
 * @example
 * ```tsx
 * // Simple
 * <FileUpload
 *   onFilesSelect={(files) => console.log(files)}
 *   accept="image/*"
 *   maxSize={5 * 1024 * 1024}
 * />
 *
 * // Avec upload automatique
 * <FileUpload
 *   autoUpload
 *   onUpload={async (file) => {
 *     const formData = new FormData();
 *     formData.append("file", file);
 *     const res = await fetch("/api/upload", { method: "POST", body: formData });
 *     return await res.json();
 *   }}
 * />
 *
 * // Multiple fichiers
 * <FileUpload
 *   multiple
 *   maxFiles={5}
 *   accept=".pdf,.doc,.docx"
 * />
 * ```
 */
export function FileUpload({
  onFilesSelect,
  onUpload,
  onRemove,
  accept,
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024, // 10MB par défaut
  multiple = false,
  disabled = false,
  autoUpload = false,
  className,
  showPreviews = true,
  value,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialiser avec les fichiers existants
  React.useEffect(() => {
    if (value && value.length > 0) {
      setFiles(
        value.map((file) => ({
          id: generateId(),
          file: file as FileWithPreview,
          status: "success" as const,
          progress: 100,
        }))
      );
    }
  }, [value]);

  // Gérer l'ajout de fichiers
  const handleFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(newFiles);

      // Vérifier le nombre de fichiers
      if (!multiple && fileArray.length > 1) {
        setError("Un seul fichier autorisé");
        return;
      }

      if (files.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} fichier(s) autorisé(s)`);
        return;
      }

      // Valider et préparer les fichiers
      const validFiles: UploadedFile[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file, accept, maxSize);

        if (validationError) {
          setError(validationError);
          continue;
        }

        const fileWithPreview = file as FileWithPreview;

        // Créer un aperçu pour les images
        if (showPreviews && file.type.startsWith("image/")) {
          fileWithPreview.preview = URL.createObjectURL(file);
        }

        validFiles.push({
          id: generateId(),
          file: fileWithPreview,
          status: autoUpload ? "pending" : "success",
          progress: autoUpload ? 0 : 100,
        });
      }

      if (validFiles.length === 0) return;

      // Si pas multiple, remplacer les fichiers existants
      if (!multiple) {
        // Nettoyer les aperçus existants
        files.forEach((f) => {
          if (f.file.preview) {
            URL.revokeObjectURL(f.file.preview);
          }
        });
        setFiles(validFiles);
      } else {
        setFiles((prev) => [...prev, ...validFiles]);
      }

      // Callback de sélection
      onFilesSelect?.(validFiles.map((f) => f.file));

      // Upload automatique
      if (autoUpload && onUpload) {
        for (const uploadFile of validFiles) {
          await uploadSingleFile(uploadFile.id);
        }
      }
    },
    [files, multiple, maxFiles, accept, maxSize, autoUpload, onUpload, onFilesSelect, showPreviews]
  );

  // Uploader un fichier
  const uploadSingleFile = useCallback(
    async (fileId: string) => {
      if (!onUpload) return;

      const fileIndex = files.findIndex((f) => f.id === fileId);
      if (fileIndex === -1) return;

      // Mettre à jour le statut
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "uploading" as const, progress: 0 } : f
        )
      );

      try {
        // Simuler une progression (l'API réelle n'en fournit pas)
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId && f.status === "uploading"
                ? { ...f, progress: Math.min(f.progress + 10, 90) }
                : f
            )
          );
        }, 200);

        const result = await onUpload(files[fileIndex].file);

        clearInterval(progressInterval);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "success" as const,
                  progress: 100,
                  url: result && typeof result === "object" && "url" in result ? result.url : undefined,
                }
              : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "error" as const,
                  progress: 0,
                  error: err instanceof Error ? err.message : "Erreur d'upload",
                }
              : f
          )
        );
      }
    },
    [files, onUpload]
  );

  // Supprimer un fichier
  const removeFile = useCallback(
    (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      // Nettoyer l'aperçu
      if (file.file.preview) {
        URL.revokeObjectURL(file.file.preview);
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      onRemove?.(file.file);
    },
    [files, onRemove]
  );

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    },
    [disabled, handleFiles]
  );

  // Cleanup des aperçus
  React.useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.file.preview) {
          URL.revokeObjectURL(f.file.preview);
        }
      });
    };
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Zone de drop */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          "flex flex-col items-center justify-center gap-2 cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-destructive",
          !isDragging && !error && "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <Upload
          className={cn(
            "h-10 w-10",
            isDragging ? "text-primary" : "text-muted-foreground"
          )}
        />

        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragging
              ? "Déposez les fichiers ici"
              : "Glissez-déposez ou cliquez pour sélectionner"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {accept && `Formats: ${accept}`}
            {maxSize && ` • Max: ${formatFileSize(maxSize)}`}
            {maxFiles > 1 && ` • ${maxFiles} fichiers max`}
          </p>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile) => (
            <FileItem
              key={uploadedFile.id}
              uploadedFile={uploadedFile}
              onRemove={() => removeFile(uploadedFile.id)}
              onRetry={() => uploadSingleFile(uploadedFile.id)}
              showPreview={showPreviews}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPOSANT FICHIER INDIVIDUEL
// ============================================

interface FileItemProps {
  uploadedFile: UploadedFile;
  onRemove: () => void;
  onRetry: () => void;
  showPreview?: boolean;
}

function FileItem({ uploadedFile, onRemove, onRetry, showPreview }: FileItemProps) {
  const { file, status, progress, error } = uploadedFile;
  const FileIcon = getFileIcon(file);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 border rounded-lg",
        status === "error" && "border-destructive bg-destructive/5"
      )}
    >
      {/* Aperçu ou icône */}
      {showPreview && file.preview ? (
        <img
          src={file.preview}
          alt={file.name}
          className="h-12 w-12 object-cover rounded"
        />
      ) : (
        <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
          <FileIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      {/* Infos fichier */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>

        {/* Barre de progression */}
        {status === "uploading" && (
          <Progress value={progress} className="h-1 mt-2" />
        )}

        {/* Message d'erreur */}
        {status === "error" && error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>

      {/* Statut et actions */}
      <div className="flex items-center gap-2">
        {status === "uploading" && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {status === "success" && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}

        {status === "error" && (
          <Button variant="ghost" size="icon" onClick={onRetry} className="h-8 w-8">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT SIMPLE POUR UN SEUL FICHIER
// ============================================

interface SingleFileUploadProps {
  value?: File | string | null;
  onChange?: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Upload simple pour un seul fichier
 */
export function SingleFileUpload({
  value,
  onChange,
  accept,
  maxSize = 5 * 1024 * 1024,
  disabled,
  placeholder = "Choisir un fichier",
  className,
}: SingleFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const fileName = value
    ? typeof value === "string"
      ? value.split("/").pop()
      : value.name
    : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];

    if (!file) {
      onChange?.(null);
      return;
    }

    const validationError = validateFile(file, accept, maxSize);
    if (validationError) {
      setError(validationError);
      return;
    }

    onChange?.(file);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={handleChange}
        />

        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {placeholder}
        </Button>

        {fileName && (
          <div className="flex items-center gap-2 text-sm">
            <File className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{fileName}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onChange?.(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
