"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [hinweis, setHinweis] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Kommt von useProfile, wenn ein Konto deaktiviert wurde
    if (new URLSearchParams(window.location.search).has("gesperrt")) {
      setHinweis("Dein Zugang wurde deaktiviert. Bitte wende dich an den Admin.");
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Bitte E-Mail und Passwort eingeben");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      // Bewusst unscharf: Die Meldung verrät nicht, ob die E-Mail existiert.
      // Sonst könnte jemand durch Ausprobieren herausfinden, wer hier ein
      // Konto hat. Die Originalmeldung steht nur in der Konsole.
      console.error("Supabase-Anmeldung:", authError);
      setError("E-Mail oder Passwort falsch");
      setPassword("");
      setLoading(false);
      return;
    }

    // Kam der Benutzer von einer geschützten Seite (z. B. nach einem
    // NFC-Scan), steht das Ziel in der Adresse unter "weiter".
    //
    // Geprüft wird, dass es ein Pfad auf dieser Seite ist: Ohne diese
    // Prüfung könnte jemand einen Link verschicken, der nach der
    // Anmeldung auf eine fremde Seite weiterleitet.
    const weiter = new URLSearchParams(window.location.search).get("weiter");
    const ziel =
      weiter && weiter.startsWith("/") && !weiter.startsWith("//")
        ? weiter
        : "/fahrten";

    router.replace(ziel);
    router.refresh();
  }

  const inputClass =
    "h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none focus:border-[#0FC36B] focus:ring-2 focus:ring-[#0FC36B]/25";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo height={46} alwaysFull />
        </div>

        <h1 className="text-center text-xl font-bold text-slate-900">Anmeldung</h1>
        <p className="mb-6 mt-1 text-center text-sm text-slate-500">
          Melde dich an, um Fahrten zu erfassen.
        </p>

        {hinweis && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-semibold text-amber-800">
            {hinweis}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@firma.at"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            disabled={loading}
            className="h-12 w-full rounded-lg bg-[#0FC36B] text-base font-semibold text-white hover:bg-[#0BA75B] disabled:opacity-60"
          >
            {loading ? "Wird geprüft …" : "Anmelden"}
          </button>
        </form>
      </div>
    </main>
  );
}
