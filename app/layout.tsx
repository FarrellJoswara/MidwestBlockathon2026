import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import ClientProviders from "./ClientProviders";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "fossl — Digital Inheritance & Will Distribution",
  description:
    "Secure, on-chain will management. Upload your will, designate beneficiaries, and let executors handle distribution — all without storing your keys.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${playfair.variable} ${sourceSans.variable} font-sans`}
        style={{ backgroundColor: "#faf8f4", color: "#1f1d1b" }}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
