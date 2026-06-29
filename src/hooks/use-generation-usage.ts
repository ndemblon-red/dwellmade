import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Usage = {
  kind: "anonymous" | "paid" | "free";
  used: number;
  limit: number;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useGenerationUsage() {
  const [usage, setUsage] = useState<Usage | null>(null);

  const refresh = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/usage", {
        headers,
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as Usage;
      setUsage(json);
    } catch {
      // ignore — counter just won't show
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { usage, setUsage, refresh };
}

export { authHeaders };
