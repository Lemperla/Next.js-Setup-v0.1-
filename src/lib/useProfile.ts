"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

/**
 * Holt den angemeldeten Benutzer und sein Profil aus Supabase.
 * Ist niemand angemeldet, geht es zurück zur Login-Seite.
 *
 * Verwendung in einer Seite:
 *   const { profile, loading, error } = useProfile();
 */
export function useProfile() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let aktiv = true;

    async function laden() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: dbError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!aktiv) return;

      if (dbError) {
        setError(`Profil konnte nicht geladen werden: ${dbError.message}`);
        setLoading(false);
        return;
      }

      const geladen = data as Profile;

      // Deaktivierte Benutzer kommen nicht weiter. Ohne das hier würde
      // is_active = false nichts bewirken: Die Anmeldung in auth.users
      // bleibt ja bestehen, und die RLS-Regeln prüfen das Feld nicht.
      if (!geladen.is_active) {
        await supabase.auth.signOut();
        router.replace("/login?gesperrt=1");
        return;
      }

      setProfile(geladen);
      setLoading(false);
    }

    laden();

    return () => {
      aktiv = false;
    };
  }, [router]);

  return { profile, loading, error };
}
