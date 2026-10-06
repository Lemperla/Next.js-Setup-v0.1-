import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    "https://xesvuuunsxsxchmoqvhp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlc3Z1dXVuc3hzeGNobW9xdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTM0NDksImV4cCI6MjEwNTYyOTQ0OX0.Bp0EBrVeyWv213R7lnnWw7IL3jI1jzsB5cLTycMWF9A",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}