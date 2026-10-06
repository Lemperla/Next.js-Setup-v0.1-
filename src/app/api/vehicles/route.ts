import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Alle Fahrzeuge abrufen
//
// Sortiert nach license_plate. Vorher stand hier order("name") – eine
// Spalte "name" gibt es in der Tabelle vehicles nicht, dort heißt es
// make und model. Die Abfrage lief deshalb auf einen Fehler.
export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("license_plate");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Neues Fahrzeug anlegen
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();

  const { data, error } = await supabase.from("vehicles").insert(body).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
