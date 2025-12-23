"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function BackupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("safe");
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [task, setTask] = useState<"backup" | "restore" | null>(null);

  // ✅ Simule une progression fluide
  const startProgress = () => {
    setProgress(5);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return p;
        }
        return p + 5;
      });
    }, 150);
    return interval;
  };

  const finishProgress = (interval: NodeJS.Timeout) => {
    clearInterval(interval);
    setProgress(100);
    setTimeout(() => setProgress(0), 1000);
  };

  // ✅ IMPORT (RESTORE)
  const handleImport = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setTask("restore");
    setIsLoading(true);

    const interval = startProgress();

    const formData = new FormData();
    formData.append("backupFile", file);
    formData.append("mode", mode);

    const res = await fetch("/api/restore", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    finishProgress(interval);

    if (result.success) {
      toast.success(`${result.inserted} lignes insérées`);
    } else {
      toast.error(result.error);
    }

    setIsLoading(false);
    setTask(null);
  };

  // ✅ EXPORT (BACKUP)
  const handleBackup = async () => {
    setTask("backup");
    setIsLoading(true);

    const interval = startProgress();

    try {
      const response = await fetch("/api/backup");

      if (!response.ok) {
        finishProgress(interval);
        const err = await response.json();
        toast.error(err.error || "Erreur lors de la sauvegarde");
        setIsLoading(false);
        setTask(null);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sauvegarde-${new Date().toLocaleString()}.zip`; // Changement de l'extension
      a.click();
      URL.revokeObjectURL(url);

      finishProgress(interval);
      toast.success("Sauvegarde ZIP téléchargée !");
    } catch {
      finishProgress(interval);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setIsLoading(false);
      setTask(null);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="p-10 space-y-6 mx-w-sm ">
        <h1 className="text-2xl font-bold">Backup / Restore PostgreSQL</h1>

        <div>
          <label className="font-semibold">Mode {"d'importation"}</label>
          <Select onValueChange={setMode} defaultValue="safe">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="safe">SAFE (ignorer les conflits)</SelectItem>
              <SelectItem value="merge">MERGE (mettre à jour)</SelectItem>
              <SelectItem value="overwrite">OVERWRITE (remplacer)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <input
          type="file"
          accept=".sql"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border rounded p-2 w-full"
        />

        {/* ✅ Barre de progression en temps réel */}
        {isLoading && (
          <div className="w-75">
            <Progress value={progress} />
            <div className="text-sm text-gray-600 mt-1">
              {task === "backup" && "Création du backup..."}
              {task === "restore" && "Importation en cours..."} — {progress}%
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Button
            onClick={handleBackup}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading && task === "backup" ? "En cours..." : "Sauvegarde"}
          </Button>

          <Button
            onClick={handleImport}
            disabled={!file || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading && task === "restore" ? "Importation..." : "Importer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
