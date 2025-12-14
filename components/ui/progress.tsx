"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-3 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full flex-1 transition-all rounded-full relative overflow-hidden",
          "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600",
          "shadow-[0_0_8px_rgba(59,130,246,0.7)]"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      >
        {/* Rayures obliques */}
        <div
          className="absolute inset-0 rounded-full opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, white, white 10px, transparent 10px, transparent 20px)",
            backgroundSize: "40px 40px",
            animation: "moveStripes 1s linear infinite",
          }}
        />
      </ProgressPrimitive.Indicator>

      <style jsx>{`
        @keyframes moveStripes {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 40px 0;
          }
        }
      `}</style>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
