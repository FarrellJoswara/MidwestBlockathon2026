"use client";

import { useEffect, useState } from "react";
import { StyleSheetManager } from "styled-components";
import { Providers } from "./providers";
import Header from "@/components/layout/Header";

/** Prevent Privy/Headless UI styled-components from forwarding isActive to the DOM (React warning). */
function shouldForwardProp(propName: string): boolean {
  return propName !== "isActive" && propName !== "isactive";
}

const loadingFallback = (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#faf8f4",
      color: "#1f1d1b",
      fontFamily: "system-ui, sans-serif",
    }}
  >
    <p>Loading dihhapp…</p>
  </div>
);

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return loadingFallback;
  }

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <Providers>
        <Header />
        {children}
      </Providers>
    </StyleSheetManager>
  );
}
