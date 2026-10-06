"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { formatKm, vehicleName, type TripType, type Vehicle } from "@/lib/types";

type Props = {
  params: Promise<{ token: string }>;
};

const inputClass =
  "h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none focus:border-[#0FC36B] focus:ring-2 focus:ring-[#0FC36B]/25";

export default function ScanPage({ params }: Props) {
  const { token } = use(params);
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const [tripDate, setTripDate] = useState(today);
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [tripType, setTripType] = useState<TripType | "">("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fahrzeug über das NFC-Token aus der Datenbank holen
  useEffect(() => {
    let aktiv = true;

    async function laden() {
      const supabase = createClient();
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .eq("nfc_token", token)
        .maybeSingle();

      if (!aktiv) return;

      if (data) {
        const v = data as Vehicle;
        setVehicle(v);
        setStartKm(String(v.current_odometer_km));
      }
      setLoadingVehicle(false);
    }

    laden();

    return () => {
      aktiv = false;
    };
  }, [token]);

  const start = Number(startKm);
  const end = Number(endKm);
  const distance = startKm && endKm && end > start ? end - start : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!vehicle) return;

    if (!tripDate) {
      setError("Bitte ein Datum wählen");
      return;
    }
    if (tripDate > today) {
      setError("Das Datum darf nicht in der Zukunft liegen");
      return;
    }
    if (!endKm) {
      setError("Bitte den End-Kilometerstand eingeben");
      return;
    }
    if (startKm && start < vehicle.current_odometer_km) {
      setError(
        `Der Start-Kilometerstand darf nicht unter ${formatKm(
          vehicle.current_odometer_km,
        )} km liegen`,
      );
      return;
    }
    if (end <= start) {
      setError("Der End-Kilometerstand muss größer als der Start sein");
      return;
    }
    if (!startLocation.trim() || !endLocation.trim()) {
      setError("Bitte Startort und Zielort eingeben");
      return;
    }
    if (!tripType) {
      setError("Bitte Beruflich oder Privat wählen");
      return;
    }
    if (!purpose.trim()) {
      setError("Bitte den Zweck der Fahrt eingeben");
      return;
    }

    setSaving(true);

    // organization_id, driver_id und distance_km setzt die Datenbank selbst.
    const supabase = createClient();
    const { error: dbError } = await supabase.from("trips").insert({
      vehicle_id: vehicle.id,
      trip_date: tripDate,
      start_km: start,
      end_km: end,
      start_location: startLocation.trim(),
      end_location: endLocation.trim(),
      trip_type: tripType,
      purpose: purpose.trim(),
    });

    if (dbError) {
      console.error("Fahrt speichern:", dbError);
      setError(`Speichern fehlgeschlagen: ${dbError.message}`);
      setSaving(false);
      return;
    }

    router.push("/fahrten");
    router.refresh();
  }

  if (profileLoading || loadingVehicle) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <main className="mx-auto max-w-md px-4 py-10">
          <p className="text-center text-sm text-slate-500">Wird geladen …</p>
        </main>
      </div>
    );
  }

  // Kein Fahrzeug zu diesem Token
  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <TopNav role={profile?.role ?? "driver"} />
        <main className="mx-auto max-w-md px-4 py-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">Fahrzeug nicht erkannt</h1>
            <p className="mt-2 text-sm text-slate-500">
              Zu diesem NFC-Tag ist kein Fahrzeug hinterlegt.
            </p>
            <p className="mt-4 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
              Token: {token}
            </p>
            <Link
              href="/fahrten"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold text-[#0A7D46] hover:bg-[#E9FBF2]"
            >
              Zu meinen Fahrten
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Die Datenbank lehnt Fahrten auf stillgelegte Fahrzeuge ab
  if (!vehicle.is_active) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <TopNav role={profile?.role ?? "driver"} />
        <main className="mx-auto max-w-md px-4 py-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">Fahrzeug stillgelegt</h1>
            <p className="mt-2 text-sm text-slate-500">
              {vehicle.license_plate} ist derzeit nicht aktiv. Bitte beim Admin melden.
            </p>
            <Link
              href="/fahrten"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold text-[#0A7D46] hover:bg-[#E9FBF2]"
            >
              Zu meinen Fahrten
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <TopNav role={profile?.role ?? "driver"} />

      <main className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3 rounded-lg bg-[#E9FBF2] p-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0FC36B]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8.5a5 5 0 0 1 0 7" />
                <path d="M9.5 6a9 9 0 0 1 0 12" />
                <path d="M13 3.5a13 13 0 0 1 0 17" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[#0A5E35]/70">Fahrzeug erkannt</p>
              <p className="truncate text-base font-bold text-[#0A5E35]">
                {vehicle.license_plate} · {vehicleName(vehicle)}
              </p>
            </div>
          </div>

          <h1 className="text-xl font-bold text-slate-900">Fahrt erfassen</h1>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            {profile ? `Angemeldet als ${profile.full_name}` : "Nicht angemeldet"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="tripDate" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Datum
              </label>
              <input
                id="tripDate"
                type="date"
                max={today}
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="startKm" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Start-km
                </label>
                <input
                  id="startKm"
                  type="number"
                  inputMode="numeric"
                  value={startKm}
                  onChange={(e) => setStartKm(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="endKm" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  End-km
                </label>
                <input
                  id="endKm"
                  type="number"
                  inputMode="numeric"
                  placeholder={formatKm(vehicle.current_odometer_km + 50)}
                  value={endKm}
                  onChange={(e) => setEndKm(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <p className="-mt-1 text-xs text-slate-500">
              Letzter Stand: {formatKm(vehicle.current_odometer_km)} km
            </p>

            <div>
              <label htmlFor="startLocation" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Startort
              </label>
              <input
                id="startLocation"
                type="text"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder="z. B. Innsbruck, Firmenzentrale"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="endLocation" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Zielort
              </label>
              <input
                id="endLocation"
                type="text"
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                placeholder="z. B. Wattens, Kunde"
                className={inputClass}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Art der Fahrt</span>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { value: "business", label: "Beruflich" },
                    { value: "private", label: "Privat" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTripType(option.value)}
                    aria-pressed={tripType === option.value}
                    className={
                      tripType === option.value
                        ? "h-12 rounded-lg bg-[#0FC36B] text-base font-semibold text-white"
                        : "h-12 rounded-lg border border-slate-300 bg-white text-base font-semibold text-slate-700 hover:border-[#0FC36B] hover:text-[#0A7D46]"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="purpose" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Zweck der Fahrt
              </label>
              <input
                id="purpose"
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="z. B. Kundenbesuch Swarovski"
                className={inputClass}
              />
            </div>

            <div className="rounded-lg border border-[#B7EED4] bg-[#E9FBF2] px-4 py-3 text-center">
              <span className="text-lg font-semibold text-[#0A5E35]">
                Gefahren: {distance === null ? "–" : formatKm(distance)} km
              </span>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[#0FC36B] py-4 text-base font-semibold text-white hover:bg-[#0BA75B] disabled:opacity-60"
            >
              {saving ? "Wird gespeichert …" : "Fahrt speichern"}
            </button>

            <Link
              href="/fahrten"
              className="block py-2 text-center text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Abbrechen
            </Link>
          </form>
        </div>
      </main>
    </div>
  );
}
