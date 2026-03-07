"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf8f4",
        color: "#1f1d1b",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Something went wrong</h1>
      <p style={{ marginBottom: "1rem", color: "#555" }}>{error.message}</p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "0.5rem 1rem",
          background: "#1f1d1b",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
