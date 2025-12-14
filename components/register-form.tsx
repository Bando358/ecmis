"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Select from "react-select";
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
import { getOneUser, registerUser } from "@/lib/actions/authActions";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Clinique } from "@prisma/client";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
// import { signUpUsernameAction } from "@/actions/sign-up-actions";

const signUpSchema = z.object({
  name: z.string().min(5, {
    message: "Name must be at least 5 characters.",
  }),
  email: z.email("L'adresse email est invalide."),
  username: z.string().min(5, {
    message: "Username must be at least 5 characters.",
  }),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 8 caractères.")
    .regex(/[A-Za-z0-9]/, {
      message: "Le mot de passe doit inclure des lettres et des chiffres.",
    }),
  idCliniques: z.array(z.string()),
});

type RegisterInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  idCliniques: string[]; // Rendre idClinique facultatif si nécessaire
  // idClinique?: string[]; // Rendre idClinique facultatif si nécessaire
};

type FormData = z.infer<typeof signUpSchema>;
export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  console.log("idUser : ", idUser);
  const userRole = session?.user.role as string;

  const form = useForm<FormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      idCliniques: [""],
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const clinique = await getAllClinique();

        if (userRole === "ADMIN") {
          setCliniques(clinique);
        } else {
          const oneUser = await getOneUser(idUser);

          if (oneUser) {
            const filteredCliniques = clinique.filter((c: Clinique) =>
              oneUser.idCliniques.includes(c.id)
            );
            console.log("filteredCliniques : ", filteredCliniques);
            setCliniques(filteredCliniques);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des cliniques:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userRole, idUser]); // ← JSON.stringify stabilise le tableau

  const onSubmit = async (data: RegisterInput) => {
    try {
      await registerUser(data);
      console.log(data);

      toast.success("Compte créer avec succès! 🏆");
      router.push("/dashboard");
    } catch (error) {
      console.log(error);
      toast.error("Erreur lors de l'inscription");
    }
  };

  const cliniqueOptions = cliniques.map((clinique) => ({
    value: clinique.id,
    label: clinique.nomClinique,
  }));

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Création de compte</CardTitle>
          <CardDescription>Entrer vos paramètre de compte</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <div>
                <label className="block text-sm font-medium">Cliniques</label>
                {isLoading ? (
                  <div className="p-2 text-sm text-gray-500">
                    Chargement des cliniques...
                  </div>
                ) : (
                  <Select
                    isMulti
                    options={cliniqueOptions}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    placeholder="Sélectionner une ou plusieurs cliniques"
                    onChange={(selectedOptions) => {
                      const selectedValues = selectedOptions.map(
                        (option) => option.value
                      );
                      form.setValue("idCliniques", selectedValues);
                    }}
                  />
                )}
                {/* /> */}
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom et Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="John doe" {...field} />
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
                      <Input placeholder="exemple@gmail.com" {...field} />
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
                      <Input placeholder="Johndoe33" {...field} />
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
                      <Input placeholder="*****" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Submit
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
