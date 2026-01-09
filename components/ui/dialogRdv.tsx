"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

import { TypeVisite } from "@prisma/client";
import { CalendarIcon } from "lucide-react";

interface DialogGestionVisiteProps {
  idVisite: string;
  typeVisite: TypeVisite;
  nomClient: string;
  telClient?: string;
  telephoneClient?: string;
  setReprogrammation?: (data: ReprogrammationData) => void | Promise<void>;
}

export type ReprogrammationData = {
  idVisite: string;
  action: string;
  commentaire: string;
  prochaineDate: Date | undefined;
};

export function DialogGestionVisite({
  idVisite,
  typeVisite,
  nomClient,
  telClient,
  telephoneClient,
  setReprogrammation,
}: DialogGestionVisiteProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [action, setAction] = useState<string>("");
  const [commentaire, setCommentaire] = useState("");
  const [prochaineDate, setProchaineDate] = useState<Date | undefined>(
    undefined
  );

  // 🔹 État pour le Popover du calendrier

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      setAction("");
      setCommentaire("");
      setProchaineDate(undefined);
    }
  }, [open]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: ReprogrammationData = {
      idVisite,
      action,
      commentaire,
      prochaineDate,
    };

    console.log("Soumission :", data);

    setIsSubmitting(true);
    if (setReprogrammation) {
      await setReprogrammation(data);
    }

    setIsSubmitting(false);

    // Fermer le dialog après soumission réussie
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="bg-gray-200">
          Gérer
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Gestion de la visite</DialogTitle>
            <DialogDescription>
              Effectue une action sur la visite du client.
            </DialogDescription>
          </DialogHeader>

          {/* Infos Client */}
          <div className="flex flex-row justify-between gap-2">
            <div>
              <Label>Nom du client</Label>
              <div>{nomClient}</div>
            </div>

            <div>
              <Label>Téléphone</Label>
              <div>{telephoneClient ?? telClient}</div>
              <Input value={typeVisite} className="hidden" readOnly />
            </div>
          </div>

          {/* Action */}
          <div className="grid gap-3 mt-4">
            <Label htmlFor="action">Action</Label>
            <Select onValueChange={(value) => setAction(value)} value={action}>
              <SelectTrigger id="action" className="w-full">
                <SelectValue placeholder="Choisir une action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONFIRMATION">Confirmation</SelectItem>
                <SelectItem value="REPROGRAMMATION">Reprogrammation</SelectItem>
                <SelectItem value="ACCOUCHEMENT">Accouchement</SelectItem>
                <SelectItem value="ARRET_CONTRACEPTION">
                  Arrêt de contraception
                </SelectItem>
                <SelectItem value="INJOIGNABLE">Injoignable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prochaine Date (si reprogrammation) */}
          {action === "REPROGRAMMATION" && (
            <div className="relative w-full flex flex-col gap-3 mt-4">
              <Label>Prochaine date</Label>

              {/* Champ date cachant l’icône native */}
              <Input
                id="prochaineDateInput"
                type="date"
                value={prochaineDate ? format(prochaineDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value)
                    : undefined;
                  setProchaineDate(date);
                }}
                className="pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-clear-button]:hidden"
              />

              {/* Icône de calendrier cliquable */}
              <button
                type="button"
                onClick={() => {
                  // Simule un clic sur le sélecteur de date natif
                  const input = document.getElementById(
                    "prochaineDateInput"
                  ) as HTMLInputElement;
                  input?.showPicker?.(); // API moderne (Chrome, Edge, Safari 16.4+)
                }}
                className="absolute right-3 top-[2.7rem] -translate-y-1/2"
              >
                <CalendarIcon className="h-5 w-5 text-blue-500 hover:text-green-600 transition-colors" />
              </button>
            </div>
          )}

          {/* Commentaire */}
          <div className="grid gap-3 mt-4">
            <Label htmlFor="commentaire">Commentaire</Label>
            <Textarea
              id="commentaire"
              placeholder="Ajouter un commentaire..."
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
