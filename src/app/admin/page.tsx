"use client";

import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import {
  formatDate,
  formatKm,
  tripTypeLabel,
  type Profile,
  type Trip,
  type Vehicle,
} from "@/lib/types";

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0FC36B] focus:ring-2 focus:ring-[#0FC36B]/25";

export default function AuswertungPage() {
  const { profile, loading: profileLoading } = useProfile();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [driverFilter, setDriverFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => {
    if (!profile) return;
    let aktiv = true;

    async function laden() {
      const supabase = createClient();

      const [profilesRes, vehiclesRes, tripsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("vehicles").select("*").order("license_plate"),
        supabase.from("trips").select("*").order("trip_date", { ascending: false }),
      ]);

      if (!aktiv) return;

      const ersterFehler =
        profilesRes.error ?? vehiclesRes.error ?? tripsRes.error;

      if (ersterFehler) {
        setError(`Daten konnten nicht geladen werden: ${ersterFehler.message}`);
      } else {
        setProfiles((profilesRes.data ?? []) as Profile[]);
        setVehicles((vehiclesRes.data ?? []) as Vehicle[]);
        setAllTrips((tripsRes.data ?? []) as Trip[]);
      }
      setLoading(false);
    }

    laden();

    return () => {
      aktiv = false;
    };
  }, [profile]);

  const months = useMemo(() => {
    const list: string[] = [];
    allTrips.forEach((trip) => {
      const value = trip.trip_date.slice(0, 7);
      if (!list.includes(value)) list.push(value);
    });
    return list.sort().reverse();
  }, [allTrips]);

  const trips = useMemo(() => {
    let result = allTrips;
    if (driverFilter) result = result.filter((t) => t.driver_id === driverFilter);
    if (vehicleFilter) result = result.filter((t) => t.vehicle_id === vehicleFilter);
    if (monthFilter) result = result.filter((t) => t.trip_date.slice(0, 7) === monthFilter);
    return result;
  }, [allTrips, driverFilter, vehicleFilter, monthFilter]);

  const totalKm = trips.reduce((sum, t) => sum + t.distance_km, 0);
  const businessKm = trips
    .filter((t) => t.trip_type === "business")
    .reduce((sum, t) => sum + t.distance_km, 0);

  function driverName(id: string) {
    return profiles.find((p) => p.id === id)?.full_name ?? "–";
  }

  function plate(id: string) {
    return vehicles.find((v) => v.id === id)?.license_plate ?? "–";
  }

  function exportCsv() {
    const kopf = [
      "Datum", "Fahrer", "Fahrzeug", "Von", "Nach",
      "Zweck", "Start-km", "End-km", "Kilometer", "Art",
    ];

    // Anführungszeichen im Text verdoppeln, sonst zerfällt die Spalte
    const feld = (wert: string | number) => `"${String(wert).replace(/"/g, '""')}"`;

    const zeilen = trips.map((t) =>
      [
        formatDate(t.trip_date),
        driverName(t.driver_id),
        plate(t.vehicle_id),
        t.start_location,
        t.end_location,
        t.purpose,
        t.start_km,
        t.end_km,
        t.distance_km,
        tripTypeLabel(t.trip_type),
      ].map(feld).join(";"),
    );

    // Semikolon und BOM, damit Excel auf Deutsch die Spalten richtig trennt
    const inhalt = "﻿" + [kopf.map(feld).join(";"), ...zeilen].join("\r\n");

    const blob = new Blob([inhalt], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drivetag-fahrten-${monthFilter || "alle"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      <TopNav role="admin" active="admin" />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Auswertung</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Alle Fahrten filtern, zusammenzählen und exportieren.
        </p>

        {error && (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Benutzer", value: profiles.filter((p) => p.is_active).length },
            { label: "Fahrzeuge", value: vehicles.filter((v) => v.is_active).length },
            { label: "Fahrten", value: trips.length },
            { label: "Kilometer gesamt", value: formatKm(totalKm) },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Alle Fahrten</h2>
            <button
              type="button"
              onClick={exportCsv}
              disabled={trips.length === 0}
              className="h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-[#0A7D46] hover:bg-[#E9FBF2] disabled:opacity-50"
            >
              Als CSV exportieren
            </button>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="driver" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Fahrer
              </label>
              <select
                id="driver"
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">Alle Fahrer</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="vehicle" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Fahrzeug
              </label>
              <select
                id="vehicle"
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">Alle Fahrzeuge</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="month" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Monat
              </label>
              <select
                id="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">Alle Monate</option>
                {months.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mb-4 text-sm text-slate-500">
            Davon beruflich:{" "}
            <span className="font-semibold text-slate-900">{formatKm(businessKm)} km</span>
          </p>

          {trips.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              Keine Fahrten gefunden.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[1000px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    {["Datum", "Fahrer", "Fahrzeug", "Von", "Nach", "Zweck", "Start", "Ende", "km", "Art"].map(
                      (head) => (
                        <th
                          key={head}
                          className="whitespace-nowrap border-b border-slate-200 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {head}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => {
                    const isBusiness = trip.trip_type === "business";

                    return (
                      <tr key={trip.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap border-b border-slate-100 px-3.5 py-2.5">
                          {formatDate(trip.trip_date)}
                        </td>
                        <td className="border-b border-slate-100 px-3.5 py-2.5">
                          {driverName(trip.driver_id)}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3.5 py-2.5">
                          {plate(trip.vehicle_id)}
                        </td>
                        <td className="border-b border-slate-100 px-3.5 py-2.5">
                          {trip.start_location}
                        </td>
                        <td className="border-b border-slate-100 px-3.5 py-2.5">
                          {trip.end_location}
                        </td>
                        <td className="border-b border-slate-100 px-3.5 py-2.5 text-slate-500">
                          {trip.purpose}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3.5 py-2.5 text-right tabular-nums">
                          {formatKm(trip.start_km)}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3.5 py-2.5 text-right tabular-nums">
                          {formatKm(trip.end_km)}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3.5 py-2.5 text-right font-bold tabular-nums">
                          {formatKm(trip.distance_km)}
                        </td>
                        <td className="border-b border-slate-100 px-3.5 py-2.5">
                          <span
                            className={
                              isBusiness
                                ? "rounded-full bg-[#D2F6E3] px-2.5 py-0.5 text-xs font-semibold text-[#0A6B3C]"
                                : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                            }
                          >
                            {tripTypeLabel(trip.trip_type)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
