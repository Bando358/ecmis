"use client";
import React, { useEffect } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
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

  useEffect(() => {
    if (!idPrestataire) return;
    if (!status) return;
    const fetUser = async () => {
      const user = await getOneUser(idPrestataire);
      setHref(user?.role === "ADMIN" ? "/dashboard" : "/client");
      setOneUser(user!);
      if (status === "unauthenticated") {
        router.push("/login");
      }
    };
    fetUser();
  }, [idPrestataire, status, router]);
  const handleClick = (e: React.MouseEvent) => {
    if (isPending) {
      e.preventDefault();
      return;
    }
    setIsPending(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Button size={"lg"} disabled={isPending} asChild>
        <Link href={href} onClick={handleClick}>
          {isPending && <SpinnerCustom className="text-gray-300" />} Démarrer
        </Link>
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
