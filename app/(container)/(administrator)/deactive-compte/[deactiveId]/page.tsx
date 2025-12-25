"use client";
import { use } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox"; // Assurez-vous d'importer le composant Checkbox
import { Label } from "@/components/ui/label"; // Assurez-vous d'importer le composant Label

const formSchema = z.object({
  notifications: z.boolean(), // Ajout du champ pour la checkbox
});

export default function DeactivePage({
  params,
}: {
  params: Promise<{ deactiveId: string }>;
}) {
  const { deactiveId } = use(params);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notifications: false, // Valeur par défaut correspondant au defaultChecked
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // Traitement du formulaire
  }
  return (
    <div className="flex flex-col gap-6 justify-center items-center mt-10">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="p-4 max-w-md bg-white mx-auto rounded-md shadow-md   space-y-4"
        >
          {/* Ajout du champ checkbox */}
          <FormField
            control={form.control}
            name="notifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Notifications</FormLabel>
                <FormControl>
                  <Label className=" hover:bg-blue-400/50 flex items-start gap-3 rounded-lg border p-3 has-aria-checked:border-blue-600 has-aria-checked:bg-blue-50 dark:has-aria-checked:border-blue-900 dark:has-aria-checked:bg-blue-950 cursor-pointer">
                    <Checkbox
                      id="toggle-2"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                    />
                    <div className="grid gap-1.5 font-normal">
                      <p className="text-sm leading-none font-medium">
                        Enable notifications
                      </p>
                      <p className="text-muted-foreground text-sm">
                        You can enable or disable notifications at any time.
                      </p>
                    </div>
                  </Label>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Mettre le bouton à droite */}
          <Button type="submit" className="float-right">
            Submit
          </Button>
        </form>
      </Form>
    </div>
  );
}
