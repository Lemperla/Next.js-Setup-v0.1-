import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Benutzer löschen
//
// In Next.js 16 sind die params ein Promise und müssen mit await
// ausgepackt werden. Die alte Schreibweise hat den Build scheitern lassen.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ------------------------------------------------------------------
  // Ab hier wird der service_role-Schlüssel benutzt, der alle RLS-Regeln
  // umgeht. Ohne die folgende Prüfung könnte jeder im Internet mit einem
  // einzigen Befehl sämtliche Benutzer löschen.
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
      { error: "Nur aktive Administratoren dürfen Benutzer löschen" },
      { status: 403 },
    );
  }

  if (id === user.id) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst löschen" },
      { status: 400 },
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: ziel } = await supabaseAdmin
    .from("profiles")
    .select("full_name, organization_id")
    .eq("id", id)
    .single();

  if (!ziel) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  if (ziel.organization_id !== caller.organization_id) {
    return NextResponse.json(
      { error: "Dieser Benutzer gehört zu einer anderen Organisation" },
      { status: 403 },
    );
  }

  // ------------------------------------------------------------------
  // Ein Fahrtenbuch muss lückenlos sein. Fahrer mit Fahrten dürfen
  // deshalb nicht gelöscht, sondern nur auf is_active = false gesetzt
  // werden. Sonst verlieren die Fahrten ihren Fahrer.
  // ------------------------------------------------------------------
  const { count, error: countError } = await supabaseAdmin
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

  // Erst das Profil, dann die Anmeldung – sonst bleibt eine Karteileiche.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", id);

  if (profileError) {
    return NextResponse.json(
      { error: `Profil konnte nicht gelöscht werden: ${profileError.message}` },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json(
      { error: `Profil gelöscht, Anmeldung aber nicht: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
