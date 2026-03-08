"use client";

import Link from "next/link";
import { PrivyConnectButton } from "@/components/layout/PrivyConnectButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/60 bg-parchment/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-ink-900 transition-colors hover:text-wine"
        >
          <span className="text-lg text-wine">◆</span>
          <span className="font-serif text-lg font-semibold tracking-tight">
            dihhapp
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/wills"
            className="text-sm text-ink-500 transition-colors hover:text-ink-900"
          >
            My Wills
          </Link>
          <PrivyConnectButton />
        </nav>
      </div>
    </header>
  );
}
