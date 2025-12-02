// "use client";
// import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { toast } from "sonner";
// import { useRouter } from "next/navigation";
// import { signIn } from "next-auth/react";
// import { useState } from "react";

// const signUpSchema = z.object({
//   username: z.string().min(5, {
//     message: "Username must be at least 5 characters.",
//   }),
//   password: z
//     .string()
//     .min(6, "Le mot de passe doit contenir au moins 8 caractères.")
//     .regex(/[A-Za-z0-9]/, {
//       message: "Le mot de passe doit inclure des lettres et des chiffres.",
//     }),
// });

// type FormData = z.infer<typeof signUpSchema>;

// export function LoginForm({
//   className,
//   ...props
// }: React.ComponentProps<"div">) {
//   const [isPending, setIsPending] = useState(false);
//   const router = useRouter();

//   const form = useForm<FormData>({
//     resolver: zodResolver(signUpSchema),
//     defaultValues: {
//       username: "",
//       password: "",
//     },
//   });

//   const onSubmit = async (data: FormData) => {
//     if (isPending) return;

//     setIsPending(true);

//     try {
//       const res = await signIn("credentials", {
//         redirect: false,
//         username: data.username,
//         password: data.password,
//       });

//       console.log("Response from signIn:", res);

//       if (res?.error) {
//         toast.error("Nom d'utilisateur ou mot de passe incorrect");
//         setIsPending(false);
//         return;
//       }

//       if (res?.ok) {
//         // on va mettre 3 secondes pour exécuter la redirection via une fonction asynchrone
//         function delay(ms: number) {
//           router.replace("/dashboard");
//           console.log("Redirection réussie vers /dashboard");

//           if (!isPending) {
//             setIsPending(false);
//           }
//           toast.success("Connexion réussie !");
//           return new Promise((resolve) => setTimeout(resolve, ms));
//         }
//         await delay(7000);
//         return; // Important : return early
//       }
//     } catch (error) {
//       console.error("Erreur de connexion:", error);
//       toast.error("Erreur lors de la connexion");
//     }
//   };

//   return (
//     <div className={cn("flex flex-col gap-6", className)} {...props}>
//       <Card>
//         <CardHeader>
//           <CardTitle>Connexion</CardTitle>
//           <CardDescription>Entrer vos paramètres de connexion</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
//               <FormField
//                 control={form.control}
//                 name="username"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Username</FormLabel>
//                     <FormControl>
//                       <Input
//                         placeholder="Johndoe33"
//                         {...field}
//                         disabled={isPending}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <FormField
//                 control={form.control}
//                 name="password"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Password</FormLabel>
//                     <FormControl>
//                       <Input
//                         placeholder="*****"
//                         type="password"
//                         {...field}
//                         disabled={isPending}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <Button
//                 type="submit"
//                 className="w-full"
//                 disabled={form.formState.isSubmitting}
//               >
//                 {form.formState.isSubmitting ? "Connexion..." : "Se connecter"}
//               </Button>
//             </form>
//           </Form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

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
import { signIn } from "next-auth/react";
import { useState } from "react";

const signUpSchema = z.object({
  username: z.string().min(5, {
    message: "Username must be at least 5 characters.",
  }),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 8 caractères.")
    .regex(/[A-Za-z0-9]/, {
      message: "Le mot de passe doit inclure des lettres et des chiffres.",
    }),
});

type FormData = z.infer<typeof signUpSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (isPending) return;

    setIsPending(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username: data.username,
        password: data.password,
      });

      console.log("Response from signIn:", res);

      if (res?.error) {
        toast.error("Nom d'utilisateur ou mot de passe incorrect");
        setIsPending(false);
        return;
      }

      if (res?.ok) {
        toast.success("Connexion réussie !");
        router.replace("/dashboard");
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
      toast.error("Erreur lors de la connexion");
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
