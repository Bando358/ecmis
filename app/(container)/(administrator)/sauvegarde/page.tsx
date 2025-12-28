"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowBigLeftDash,
  Upload,
  Download,
  FileText,
  AlertCircle,
  Database,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSession } from "next-auth/react";
import { User } from "@prisma/client";
import { get } from "http";
import { getOneUser } from "@/lib/actions/authActions";

export default function BackupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("safe");
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [task, setTask] = useState<"backup" | "restore" | null>(null);
  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      if (!idUser) return;
      const user = await getOneUser(idUser);
      setOneUser(user);
    };
    fetchUser();
  }, [idUser]);
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

  // ✅ Gestionnaire de fichier amélioré (sans limite de taille)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Validation du type de fichier uniquement
    if (!selectedFile.name.endsWith(".sql")) {
      toast.error("Veuillez sélectionner un fichier SQL (.sql)");
      e.target.value = ""; // Réinitialise l'input
      setFile(null);
      return;
    }

    // Avertissement pour les très gros fichiers (> 100MB) mais pas de blocage
    const warningThreshold = 100 * 1024 * 1024; // 100MB
    if (selectedFile.size > warningThreshold) {
      toast.warning(
        `Fichier volumineux détecté (${formatFileSize(selectedFile.size)})`,
        {
          description:
            "L'importation peut prendre plus de temps selon votre connexion.",
          duration: 5000,
        }
      );
    }

    setFile(selectedFile);
    toast.success(`Fichier sélectionné : ${selectedFile.name}`, {
      description: `Taille : ${formatFileSize(selectedFile.size)}`,
    });
  };

  // ✅ IMPORT (RESTORE)
  const handleImport = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    // Confirmation pour les modes dangereux
    if (mode === "overwrite") {
      const confirm = window.confirm(
        "⚠️ ATTENTION : Le mode OVERWRITE va écraser toutes les données existantes.\n\nÊtes-vous sûr de vouloir continuer ?"
      );
      if (!confirm) return;
    }

    // Avertissement supplémentaire pour les très gros fichiers
    const largeFileThreshold = 500 * 1024 * 1024; // 500MB
    if (file.size > largeFileThreshold) {
      const proceed = window.confirm(
        `⚠️ FICHIER TRÈS VOLUMINEUX DÉTECTÉ\n\n` +
          `Taille : ${formatFileSize(file.size)}\n` +
          `L'importation peut prendre plusieurs minutes et solliciter fortement le serveur.\n\n` +
          `Voulez-vous vraiment continuer ?`
      );
      if (!proceed) return;
    }

    setTask("restore");
    setIsLoading(true);

    const interval = startProgress();

    try {
      const formData = new FormData();
      formData.append("backupFile", file);
      formData.append("mode", mode);

      // Indicateur de fichier volumineux
      const largeFileIndicator = file.size > 100 * 1024 * 1024;
      if (largeFileIndicator) {
        toast.info("Importation d'un fichier volumineux en cours...", {
          description:
            "Veuillez patienter, cela peut prendre plusieurs minutes.",
          duration: 10000,
        });
      }

      const res = await fetch("/api/restore", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      finishProgress(interval);

      if (result.success) {
        toast.success(
          `Importation réussie ! ${result.inserted} lignes insérées`,
          {
            description: `Mode : ${mode.toUpperCase()} | Taille : ${formatFileSize(
              file.size
            )}`,
            duration: 7000,
          }
        );

        // Réinitialiser après succès
        setFile(null);
        const fileInput = document.querySelector(
          'input[type="file"]'
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        toast.error(result.error || "Erreur lors de l'importation", {
          description: largeFileIndicator
            ? "Échec lors de l'importation d'un gros fichier. Vérifiez la taille et l'intégrité du fichier."
            : "Veuillez vérifier le format du fichier et réessayer.",
          duration: 10000,
        });
      }
    } catch (error) {
      finishProgress(interval);
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Échec de l'importation du fichier volumineux", {
          description:
            "Le serveur n'a pas pu traiter le fichier. Vérifiez la connexion ou divisez le fichier.",
          duration: 10000,
        });
      } else {
        toast.error("Erreur réseau lors de l'importation");
      }
    } finally {
      setIsLoading(false);
      setTask(null);
    }
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

      // Formatage du nom de fichier
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now
        .getHours()
        .toString()
        .padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}`;

      a.download = `backup_postgresql_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      finishProgress(interval);
      toast.success("Sauvegarde téléchargée !", {
        description: `Taille : ${formatFileSize(blob.size)}`,
      });
    } catch {
      finishProgress(interval);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setIsLoading(false);
      setTask(null);
    }
  };

  // ✅ Fonction pour formatter la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="container mx-auto p-4 md:p-6 relative min-h-screen">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4"
              onClick={() => router.back()}
            >
              <ArrowBigLeftDash className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Retour à la page précédente</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="max-w-4xl mx-auto pt-12">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Database className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight">
              Gestion des sauvegardes PostgreSQL
            </h1>
          </div>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Sauvegardez ou restaurez votre base de données VIH - Aucune limite
            de taille pour les fichiers SQL
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sauvegarde" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="sauvegarde" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Sauvegarde
            </TabsTrigger>
            <TabsTrigger
              value="importation"
              className="flex items-center gap-2"
              disabled={!oneUser || oneUser.role !== "ADMIN"}
            >
              <Upload className="h-4 w-4" />
              Restauration
            </TabsTrigger>
          </TabsList>

          {/* Tab Sauvegarde */}
          <TabsContent value="sauvegarde" className="mt-6">
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="text-xl flex items-center justify-center gap-2">
                  <Download className="h-5 w-5" />
                  Créer une sauvegarde
                </CardTitle>
                <CardDescription>
                  Générez une sauvegarde complète de votre base de données
                  PostgreSQL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-md mx-auto">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    La sauvegarde crée un fichier ZIP contenant toutes les
                    données. Conservez-le dans un endroit sécurisé.
                  </AlertDescription>
                </Alert>

                {isLoading && task === "backup" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Création de la sauvegarde...</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                <Button
                  onClick={handleBackup}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                  size="lg"
                >
                  {isLoading && task === "backup" ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Créer une sauvegarde
                    </>
                  )}
                </Button>

                <div className="text-sm text-muted-foreground text-center space-y-1">
                  <p>✓ Inclut toutes les tables et données</p>
                  <p>✓ Format ZIP compressé</p>
                  <p>✓ Compatible PostgreSQL 12+</p>
                  <p>✓ Structure complète préservée</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Importation */}
          <TabsContent value="importation" className="mt-6">
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="text-xl flex items-center justify-center gap-2">
                  <Upload className="h-5 w-5" />
                  Restaurer une sauvegarde
                </CardTitle>
                <CardDescription>
                  Importez une sauvegarde SQL de n'importe quelle taille
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-md mx-auto">
                {/* Mode d'importation */}
                <div className="space-y-2">
                  <label className="font-medium text-sm">
                    Sélectionnez le mode d'importation
                  </label>
                  <Select onValueChange={setMode} defaultValue="safe">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safe">
                        <div className="flex flex-col">
                          <span className="font-medium">SAFE</span>
                          <span className="text-xs text-muted-foreground">
                            Ignorer les conflits (recommandé)
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="merge">
                        <div className="flex flex-col">
                          <span className="font-medium">MERGE</span>
                          <span className="text-xs text-muted-foreground">
                            Fusionner avec les données existantes
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="overwrite">
                        <div className="flex flex-col">
                          <span className="font-medium">OVERWRITE</span>
                          <span className="text-xs text-muted-foreground">
                            Remplacer toutes les données
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {mode === "overwrite" && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        ⚠️ Ce mode écrasera TOUTES les données existantes.
                        Assurez-vous d'avoir une sauvegarde récente.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Sélection de fichier - AUCUNE LIMITE DE TAILLE */}
                <div className="space-y-2">
                  <label className="font-medium text-sm">
                    Sélectionnez votre fichier SQL
                  </label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors bg-muted/30">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Glissez-déposez ou cliquez pour sélectionner
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Fichiers SQL uniquement (.sql) - Aucune limite de taille
                    </p>

                    <input
                      type="file"
                      accept=".sql,.SQL"
                      onChange={handleFileChange}
                      disabled={isLoading}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() =>
                        document.getElementById("file-upload")?.click()
                      }
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Parcourir les fichiers
                    </Button>
                  </div>

                  {/* Informations du fichier sélectionné */}
                  {file && (
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            file.size > 100 * 1024 * 1024
                              ? "default"
                              : "secondary"
                          }
                        >
                          {file.size > 100 * 1024 * 1024
                            ? "Volumineux"
                            : "Prêt"}
                        </Badge>
                      </div>
                      {file.size > 100 * 1024 * 1024 && (
                        <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          ⚠️ Fichier volumineux - L'importation peut prendre
                          plusieurs minutes
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-6 text-xs"
                        onClick={() => {
                          setFile(null);
                          const fileInput = document.getElementById(
                            "file-upload"
                          ) as HTMLInputElement;
                          if (fileInput) fileInput.value = "";
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  )}
                </div>

                {/* Barre de progression */}
                {isLoading && task === "restore" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Restauration en cours...</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {file && file.size > 100 * 1024 * 1024 && (
                      <div className="text-xs text-muted-foreground text-center">
                        Traitement d'un gros fichier - Veuillez patienter...
                      </div>
                    )}
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleImport}
                    disabled={!file || isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 h-12"
                    size="lg"
                  >
                    {isLoading && task === "restore" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Importation...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        {file && file.size > 100 * 1024 * 1024 ? (
                          <>Importer le gros fichier</>
                        ) : (
                          <>Importer la sauvegarde</>
                        )}
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground text-center space-y-1">
                  <p>✓ Aucune limite de taille pour les fichiers SQL</p>
                  <p>✓ Compatible avec les exports pg_dump</p>
                  <p>✓ Support des transactions multiples</p>
                  <p>✓ Validation automatique de l'encodage UTF-8</p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Note importante :</strong> Pour les fichiers très
                    volumineux (plusieurs Go), l'importation peut prendre du
                    temps et consommer des ressources serveur importantes.
                    Assurez-vous d'avoir une connexion stable.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
