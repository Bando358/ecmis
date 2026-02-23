import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowBigLeftDash } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RetourClients() {
  const router = useRouter();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="sticky top-0 left-4 ml-3"
            onClick={() => router.push("/client")}
          >
            <ArrowBigLeftDash className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Retour à la page clients</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
