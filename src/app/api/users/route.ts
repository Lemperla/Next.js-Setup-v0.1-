import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Alle Benutzer abrufen – läuft über die Anmeldung aus dem Cookie,
// die RLS-Regeln greifen also ganz normal.
export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.from("profiles").select("*").order("full_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Neuen Benutzer anlegen (nur Admin, mit service_role)
export async function POST(request: NextRequest) {
  // ------------------------------------------------------------------
  // WICHTIG: Ab hier wird der service_role-Schlüssel benutzt, und der
  // umgeht sämtliche RLS-Regeln. Die Datenbank schützt hier nichts mehr.
  // Ohne die folgende Prüfung könnte jeder im Internet diese Route
  // aufrufen und sich selbst einen Admin-Zugang anlegen.
  // ------------------------------------------------------------------
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data: caller } = await supabase
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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data?.user) {
    return NextResponse.json(
      { error: error?.message ?? "Benutzer konnte nicht angelegt werden" },
      { status: 400 },
    );
  }

  // ------------------------------------------------------------------
  // Ohne diese Zeile wäre der Benutzer unbrauchbar: Er könnte sich zwar
  // anmelden, aber die App und die RLS-Regeln finden kein Profil zu ihm.
  // Es gibt keinen Trigger auf auth.users, der das nachholt – geprüft am
  // 4.10.2026 mit information_schema.triggers, Ergebnis: 0 Zeilen.
  // Die Rolle gehört in profiles, nicht in user_metadata; die RLS-Regeln
  // schauen in profiles nach.
  // ------------------------------------------------------------------
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: data.user.id,
    organization_id: caller.organization_id,
    full_name: fullName,
    role,
  });

  if (profileError) {
    // Kein halb angelegter Benutzer: Anmeldung wieder entfernen
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json(
      { error: `Profil konnte nicht angelegt werden: ${profileError.message}` },
      { status: 400 },
    );
  }

  return NextResponse.json({ id: data.user.id }, { status: 201 });
}
