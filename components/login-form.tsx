"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { authLogger } from "@/lib/logger";
import { ERROR_MESSAGES } from "@/lib/constants";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    if (isPending) return;

    setIsPending(true);
    authLogger.info("Tentative de connexion", { data: { username: data.username } });

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username: data.username,
        password: data.password,
      });

      if (res?.error) {
        authLogger.warn("Échec de connexion", {
          data: { username: data.username },
        });
        // Afficher le message du rate limiter s'il est explicite,
        // sinon message générique (empêche l'énumération d'utilisateurs)
        const isRateLimited = res.error.includes("Trop de tentatives");
        toast.error(isRateLimited ? res.error : ERROR_MESSAGES.INVALID_CREDENTIALS);
        form.setValue("password", "");
        setIsPending(false);
        return;
      }

      if (res?.ok) {
        authLogger.info("Connexion réussie", {
          data: { username: data.username },
        });
        toast.success("Connexion réussie !");
        const session = await getSession();
        const dest = session?.user?.role === "ADMIN" ? "/dashboard" : "/client";
        router.replace(dest);
        return;
      }

      setIsPending(false);
    } catch (error) {
      authLogger.error("Erreur lors de la connexion", error);
      toast.error(ERROR_MESSAGES.UNKNOWN_ERROR);
      form.setValue("password", "");
      setIsPending(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>Entrer vos paramètres de connexion</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Johndoe33"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="*****"
                        type="password"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
