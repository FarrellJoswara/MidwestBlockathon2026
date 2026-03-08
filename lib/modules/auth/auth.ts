import { NextRequest } from "next/server";
import { getWillById } from "@/lib/modules/chain";
import type { Will, WalletRole } from "@/lib/modules/types";

export function getWalletFromRequest(req: NextRequest): string | null {
  const wallet =
    req.headers.get("x-wallet-address") ??
    req.nextUrl.searchParams.get("wallet") ??
    null;
  if (!wallet || typeof wallet !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return null;
  }
  return wallet.toLowerCase();
}

export function getRoleForWill(will: Will, wallet: string): WalletRole {
  const w = wallet.toLowerCase();
  if (will.executor_wallet.toLowerCase() === w) return "executor";
  if (will.creator_wallet.toLowerCase() === w) return "creator";
  const isBeneficiary = will.pools.some((pool) =>
    pool.beneficiary_wallets.some((b) => b.toLowerCase() === w)
  );
  if (isBeneficiary) return "beneficiary";
  return null;
}

export async function getWillWithRole(
  willId: string,
  wallet: string
): Promise<{ will: Will; role: WalletRole } | null> {
  const will = await getWillById(willId);
  if (!will) return null;
  const role = getRoleForWill(will, wallet);
  return { will, role };
}
