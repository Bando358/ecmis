// components / InactivityDebug.tsx;

"use client";
import { useEffect, useState, useRef } from "react";

export default function InactivityDebug() {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [lastActivity, setLastActivity] = useState<string>("Aucune");
  const [position, setPosition] = useState({ x: 10, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;

    const INACTIVITY_LIMIT = 15 * 60 * 1000;

    const updateDebugInfo = () => {
      const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("lastActivity="));

      if (cookie) {
        const timestamp = parseInt(cookie.split("=")[1], 10);
        const now = Date.now();
        const elapsed = now - timestamp;
        const remaining = Math.max(
          0,
          Math.floor((INACTIVITY_LIMIT - elapsed) / 1000)
        );

        setLastActivity(new Date(timestamp).toLocaleTimeString());
        setTimeRemaining(remaining);
      } else {
        setLastActivity("Aucune activité");
        setTimeRemaining(0);
      }
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    const saved = localStorage.getItem("inactivityDebugPosition");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.x !== undefined && parsed.y !== undefined) {
          setPosition(parsed);
        }
      } catch {}
    }
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPos = {
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        };
        setPosition(newPos);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem(
          "inactivityDebugPosition",
          JSON.stringify(position)
        );
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, position, isClient]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setIsDragging(true);
    }
  };

  if (process.env.NODE_ENV !== "development" || !isClient) return null;

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      className={`${timeRemaining > 125 ? "hidden" : ""}`}
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        background: "rgba(0,0,0,0.9)",
        color: "white",
        padding: "15px",
        borderRadius: "8px",
        fontSize: "14px",
        zIndex: 9999,
        fontFamily: "monospace",
        border: "2px solid #00ff00",
        width: "220px",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
    >
      <div>
        <strong>🧩 INACTIVITY DEBUG</strong>
      </div>
      <div>Last Activity: {lastActivity}</div>
      <div>
        Time Remaining:{" "}
        <span
          style={{
            color:
              timeRemaining < 30
                ? "#ff4444"
                : timeRemaining < 60
                ? "#ffaa00"
                : "#44ff44",
            fontWeight: "bold",
          }}
        >
          {timeRemaining}s
        </span>
      </div>
      <div>
        Status:{" "}
        <span style={{ color: timeRemaining === 0 ? "#ff4444" : "#44ff44" }}>
          {timeRemaining === 0 ? "INACTIVE" : "MONITORING"}
        </span>
      </div>
    </div>
  );
}
