"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import {
  formatDate,
  formatKm,
  tripTypeLabel,
  vehicleName,
  type Trip,
  type Vehicle,
} from "@/lib/types";

const monthNames = [
  "Jänner", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function monthLabel(value: string): string {
  const [year, month] = value.split("-");
  return `${monthNames[Number(month) - 1]} ${year}`;
}

export default function FahrtenPage() {
  const { profile, loading: profileLoading, error: profileError } = useProfile();

  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");

  useEffect(() => {
    if (!profile) return;
    let aktiv = true;

    async function laden() {
      const supabase = createClient();

      // Nur die eigenen Fahrten. Ein Admin dürfte laut RLS alle sehen –
      // auf dieser Seite wollen wir aber bewusst nur die eigenen.
      const [tripsRes, vehiclesRes] = await Promise.all([
        supabase
          .from("trips")
          .select("*")
          .eq("driver_id", profile!.id)
          .order("trip_date", { ascending: false }),
        supabase.from("vehicles").select("*"),
      ]);

      if (!aktiv) return;

      if (tripsRes.error) {
        setError(`Fahrten konnten nicht geladen werden: ${tripsRes.error.message}`);
      } else if (vehiclesRes.error) {
        setError(`Fahrzeuge konnten nicht geladen werden: ${vehiclesRes.error.message}`);
      } else {
        setAllTrips((tripsRes.data ?? []) as Trip[]);
        setVehicles((vehiclesRes.data ?? []) as Vehicle[]);
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

  const trips = useMemo(
    () =>
      month
        ? allTrips.filter((trip) => trip.trip_date.slice(0, 7) === month)
        : allTrips,
    [allTrips, month],
  );

  const totalKm = trips.reduce((sum, trip) => sum + trip.distance_km, 0);
  const businessKm = trips
    .filter((trip) => trip.trip_type === "business")
    .reduce((sum, trip) => sum + trip.distance_km, 0);

  function vehicleFor(id: string): Vehicle | undefined {
    return vehicles.find((v) => v.id === id);
  }

  if (profileLoading || (profile && loading)) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <main className="mx-auto max-w-md px-4 py-10">
          <p className="text-center text-sm text-slate-500">Wird geladen …</p>
        </main>
      </div>
    );
  }

  const fehler = profileError || error;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <TopNav role={profile?.role ?? "driver"} active="fahrten" />

      <main className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Meine Fahrten</h1>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            {profile ? `Angemeldet als ${profile.full_name}` : "Deine eigenen Fahrten."}
          </p>

          {fehler && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700">
              {fehler}
            </p>
          )}

          <div className="mb-4">
            <label htmlFor="month" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Monat
            </label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none focus:border-[#0FC36B] focus:ring-2 focus:ring-[#0FC36B]/25"
            >
              <option value="">Alle Monate</option>
              {months.map((value) => (
                <option key={value} value={value}>
                  {monthLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Fahrten</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">{trips.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Gesamt</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">{formatKm(totalKm)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Beruflich</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">{formatKm(businessKm)}</p>
            </div>
          </div>

          {trips.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              Noch keine Fahrten erfasst.
            </p>
          ) : (
            <ul className="space-y-3">
              {trips.map((trip) => {
                const vehicle = vehicleFor(trip.vehicle_id);
                const isBusiness = trip.trip_type === "business";

                return (
                  <li key={trip.id} className="rounded-lg border border-slate-200 p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {formatDate(trip.trip_date)}
                      </span>
                      <span
                        className={
                          isBusiness
                            ? "rounded-full bg-[#D2F6E3] px-2.5 py-0.5 text-xs font-semibold text-[#0A6B3C]"
                            : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                        }
                      >
                        {tripTypeLabel(trip.trip_type)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600">
                      {trip.start_location} → {trip.end_location}
                    </p>
                    <p className="mb-2 mt-0.5 text-sm text-slate-500">{trip.purpose}</p>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">
                        {vehicle
                          ? `${vehicle.license_plate} · ${vehicleName(vehicle)}`
                          : "Unbekannt"}
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        {formatKm(trip.distance_km)} km
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/fahrzeug-waehlen"
            className="mt-5 flex h-12 w-full items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold text-[#0A7D46] hover:bg-[#E9FBF2]"
          >
            Fahrt ohne NFC-Tag erfassen
          </Link>

          <Link
            href="/passwort"
            className="mt-3 block py-2 text-center text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Passwort ändern
          </Link>
        </div>
      </main>
    </div>
  );
}
