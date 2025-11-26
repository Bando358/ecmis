// components/ui/caduceus-icon.tsx
import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

export const CaduceusIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color = "currentColor", ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Bâton central */}
      <line x1="12" y1="2" x2="12" y2="22" />

      {/* Ailes en haut */}
      <path d="M9 5L12 2L15 5" />
      <path d="M9 5L12 8L15 5" />

      {/* Ailes en bas */}
      <path d="M9 19L12 22L15 19" />
      <path d="M9 19L12 16L15 19" />

      {/* Serpent gauche - spirale */}
      <path d="M10 8C8 10 10 12 8 14C10 16 12 14 10 12" />
      <path d="M10 12C8 14 10 16 8 18" />

      {/* Serpent droit - spirale */}
      <path d="M14 8C16 10 14 12 16 14C14 16 12 14 14 12" />
      <path d="M14 12C16 14 14 16 16 18" />

      {/* Têtes de serpents */}
      <circle cx="8" cy="18" r="0.8" />
      <circle cx="16" cy="18" r="0.8" />
    </svg>
  )
);

CaduceusIcon.displayName = "CaduceusIcon";
