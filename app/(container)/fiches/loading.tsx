import { Loader2 } from "lucide-react";

export default function FichesLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="mt-3 text-sm text-muted-foreground">Chargement...</p>
    </div>
  );
}
