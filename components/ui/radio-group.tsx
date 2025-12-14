"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "inline-block w-5 h-5 border-2 rounded-full relative",
        "data-[state=checked]:border-gray-600 data-[state=checked]:bg-green-400",
        "data-[state=unchecked]:border-slate-600",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="absolute top-1/2 left-1/2 w-2.5 h-2.5 bg-slate-900 dark:bg-zinc-900 rounded-full transform -translate-x-1/2 -translate-y-1/2 data-[state=unchecked]:hidden" />
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
