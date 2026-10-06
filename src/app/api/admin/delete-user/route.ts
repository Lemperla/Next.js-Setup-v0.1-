import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Löscht einen Benutzer – Profil und Anmelde-Eintrag.
 *
 * Nur erlaubt, wenn der Benutzer KEINE Fahrten hat. Ein Fahrtenbuch muss
 * lückenlos sein; Fahrer mit Fahrten werden stattdessen deaktiviert.
 *
 * Die Prüfung steht hier am Server und nicht nur in der Oberfläche –
 * ein versteckter Knopf ist keine Absicherung.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der .env.local" },
      { status: 500 },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- 1. Wer ruft das auf? ---------------------------------------------
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data: caller } = await admin
    .from("profiles")
    .select("role, is_active, organization_id")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "admin" || !caller.is_active) {
    return NextResponse.json(
      { error: "Nur aktive Administratoren dürfen Benutzer löschen" },
      { status: 403 },
    );
  }

  // --- 2. Wen soll es treffen? ------------------------------------------
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";

  if (!id) {
    return NextResponse.json({ error: "Keine Benutzer-ID angegeben" }, { status: 400 });
  }

  if (id === user.id) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst löschen" },
      { status: 400 },
    );
  }

  const { data: ziel } = await admin
    .from("profiles")
    .select("full_name, organization_id")
    .eq("id", id)
    .single();

  if (!ziel) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  // Niemand soll Benutzer fremder Firmen löschen können
  if (ziel.organization_id !== caller.organization_id) {
    return NextResponse.json(
      { error: "Dieser Benutzer gehört zu einer anderen Organisation" },
      { status: 403 },
    );
  }

  // --- 3. Hat der Benutzer Fahrten? -------------------------------------
  const { count, error: countError } = await admin
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("driver_id", id);

  if (countError) {
    return NextResponse.json(
      { error: `Fahrten konnten nicht geprüft werden: ${countError.message}` },
      { status: 500 },
    );
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `${ziel.full_name} hat ${count} Fahrten und darf nicht gelöscht werden. Bitte stattdessen deaktivieren.`,
      },
      { status: 400 },
    );
  }

  // --- 4. Löschen --------------------------------------------------------
  // Erst das Profil, dann die Anmeldung – sonst bleibt eine Karteileiche.
  const { error: profileError } = await admin.from("profiles").delete().eq("id", id);

  if (profileError) {
    return NextResponse.json(
      { error: `Profil konnte nicht gelöscht werden: ${profileError.message}` },
      { status: 400 },
    );
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(id);

  if (authDeleteError) {
    return NextResponse.json(
      {
        error: `Das Profil ist gelöscht, die Anmeldung aber nicht: ${authDeleteError.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, name: ziel.full_name });
}
