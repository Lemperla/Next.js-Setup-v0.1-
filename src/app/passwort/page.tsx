"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";

const inputClass =
  "h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none focus:border-[#0FC36B] focus:ring-2 focus:ring-[#0FC36B]/25";

export default function PasswortPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();

  const [neu, setNeu] = useState("");
  const [wiederholung, setWiederholung] = useState("");
  const [error, setError] = useState("");
  const [fertig, setFertig] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (neu.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen haben");
      return;
    }
    if (neu !== wiederholung) {
      setError("Die beiden Eingaben stimmen nicht überein");
      return;
    }

    setSaving(true);

    // Ändert das Passwort des angemeldeten Benutzers.
    // Braucht keinen geheimen Schlüssel – Supabase weiß aus der
    // Anmeldung, um wen es geht.
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password: neu });

    setSaving(false);

    if (authError) {
      console.error("Passwort ändern:", authError);
      setError(`Ändern fehlgeschlagen: ${authError.message}`);
      return;
    }

    setNeu("");
    setWiederholung("");
    setFertig(true);
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <main className="mx-auto max-w-md px-4 py-10">
          <p className="text-center text-sm text-slate-500">Wird geladen …</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <TopNav role={profile?.role ?? "driver"} />

      <main className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Passwort ändern</h1>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            {profile ? `Angemeldet als ${profile.full_name}` : ""}
          </p>

          {fertig ? (
            <>
              <p className="rounded-lg border border-[#B7EED4] bg-[#E9FBF2] px-3.5 py-3 text-sm font-semibold text-[#0A5E35]">
                Passwort geändert. Beim nächsten Anmelden gilt das neue.
              </p>
              <button
                type="button"
                onClick={() => router.push("/fahrten")}
                className="mt-4 h-12 w-full rounded-lg border border-slate-300 text-sm font-semibold text-[#0A7D46] hover:bg-[#E9FBF2]"
              >
                Zu meinen Fahrten
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="neu" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Neues Passwort
                </label>
                <input
                  id="neu"
                  type="password"
                  autoComplete="new-password"
                  placeholder="mindestens 8 Zeichen"
                  value={neu}
                  onChange={(e) => setNeu(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="wiederholung" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Noch einmal zur Sicherheit
                </label>
                <input
                  id="wiederholung"
                  type="password"
                  autoComplete="new-password"
                  value={wiederholung}
                  onChange={(e) => setWiederholung(e.target.value)}
                  className={inputClass}
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="h-12 w-full rounded-lg bg-[#0FC36B] text-base font-semibold text-white hover:bg-[#0BA75B] disabled:opacity-60"
              >
                {saving ? "Wird geändert …" : "Passwort ändern"}
              </button>

              <p className="text-xs text-slate-500">
                Wenn dir ein Admin ein Startpasswort gegeben hat, solltest du es
                hier ändern – sonst kennt er es weiterhin.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
