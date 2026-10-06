// Typen und kleine Hilfsfunktionen für die Oberfläche.
//
// Die Typen entsprechen dem echten Supabase-Schema (Stand 4.10.2026).
// Sobald Filip seine src/types/database.ts darauf aktualisiert hat,
// können sie hier raus und von dort importiert werden.

export type UserRole = "admin" | "driver";
export type TripType = "business" | "private";

export type Profile = {
  id: string;
  organization_id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Steht NICHT in profiles – die E-Mail liegt in auth.users.
   *  Kommt später höchstens über Filips API-Route mit. */
  email?: string;
};

export type Vehicle = {
  id: string;
  organization_id: string;
  license_plate: string;
  make: string | null;
  model: string | null;
  current_odometer_km: number;
  /** UUID, wird von der Datenbank erzeugt – nicht eintippbar */
  nfc_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Trip = {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id: string;
  trip_date: string;
  start_km: number;
  end_km: number;
  /** Berechnet die Datenbank: end_km - start_km. Nie selbst mitschicken. */
  distance_km: number;
  trip_type: TripType;
  /** Freitext, z. B. "Kundenbesuch Swarovski". Pflichtfeld. */
  purpose: string;
  start_location: string;
  end_location: string;
  created_at: string;
  updated_at: string;
};

// ---------- kleine Helfer ----------
/** "VW Golf" – oder das Kennzeichen, falls Marke und Modell leer sind */
export function vehicleName(vehicle: Vehicle): string {
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return name || vehicle.license_plate;
}

/** Macht aus "2026-09-28" ein "28.09.2026" */
export function formatDate(value: string): string {
  if (!value) return "–";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

/** Macht aus 12570 ein "12.570" */
export function formatKm(value: number): string {
  return value.toLocaleString("de-AT");
}

/** "business" -> "Beruflich" */
export function tripTypeLabel(type: TripType): string {
  return type === "private" ? "Privat" : "Beruflich";
}
