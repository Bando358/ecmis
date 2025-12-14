"use client";
import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { SpinnerCustom } from "./ui/spinner";

export const GetStartedButton = () => {
  const [isPending, setIsPending] = React.useState(false);
  const { data: session } = useSession();

  const handleClick = (e: React.MouseEvent) => {
    if (isPending) {
      e.preventDefault();
      return;
    }
    setIsPending(true);
  };

  const href = session ? "/dashboard" : "/login";

  return (
    <div className="flex flex-col items-center gap-4">
      <Button size={"lg"} disabled={isPending} asChild>
        <Link href={href} onClick={handleClick}>
          {isPending && <SpinnerCustom className="text-gray-300" />} Get Started
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
