export interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
  nfc_token: string;
  current_km: number;
  created_by: string;
  created_at: string;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  km_start: number;
  km_end: number;
  start_location: string;
  end_location: string;
  purpose: string;
  date: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "driver";
  created_at: string;
}