"use client";
import React, { useEffect } from "react";
import { Button } from "./ui/button";
import { useSession } from "next-auth/react";
import { SpinnerCustom } from "./ui/spinner";
import { getOneUser } from "@/lib/actions/authActions";
import { User } from "@prisma/client";
import { useRouter } from "next/navigation";

export const GetStartedButton = () => {
  const [isPending, setIsPending] = React.useState(false);
  const [oneUser, setOneUser] = React.useState<User | null>(null);
  const [href, setHref] = React.useState<string>("");
  const { data: session, status } = useSession();
  const idPrestataire = session?.user?.id as string;

  const router = useRouter();

  const isLoading = status === "loading" || (!href && status !== "unauthenticated");

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      setHref("/login");
      return;
    }

    if (!idPrestataire) return;

    const fetUser = async () => {
      const user = await getOneUser(idPrestataire);
      setHref(user?.role === "ADMIN" ? "/dashboard" : "/client");
      setOneUser(user!);
    };
    fetUser();
  }, [idPrestataire, status]);

  const handleClick = () => {
    if (isPending || isLoading || !href) return;
    setIsPending(true);
    router.push(href);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Button size={"lg"} disabled={isPending || isLoading} onClick={handleClick}>
        {(isPending || isLoading) && <SpinnerCustom className="text-gray-300" />} Démarrer
      </Button>
      {session && (
        <p className="flex items-center gap-2">
          <span
            data-role={session.user.role}
            className="size-4 rounded-full animate-pulse data-[role=USER]:bg-orange-400 data-[role=ADMIN]:bg-red-600 "
          />
          Welcome back, {session.user.name}! 👋
        </p>
      )}
    </div>
  );
};
