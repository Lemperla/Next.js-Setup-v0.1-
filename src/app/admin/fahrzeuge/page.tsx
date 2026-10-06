"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { formatKm, vehicleName, type Trip, type Vehicle } from "@/lib/types";

const emptyForm = { license_plate: "", make: "", model: "", current_odometer_km: "" };

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0FC36B] focus:ring-2 focus:ring-[#0FC36B]/25";

export default function AdminFahrzeugePage() {
  const { profile, loading: profileLoading } = useProfile();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function ladeFahrzeuge() {
    const supabase = createClient();
    const [vehiclesRes, tripsRes] = await Promise.all([
      supabase.from("vehicles").select("*").order("license_plate"),
      supabase.from("trips").select("*"),
    ]);

    if (vehiclesRes.error) {
      setMessage({
        text: `Fahrzeuge konnten nicht geladen werden: ${vehiclesRes.error.message}`,
        error: true,
      });
    } else {
      setVehicles((vehiclesRes.data ?? []) as Vehicle[]);
      setTrips((tripsRes.data ?? []) as Trip[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!profile) return;
    ladeFahrzeuge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function setField(field: keyof typeof emptyForm, value: string) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    const plate = form.license_plate.trim();
    if (!plate) {
      setMessage({ text: "Bitte ein Kennzeichen eingeben", error: true });
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const werte = {
      license_plate: plate,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      current_odometer_km: Number(form.current_odometer_km) || 0,
    };

    // nfc_token erzeugt die Datenbank selbst
    const { error } = editing
      ? await supabase.from("vehicles").update(werte).eq("id", editing.id)
      : await supabase
          .from("vehicles")
          .insert({ ...werte, organization_id: profile.organization_id });

    setSaving(false);

    if (error) {
      console.error("Fahrzeug speichern:", error);
      setMessage({ text: `Speichern fehlgeschlagen: ${error.message}`, error: true });
      return;
    }

    setMessage({
      text: editing ? "Fahrzeug geändert" : "Fahrzeug hinzugefügt",
      error: false,
    });
    resetForm();
    ladeFahrzeuge();
  }

  function startEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setForm({
      license_plate: vehicle.license_plate,
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      current_odometer_km: String(vehicle.current_odometer_km),
    });
    setMessage(null);
    window.scrollTo(0, 0);
  }

  // Fahrzeuge werden nie gelöscht – Fahrten hängen daran. Stattdessen stilllegen.
  async function toggleActive(vehicle: Vehicle) {
    const supabase = createClient();
    const { error } = await supabase
      .from("vehicles")
      .update({ is_active: !vehicle.is_active })
      .eq("id", vehicle.id);

    if (error) {
      setMessage({ text: `Fehlgeschlagen: ${error.message}`, error: true });
      return;
    }

    setMessage({
      text: vehicle.is_active
        ? `${vehicle.license_plate} stillgelegt`
        : `${vehicle.license_plate} wieder aktiv`,
      error: false,
    });
    ladeFahrzeuge();
  }

  function copyTagUrl(vehicle: Vehicle) {
    const url = `${window.location.origin}/scan/${vehicle.nfc_token}`;
    navigator.clipboard.writeText(url);
    setMessage({ text: `Adresse kopiert: ${url}`, error: false });
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
      <TopNav role="admin" active="fahrzeuge" />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Fahrzeugverwaltung</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Fahrzeuge anlegen, bearbeiten und stilllegen.
        </p>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {editing ? `${editing.license_plate} bearbeiten` : "Fahrzeug hinzufügen"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="plate" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Kennzeichen
                </label>
                <input
                  id="plate"
                  type="text"
                  placeholder="z. B. SL-123AB"
                  value={form.license_plate}
                  onChange={(e) => setField("license_plate", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="make" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Marke
                </label>
                <input
                  id="make"
                  type="text"
                  placeholder="z. B. VW"
                  value={form.make}
                  onChange={(e) => setField("make", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="model" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Modell
                </label>
                <input
                  id="model"
                  type="text"
                  placeholder="z. B. Golf"
                  value={form.model}
                  onChange={(e) => setField("model", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="km" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Kilometerstand
                </label>
                <input
                  id="km"
                  type="number"
                  inputMode="numeric"
                  placeholder="z. B. 50120"
                  value={form.current_odometer_km}
                  onChange={(e) => setField("current_odometer_km", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Das NFC-Token erzeugt die Datenbank automatisch. Nach dem Anlegen
              steht es in der Tabelle, ein Klick darauf kopiert die Tag-Adresse.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-lg bg-[#0FC36B] px-5 text-sm font-semibold text-white hover:bg-[#0BA75B] disabled:opacity-60"
              >
                {saving ? "Wird gespeichert …" : editing ? "Änderungen speichern" : "Fahrzeug hinzufügen"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Abbrechen
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
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {["Kennzeichen", "Fahrzeug", "Kilometerstand", "Fahrten", "Status", "Aktionen"].map((head) => (
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
              {vehicles.map((vehicle) => {
                const tripCount = trips.filter((t) => t.vehicle_id === vehicle.id).length;

                return (
                  <tr key={vehicle.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3">
                      <span className="block font-bold text-slate-900">
                        {vehicle.license_plate}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyTagUrl(vehicle)}
                        className="mt-0.5 font-mono text-[11px] text-slate-400 hover:text-[#0A7D46]"
                        title="Adresse für den NFC-Tag kopieren"
                      >
                        {vehicle.nfc_token.slice(0, 8)}… kopieren
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">{vehicleName(vehicle)}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                      {formatKm(vehicle.current_odometer_km)} km
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                      {tripCount}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <span
                        className={
                          vehicle.is_active
                            ? "rounded-full bg-[#D2F6E3] px-2.5 py-0.5 text-xs font-semibold text-[#0A6B3C]"
                            : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500"
                        }
                      >
                        {vehicle.is_active ? "Aktiv" : "Stillgelegt"}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(vehicle)}
                          className="h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:border-[#0FC36B] hover:text-[#0A7D46]"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(vehicle)}
                          className="h-9 whitespace-nowrap rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {vehicle.is_active ? "Stilllegen" : "Aktivieren"}
                        </button>
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
