function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function apiFetch(
  path: string,
  options: RequestInit & { wallet?: string } = {}
) {
  const { wallet, ...init } = options;
  const headers = new Headers(init.headers);
  if (wallet) headers.set("x-wallet-address", wallet);
  const res = await fetch(`${getBaseUrl()}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json();
}
