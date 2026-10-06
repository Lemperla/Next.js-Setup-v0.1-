import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Legt einen Benutzer an: Eintrag in auth.users + passende Zeile in profiles.
 *
 * Läuft NUR am Server, weil dafür der geheime Schlüssel nötig ist.
 * Der darf niemals in einer Seite stehen – damit könnte jeder Besucher
 * die gesamte Datenbank lesen und ändern.
 *
 * Eigener Pfad /api/admin/create-user, damit es keinen Konflikt mit
 * Filips vorhandenen Routen unter /api/users gibt.
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
  // Ohne diese Prüfung könnte jeder im Internet Benutzer anlegen.
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
      { error: "Nur aktive Administratoren dürfen Benutzer anlegen" },
      { status: 403 },
    );
  }

  // --- 2. Eingaben prüfen -----------------------------------------------
  const body = await request.json().catch(() => null);

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  const role = body?.role === "admin" ? "admin" : "driver";

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: "Name, E-Mail und Passwort sind nötig" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Das Passwort muss mindestens 8 Zeichen haben" },
      { status: 400 },
    );
  }

  // --- 3. Benutzer in der Anmeldung anlegen ------------------------------
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // kein Bestätigungsmail nötig
  });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Benutzer konnte nicht angelegt werden" },
      { status: 400 },
    );
  }

  // --- 4. Profil dazu ----------------------------------------------------
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    organization_id: caller.organization_id,
    full_name: fullName,
    role,
  });

  if (profileError) {
    // Kein halb angelegter Benutzer: Anmeldung wieder entfernen
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: `Profil konnte nicht angelegt werden: ${profileError.message}` },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, id: created.user.id });
}
