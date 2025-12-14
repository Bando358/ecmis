"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "inline-block w-5 h-5 border-2 rounded-full relative",
      "data-[state=checked]:border-gray-600 data-[state=checked]:bg-green-400",
      "data-[state=unchecked]:border-slate-600",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="absolute top-1/2 left-1/2 w-2.5 h-2.5 bg-slate-900 dark:bg-zinc-900 rounded-full transform -translate-x-1/2 -translate-y-1/2 data-[state=unchecked]:hidden" />
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
