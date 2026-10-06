// Dummy-Daten zum Bauen der Oberfläche.
// Die Typen entsprechen dem echten Supabase-Schema (Stand 4.10.2026).
//
// Sobald Filip seine src/types/database.ts auf das echte Schema aktualisiert hat,
// können die Typen hier raus und von dort importiert werden.
// Diese Datei verschwindet, sobald echte Supabase-Abfragen drin sind.

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

const ORG = "11111111-1111-4111-8111-111111111111";

export const dummyProfiles: Profile[] = [
  {
    id: "p1",
    organization_id: ORG,
    full_name: "Samuel Radosavljevic",
    role: "admin",
    is_active: true,
    created_at: "2026-09-01T08:00:00Z",
    updated_at: "2026-09-01T08:00:00Z",
    email: "samuel@drivetag.at",
  },
  {
    id: "p2",
    organization_id: ORG,
    full_name: "Filip Lemperla",
    role: "admin",
    is_active: true,
    created_at: "2026-09-01T08:05:00Z",
    updated_at: "2026-09-01T08:05:00Z",
    email: "filip@drivetag.at",
  },
  {
    id: "p3",
    organization_id: ORG,
    full_name: "Anna Gruber",
    role: "driver",
    is_active: true,
    created_at: "2026-09-12T10:20:00Z",
    updated_at: "2026-09-12T10:20:00Z",
    email: "anna@drivetag.at",
  },
  {
    id: "p4",
    organization_id: ORG,
    full_name: "Max Berger",
    role: "driver",
    is_active: true,
    created_at: "2026-09-18T14:45:00Z",
    updated_at: "2026-09-18T14:45:00Z",
    email: "max@drivetag.at",
  },
];

export const dummyVehicles: Vehicle[] = [
  {
    id: "v1",
    organization_id: ORG,
    license_plate: "I-123 AB",
    make: "VW",
    model: "Golf",
    current_odometer_km: 12570,
    nfc_token: "a1b2c3d4-0001-4aaa-8aaa-000000000001",
    is_active: true,
    created_at: "2026-09-01T08:10:00Z",
    updated_at: "2026-09-28T16:40:00Z",
  },
  {
    id: "v2",
    organization_id: ORG,
    license_plate: "I-456 CD",
    make: "Skoda",
    model: "Octavia",
    current_odometer_km: 48210,
    nfc_token: "a1b2c3d4-0002-4aaa-8aaa-000000000002",
    is_active: true,
    created_at: "2026-09-01T08:12:00Z",
    updated_at: "2026-09-26T11:15:00Z",
  },
  {
    id: "v3",
    organization_id: ORG,
    license_plate: "I-789 EF",
    make: "Ford",
    model: "Transit",
    current_odometer_km: 91340,
    nfc_token: "a1b2c3d4-0003-4aaa-8aaa-000000000003",
    is_active: true,
    created_at: "2026-09-05T09:30:00Z",
    updated_at: "2026-09-22T17:30:00Z",
  },
  {
    id: "v4",
    organization_id: ORG,
    license_plate: "I-321 GH",
    make: "Opel",
    model: "Corsa",
    current_odometer_km: 65400,
    nfc_token: "a1b2c3d4-0004-4aaa-8aaa-000000000004",
    is_active: false,
    created_at: "2026-09-05T09:35:00Z",
    updated_at: "2026-09-20T12:00:00Z",
  },
];

function trip(
  t: Omit<Trip, "distance_km" | "organization_id" | "updated_at">,
): Trip {
  return {
    ...t,
    organization_id: ORG,
    distance_km: t.end_km - t.start_km, // macht in Wirklichkeit die Datenbank
    updated_at: t.created_at,
  };
}

export const dummyTrips: Trip[] = [
  trip({
    id: "t1",
    vehicle_id: "v1",
    driver_id: "p3",
    trip_date: "2026-09-28",
    start_km: 12450,
    end_km: 12570,
    trip_type: "business",
    purpose: "Kundenbesuch Swarovski",
    start_location: "Innsbruck, Firmenzentrale",
    end_location: "Wattens, Kunde Swarovski",
    created_at: "2026-09-28T16:40:00Z",
  }),
  trip({
    id: "t2",
    vehicle_id: "v2",
    driver_id: "p3",
    trip_date: "2026-09-26",
    start_km: 48100,
    end_km: 48210,
    trip_type: "business",
    purpose: "Material zur Baustelle bringen",
    start_location: "Innsbruck, Firmenzentrale",
    end_location: "Hall in Tirol, Baustelle",
    created_at: "2026-09-26T11:15:00Z",
  }),
  trip({
    id: "t3",
    vehicle_id: "v1",
    driver_id: "p4",
    trip_date: "2026-09-25",
    start_km: 12400,
    end_km: 12450,
    trip_type: "private",
    purpose: "Privatfahrt",
    start_location: "Innsbruck, Firmenzentrale",
    end_location: "Innsbruck, Flughafen",
    created_at: "2026-09-25T18:05:00Z",
  }),
  trip({
    id: "t4",
    vehicle_id: "v3",
    driver_id: "p4",
    trip_date: "2026-09-22",
    start_km: 91100,
    end_km: 91340,
    trip_type: "business",
    purpose: "Auslieferung Kundenauftrag 4312",
    start_location: "Innsbruck, Lager",
    end_location: "Kufstein, Auslieferung",
    created_at: "2026-09-22T17:30:00Z",
  }),
  trip({
    id: "t5",
    vehicle_id: "v2",
    driver_id: "p3",
    trip_date: "2026-09-19",
    start_km: 47980,
    end_km: 48100,
    trip_type: "business",
    purpose: "Rückfahrt vom Kundentermin",
    start_location: "Wattens, Kunde",
    end_location: "Innsbruck, Firmenzentrale",
    created_at: "2026-09-19T15:50:00Z",
  }),
];

// Der gerade angemeldete Benutzer – später aus Supabase Auth
export const dummyCurrentUser: Profile = dummyProfiles[2];

// ---------- kleine Helfer ----------

export function vehicleById(id: string): Vehicle | undefined {
  return dummyVehicles.find((v) => v.id === id);
}

export function profileById(id: string): Profile | undefined {
  return dummyProfiles.find((p) => p.id === id);
}

export function vehicleByToken(token: string): Vehicle | undefined {
  return dummyVehicles.find((v) => v.nfc_token === token);
}

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
