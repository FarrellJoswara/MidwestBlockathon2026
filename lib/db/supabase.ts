import { createClient } from "@supabase/supabase-js";
import type { Will } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key-for-build";

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function getWillsByWallet(wallet: string): Promise<Will[]> {
  const { data: asCreator } = await supabase
    .from("wills")
    .select("*")
    .eq("creator_wallet", wallet)
    .order("created_at", { ascending: false });
  const { data: asExecutor } = await supabase
    .from("wills")
    .select("*")
    .eq("executor_wallet", wallet)
    .order("created_at", { ascending: false });
  const { data: asBeneficiary } = await supabase
    .from("wills")
    .select("*")
    .contains("beneficiary_wallets", [wallet])
    .order("created_at", { ascending: false });

  const seen = new Set<string>();
  const combined: Will[] = [];
  for (const list of [asCreator, asExecutor, asBeneficiary]) {
    for (const row of list ?? []) {
      const w = row as Will;
      if (!seen.has(w.id)) {
        seen.add(w.id);
        combined.push(w);
      }
    }
  }
  combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return combined;
}

export async function getWillById(id: string): Promise<Will | null> {
  const { data, error } = await supabase.from("wills").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Will;
}

export async function createWill(row: {
  creator_wallet: string;
  executor_wallet: string;
  beneficiary_wallets: string[];
  beneficiary_percentages: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
}): Promise<Will> {
  const { data, error } = await supabase
    .from("wills")
    .insert({
      ...row,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Will;
}

export async function updateWill(
  id: string,
  updates: {
    beneficiary_wallets?: string[];
    beneficiary_percentages?: number[];
    ipfs_cid?: string | null;
    encrypted_doc_key_iv?: string | null;
    status?: Will["status"];
  }
): Promise<Will> {
  const { data, error } = await supabase
    .from("wills")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Will;
}
