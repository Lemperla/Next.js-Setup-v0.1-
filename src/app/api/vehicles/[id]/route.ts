import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Fahrzeug bearbeiten
//
// In Next.js 16 sind die params ein Promise und müssen mit await
// ausgepackt werden. Die alte Schreibweise hat den Build scheitern lassen.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("vehicles")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Fahrzeug stilllegen statt löschen
//
// Für vehicles gibt es keine DELETE-Regel in der RLS, ein echtes Löschen
// würde also ohnehin abgewiesen. Und es wäre falsch: An einem Fahrzeug
// hängen Fahrten, die im Fahrtenbuch stehen bleiben müssen.
// Deshalb wird hier is_active auf false gesetzt – der Trigger
// trips_before_insert lehnt Fahrten auf inaktive Fahrzeuge bereits ab.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("vehicles")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
