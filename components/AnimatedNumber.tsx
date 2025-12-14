"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedNumber({
  value,
  duration = 2,
}: AnimatedNumberProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.floor(latest));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: "easeOut",
    });
    const unsubscribe = rounded.on("change", (latest) => setDisplay(latest));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, duration, count, rounded]);

  return <motion.span>{display.toLocaleString("fr-FR")}</motion.span>;
}
