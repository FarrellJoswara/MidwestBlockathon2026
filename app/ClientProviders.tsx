"use client";

import dynamic from "next/dynamic";

const Providers = dynamic(() => import("./providers").then((m) => m.Providers), {
  ssr: false,
  loading: () => (
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
  ),
});

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
