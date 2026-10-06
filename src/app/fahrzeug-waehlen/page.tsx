"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { formatKm, vehicleName, type Vehicle } from "@/lib/types";

/**
 * Ersatzweg, falls ein NFC-Tag fehlt oder nicht funktioniert.
 * Führt auf dieselbe Scan-Seite wie der Tag.
 *
 * Falls ihr euch gegen diesen Weg entscheidet: Diesen Ordner löschen
 * und in src/app/fahrten/page.tsx den Link "Fahrt ohne NFC-Tag erfassen" entfernen.
 */
export default function FahrzeugWaehlenPage() {
  const { profile, loading: profileLoading } = useProfile();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let aktiv = true;

    async function laden() {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("is_active", true)
        .order("license_plate");

      if (!aktiv) return;

      if (dbError) {
        setError(`Fahrzeuge konnten nicht geladen werden: ${dbError.message}`);
      } else {
        setVehicles((data ?? []) as Vehicle[]);
      }
      setLoading(false);
    }

    laden();

    return () => {
      aktiv = false;
    };
  }, []);

  if (profileLoading || loading) {
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
          <h1 className="text-xl font-bold text-slate-900">Fahrzeug wählen</h1>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Normalerweise öffnet sich die Erfassung über den NFC-Tag im Fahrzeug.
            Wenn der Tag fehlt oder nicht reagiert, wähle das Fahrzeug hier aus.
          </p>

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          {vehicles.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              Kein aktives Fahrzeug vorhanden.
            </p>
          ) : (
            <ul className="space-y-3">
              {vehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link
                    href={`/scan/${vehicle.nfc_token}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 hover:border-[#0FC36B] hover:bg-[#E9FBF2]"
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-bold text-slate-900">
                        {vehicle.license_plate}
                      </span>
                      <span className="block truncate text-sm text-slate-500">
                        {vehicleName(vehicle)} · {formatKm(vehicle.current_odometer_km)} km
                      </span>
                    </span>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/fahrten"
            className="mt-5 block py-2 text-center text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Abbrechen
          </Link>
        </div>
      </main>
    </div>
  );
}
