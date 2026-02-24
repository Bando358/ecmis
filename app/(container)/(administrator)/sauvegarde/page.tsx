"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Upload,
  Download,
  FileText,
  AlertCircle,
  DatabaseBackup,
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
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { TableName } from "@prisma/client";
import { LoadingPage } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSession } from "next-auth/react";
import { SafeUser } from "@/types/prisma";
import { getOneUser } from "@/lib/actions/authActions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function BackupPage() {
  const router = useRouter();
  const { canRead, isLoading: isLoadingPermissions } = usePermissionContext();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("safe");
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [oneUser, setOneUser] = useState<SafeUser | null>(null);
  const [task, setTask] = useState<"backup" | "restore" | null>(null);
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  useEffect(() => {
    const fetchUser = async () => {
      if (!idUser) return;
      const user = await getOneUser(idUser);
      setOneUser(user);
    };
    fetchUser();
  }, [idUser]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.endsWith(".sql")) {
      toast.error("Veuillez sélectionner un fichier SQL (.sql)");
      e.target.value = "";
      setFile(null);
      return;
    }

    const warningThreshold = 100 * 1024 * 1024;
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

  const handleImport = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    const largeFileThreshold = 500 * 1024 * 1024;

    setTask("restore");
    setIsLoading(true);

    const interval = startProgress();

    try {
      const formData = new FormData();
      formData.append("backupFile", file);
      formData.append("mode", mode);

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
            description: `Mode : ${mode.toUpperCase()} | Taille : ${formatFileSize(file.size)}`,
            duration: 7000,
          }
        );

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
    } catch {
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoadingPermissions) return <LoadingPage />;
  if (!canRead(TableName.ADMINISTRATION)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    router.back();
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/administrator")}
          className="rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
            <DatabaseBackup className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Sauvegarde & Restauration</h1>
            <p className="text-sm text-muted-foreground">
              Gérer les sauvegardes de la base de données PostgreSQL
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sauvegarde" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-11">
          <TabsTrigger value="sauvegarde" className="flex items-center gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white">
            <Download className="h-4 w-4" />
            Sauvegarde
          </TabsTrigger>
          <TabsTrigger
            value="importation"
            className="flex items-center gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white"
            disabled={!oneUser || oneUser.role !== "ADMIN"}
          >
            <Upload className="h-4 w-4" />
            Restauration
          </TabsTrigger>
        </TabsList>

        {/* Tab Sauvegarde */}
        <TabsContent value="sauvegarde" className="mt-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white text-center pb-4">
              <CardTitle className="text-lg flex items-center justify-center gap-2 text-slate-800">
                <Download className="h-5 w-5" />
                Créer une sauvegarde
              </CardTitle>
              <CardDescription>
                Générez une sauvegarde complète de votre base de données PostgreSQL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md mx-auto pt-4">
              <Alert className="border-blue-200 bg-blue-50/50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  La sauvegarde crée un fichier ZIP contenant toutes les
                  données. Conservez-le dans un endroit sécurisé.
                </AlertDescription>
              </Alert>

              {isLoading && task === "backup" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Création de la sauvegarde...</span>
                    <span className="font-medium text-slate-700">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button
                onClick={handleBackup}
                disabled={isLoading}
                className="w-full bg-slate-800 hover:bg-slate-900 h-12 text-base shadow-md"
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

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5"><span className="text-green-500">&#10003;</span> Toutes les tables</p>
                <p className="flex items-center gap-1.5"><span className="text-green-500">&#10003;</span> Format ZIP compressé</p>
                <p className="flex items-center gap-1.5"><span className="text-green-500">&#10003;</span> Compatible PostgreSQL 12+</p>
                <p className="flex items-center gap-1.5"><span className="text-green-500">&#10003;</span> Structure préservée</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Importation */}
        <TabsContent value="importation" className="mt-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white text-center pb-4">
              <CardTitle className="text-lg flex items-center justify-center gap-2 text-slate-800">
                <Upload className="h-5 w-5" />
                Restaurer une sauvegarde
              </CardTitle>
              <CardDescription>
                Importez une sauvegarde SQL de n&apos;importe quelle taille
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md mx-auto pt-4">
              {/* Mode d'importation */}
              <div className="space-y-2">
                <label className="font-medium text-sm text-gray-700">
                  Mode d&apos;importation
                </label>
                <Select onValueChange={setMode} defaultValue="safe">
                  <SelectTrigger className="h-10 border-gray-200">
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
                      Ce mode écrasera TOUTES les données existantes.
                      Assurez-vous d&apos;avoir une sauvegarde récente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Sélection de fichier */}
              <div className="space-y-2">
                <label className="font-medium text-sm text-gray-700">
                  Fichier SQL
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-slate-400 transition-colors bg-gray-50/50">
                  <FileText className="h-10 w-10 mx-auto text-gray-300 mb-2" />
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

                {file && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
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
                        variant="secondary"
                        className={
                          file.size > 100 * 1024 * 1024
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }
                      >
                        {file.size > 100 * 1024 * 1024 ? "Volumineux" : "Prêt"}
                      </Badge>
                    </div>
                    {file.size > 100 * 1024 * 1024 && (
                      <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        Fichier volumineux - L&apos;importation peut prendre
                        plusieurs minutes
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-6 text-xs text-red-500 hover:text-red-700"
                      onClick={() => {
                        setFile(null);
                        const fileInput = document.getElementById(
                          "file-upload"
                        ) as HTMLInputElement;
                        if (fileInput) fileInput.value = "";
                      }}
                    >
                      Supprimer le fichier
                    </Button>
                  </div>
                )}
              </div>

              {/* Barre de progression */}
              {isLoading && task === "restore" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Restauration en cours...</span>
                    <span className="font-medium text-slate-700">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  {file && file.size > 100 * 1024 * 1024 && (
                    <div className="text-xs text-muted-foreground text-center">
                      Traitement d&apos;un gros fichier - Veuillez patienter...
                    </div>
                  )}
                </div>
              )}

              {/* Bouton d'import */}
              {mode === "overwrite" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={!file || isLoading}
                      className="w-full bg-red-600 hover:bg-red-700 h-12"
                      size="lg"
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      Importer (OVERWRITE)
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer l&apos;écrasement</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le mode OVERWRITE va écraser TOUTES les données existantes.
                        Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={handleImport}
                      >
                        Confirmer l&apos;écrasement
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  onClick={handleImport}
                  disabled={!file || isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 h-12"
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
                      Importer la sauvegarde
                    </>
                  )}
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5"><span className="text-green-500">&#10003;</span> Aucune limite de taille</p>
                <p className="flex items-center gap-1.5"><span className="text-green-500">&#10003;</span> Compatible pg_dump</p>
                <p className="flex items-center gap-1.5"><span className="text-green-500">&#10003;</span> Transactions multiples</p>
                <p className="flex items-center gap-1.5"><span className="text-green-500">&#10003;</span> Validation UTF-8</p>
              </div>

              <Alert className="border-slate-200 bg-slate-50/50">
                <AlertCircle className="h-4 w-4 text-slate-600" />
                <AlertDescription className="text-xs text-slate-700">
                  <strong>Note :</strong> Pour les fichiers très volumineux (plusieurs Go),
                  l&apos;importation peut prendre du temps. Assurez-vous d&apos;avoir une connexion stable.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
