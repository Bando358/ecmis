"use client";

import * as React from "react";
import { Check, Copy, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/useClipboard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ButtonProps = React.ComponentProps<typeof Button>;

interface CopyButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Texte à copier */
  value: string;
  /** Afficher une notification de succès */
  showToast?: boolean;
  /** Message de la notification */
  toastMessage?: string;
  /** Afficher un tooltip */
  showTooltip?: boolean;
  /** Tooltip avant copie */
  tooltipCopy?: string;
  /** Tooltip après copie */
  tooltipCopied?: string;
  /** Durée d'affichage du statut "copié" en ms */
  timeout?: number;
}

/**
 * Bouton de copie dans le presse-papiers
 *
 * @example
 * ```tsx
 * // Simple
 * <CopyButton value={code} />
 *
 * // Avec notification
 * <CopyButton
 *   value={apiKey}
 *   showToast
 *   toastMessage="Clé API copiée !"
 * />
 *
 * // Personnalisé
 * <CopyButton
 *   value={link}
 *   variant="outline"
 *   size="sm"
 * >
 *   Copier le lien
 * </CopyButton>
 * ```
 */
export function CopyButton({
  value,
  showToast = false,
  toastMessage = "Copié dans le presse-papiers",
  showTooltip = true,
  tooltipCopy = "Copier",
  tooltipCopied = "Copié !",
  timeout = 2000,
  children,
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: CopyButtonProps) {
  const [copy, hasCopied] = useCopyToClipboard(timeout);

  const handleCopy = async () => {
    const success = await copy(value);
    if (success && showToast) {
      toast.success(toastMessage);
    }
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "transition-all",
        hasCopied && "text-green-600",
        className
      )}
      onClick={handleCopy}
      {...props}
    >
      {children || (
        hasCopied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )
      )}
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{hasCopied ? tooltipCopied : tooltipCopy}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Champ avec bouton de copie intégré
 */
export function CopyableField({
  label,
  value,
  className,
}: {
  label?: string;
  value: string;
  className?: string;
}) {
  const [copy, hasCopied] = useCopyToClipboard();

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
        <code className="flex-1 text-sm font-mono truncate">{value}</code>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => copy(value)}
        >
          {hasCopied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Bloc de code avec bouton de copie
 */
export function CopyableCode({
  code,
  language,
  showLineNumbers = false,
  className,
}: {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}) {
  const [copy, hasCopied] = useCopyToClipboard();
  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-muted/30 overflow-hidden",
        className
      )}
    >
      {/* Header avec bouton copie */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        {language && (
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {language}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            copy(code);
            toast.success("Code copié !");
          }}
        >
          {hasCopied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copié
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3 w-3 mr-1" />
              Copier
            </>
          )}
        </Button>
      </div>

      {/* Code */}
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono">
          <code>
            {showLineNumbers
              ? lines.map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-8 text-right pr-4 text-muted-foreground select-none">
                      {i + 1}
                    </span>
                    <span>{line}</span>
                  </div>
                ))
              : code}
          </code>
        </pre>
      </div>
    </div>
  );
}

/**
 * Texte avec action de copie au clic
 */
export function ClickToCopy({
  value,
  children,
  className,
  toastMessage = "Copié !",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  toastMessage?: string;
}) {
  const [copy, hasCopied] = useCopyToClipboard();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "cursor-pointer hover:underline transition-colors",
              hasCopied && "text-green-600",
              className
            )}
            onClick={() => {
              copy(value);
              toast.success(toastMessage);
            }}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{hasCopied ? "Copié !" : "Cliquer pour copier"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
