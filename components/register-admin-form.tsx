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
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { registerAdmin } from "@/lib/actions/authActions";
import { useState } from "react";

const signUpSchema = z.object({
  name: z.string().min(5, {
    message: "Le nom doit contenir au moins 5 caractères.",
  }),
  email: z.email("L'adresse email est invalide."),
  username: z.string().min(5, {
    message: "Le nom d'utilisateur doit contenir au moins 5 caractères.",
  }),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .regex(/[A-Za-z]/, {
      message: "Le mot de passe doit inclure au moins une lettre.",
    })
    .regex(/[0-9]/, {
      message: "Le mot de passe doit inclure au moins un chiffre.",
    }),
});

type RegisterInput = {
  name: string;
  email: string;
  username: string;
  password: string;
};

type FormData = z.infer<typeof signUpSchema>;
export function RegisterAdminForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    if (isPending) return;
    setIsPending(true);

    try {
      await registerAdmin(data);
      toast.success("Compte créé avec succès !");
      router.push("/login");
    } catch {
      // Message générique — ne pas révéler pourquoi ça a échoué
      toast.error("Impossible de créer le compte. Vérifiez vos informations.");
      form.setValue("password", "");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Création de compte administrateur</CardTitle>
          <CardDescription>Entrez vos paramètres de compte</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom et Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="John doe" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="exemple@gmail.com" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Johndoe33" {...field} disabled={isPending} />
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
                      <Input placeholder="*****" type="password" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Création..." : "Créer le compte"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
