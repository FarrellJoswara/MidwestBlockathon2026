import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "./ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "dihhapp | Digital Will Distribution",
  description: "Manage digital wills and inheritance distribution on blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans`} style={{ backgroundColor: "#faf8f4", color: "#1f1d1b" }}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
