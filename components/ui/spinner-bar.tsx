"use client";

export function SpinnerBar() {
  return (
    <div className="flex items-end justify-center space-x-1">
      <span className="h-8 w-1 bg-primary animate-[wave_1.2s_infinite_ease-in-out] [animation-delay:-0.45s]"></span>
      <span className="h-8 w-1 bg-primary animate-[wave_1.2s_infinite_ease-in-out] [animation-delay:-0.3s]"></span>
      <span className="h-8 w-1 bg-primary animate-[wave_1.2s_infinite_ease-in-out] [animation-delay:-0.15s]"></span>
      <span className="h-8 w-1 bg-primary animate-[wave_1.2s_infinite_ease-in-out]"></span>
    </div>
  );
}
