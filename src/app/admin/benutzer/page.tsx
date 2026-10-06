"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { formatDate, type Profile, type Trip, type UserRole } from "@/lib/types";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  role: "driver" as UserRole,
};

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0FC36B] focus:ring-2 focus:ring-[#0FC36B]/25";

/** Erzeugt ein zufälliges Passwort, damit niemand "123456" vergibt */
function zufallsPasswort(): string {
  const zeichen = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const werte = new Uint32Array(12);
  crypto.getRandomValues(werte);
  return Array.from(werte, (n) => zeichen[n % zeichen.length]).join("");
}

export default function AdminBenutzerPage() {
  const { profile, loading: profileLoading } = useProfile();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function ladeBenutzer() {
    const supabase = createClient();
    const [profilesRes, tripsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("trips").select("*"),
    ]);

    if (profilesRes.error) {
      setMessage({
        text: `Benutzer konnten nicht geladen werden: ${profilesRes.error.message}`,
        error: true,
      });
    } else {
      setProfiles((profilesRes.data ?? []) as Profile[]);
      setTrips((tripsRes.data ?? []) as Trip[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!profile) return;
    ladeBenutzer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setMessage({ text: "Bitte Name, E-Mail und Passwort ausfüllen", error: true });
      return;
    }
    if (form.password.length < 8) {
      setMessage({ text: "Das Passwort muss mindestens 8 Zeichen haben", error: true });
      return;
    }

    setSaving(true);

    // Der Anmelde-Token geht mit, damit die Route prüfen kann,
    // dass wirklich ein Admin anfragt.
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const antwort = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(form),
    });

    const ergebnis = await antwort.json().catch(() => ({}));
    setSaving(false);

    if (!antwort.ok) {
      setMessage({
        text: ergebnis.error ?? "Benutzer konnte nicht angelegt werden",
        error: true,
      });
      return;
    }

    setMessage({
      text: `${form.full_name} angelegt. Das Passwort steht noch im Feld – weitergeben, dann Felder leeren.`,
      error: false,
    });
    // Name und E-Mail leeren, Passwort stehen lassen:
    // nach dem Würfeln ist das die einzige Stelle, an der es noch zu sehen ist.
    setForm((alt) => ({ ...emptyForm, password: alt.password }));
    ladeBenutzer();
  }

  async function setRole(ziel: Profile, role: UserRole) {
    if (ziel.role === role) return;

    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", ziel.id);

    if (error) {
      setMessage({ text: `Rolle ändern fehlgeschlagen: ${error.message}`, error: true });
      return;
    }

    setMessage({
      text: `${ziel.full_name} ist jetzt ${role === "admin" ? "Admin" : "Fahrer"}`,
      error: false,
    });
    ladeBenutzer();
  }

  // Benutzer werden nie gelöscht – ihre Fahrten müssen erhalten bleiben.
  async function toggleActive(ziel: Profile) {
    if (ziel.id === profile?.id) {
      setMessage({ text: "Du kannst dich nicht selbst deaktivieren", error: true });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !ziel.is_active })
      .eq("id", ziel.id);

    if (error) {
      setMessage({ text: `Fehlgeschlagen: ${error.message}`, error: true });
      return;
    }

    setMessage({
      text: ziel.is_active
        ? `${ziel.full_name} deaktiviert`
        : `${ziel.full_name} wieder aktiv`,
      error: false,
    });
    ladeBenutzer();
  }

  async function handleDelete(ziel: Profile, tripCount: number) {
    if (tripCount > 0) {
      setMessage({
        text: `${ziel.full_name} hat Fahrten und kann nur deaktiviert werden`,
        error: true,
      });
      return;
    }

    if (!confirm(`${ziel.full_name} endgültig löschen? Das lässt sich nicht rückgängig machen.`)) {
      return;
    }

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const antwort = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ id: ziel.id }),
    });

    const ergebnis = await antwort.json().catch(() => ({}));

    if (!antwort.ok) {
      setMessage({ text: ergebnis.error ?? "Löschen fehlgeschlagen", error: true });
      return;
    }

    setMessage({ text: `${ziel.full_name} gelöscht`, error: false });
    ladeBenutzer();
  }

  if (profileLoading || (profile && loading)) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <main className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-center text-sm text-slate-500">Wird geladen …</p>
        </main>
      </div>
    );
  }

  if (profile && profile.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <TopNav role={profile.role} />
        <main className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">Kein Zugriff</h1>
            <p className="mt-2 text-sm text-slate-500">
              Diese Seite ist nur für Administratoren.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <TopNav role="admin" active="benutzer" />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Benutzerverwaltung</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Benutzer anlegen, Rollen vergeben und deaktivieren.
        </p>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Benutzer anlegen</h2>

          <form onSubmit={handleCreate}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Vor- und Nachname"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  E-Mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoCapitalize="none"
                  placeholder="name@firma.at"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Startpasswort
                </label>
                <div className="flex gap-2">
                  <input
                    id="password"
                    type="text"
                    placeholder="mind. 8 Zeichen"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, password: zufallsPasswort() })}
                    title="Zufälliges Passwort erzeugen"
                    className="h-11 shrink-0 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Würfeln
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="role" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Rolle
                </label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className={inputClass}
                >
                  <option value="driver">Fahrer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Das Passwort wird im Klartext angezeigt, damit du es weitergeben kannst.
              Der neue Benutzer sollte es nach der ersten Anmeldung ändern.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-lg bg-[#0FC36B] px-5 text-sm font-semibold text-white hover:bg-[#0BA75B] disabled:opacity-60"
              >
                {saving ? "Wird angelegt …" : "Benutzer anlegen"}
              </button>
              {form.password && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(emptyForm);
                    setMessage(null);
                  }}
                  className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Felder leeren
                </button>
              )}
            </div>
          </form>

          {message && (
            <p
              className={
                message.error
                  ? "mt-4 break-all text-sm font-semibold text-red-600"
                  : "mt-4 break-all text-sm font-semibold text-[#0A7D46]"
              }
            >
              {message.text}
            </p>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {["Name", "Rolle", "Angelegt", "Fahrten", "Status", "Aktionen"].map((head) => (
                  <th
                    key={head}
                    className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const tripCount = trips.filter((t) => t.driver_id === p.id).length;
                const isSelf = p.id === profile?.id;

                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                      {p.full_name}
                      {isSelf && (
                        <span className="ml-2 text-xs font-normal text-slate-400">(du)</span>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <select
                        value={p.role}
                        onChange={(e) => setRole(p, e.target.value as UserRole)}
                        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0FC36B]"
                      >
                        <option value="driver">Fahrer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-500">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                      {tripCount}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <span
                        className={
                          p.is_active
                            ? "rounded-full bg-[#D2F6E3] px-2.5 py-0.5 text-xs font-semibold text-[#0A6B3C]"
                            : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500"
                        }
                      >
                        {p.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => toggleActive(p)}
                          disabled={isSelf}
                          className="h-9 whitespace-nowrap rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                          {p.is_active ? "Deaktivieren" : "Aktivieren"}
                        </button>
                        {/* Löschen nur ohne Fahrten – das Fahrtenbuch muss lückenlos bleiben */}
                        {tripCount === 0 && !isSelf && (
                          <button
                            type="button"
                            onClick={() => handleDelete(p, tripCount)}
                            className="h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
