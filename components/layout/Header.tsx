"use client";

import Link from "next/link";
import { PrivyConnectButton } from "@/components/layout/PrivyConnectButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-parchment/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink-900">
          <span className="text-seal">◆</span>
          dihhapp
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/wills" className="text-sm text-ink-600 hover:text-ink-900">
            My Wills
          </Link>
          <PrivyConnectButton />
        </nav>
      </div>
    </header>
  );
}
