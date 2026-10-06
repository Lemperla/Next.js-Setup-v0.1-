import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    "https://xesvuuunsxsxchmoqvhp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlc3Z1dXVuc3hzeGNobW9xdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTM0NDksImV4cCI6MjEwNTYyOTQ0OX0.Bp0EBrVeyWv213R7lnnWw7IL3jI1jzsB5cLTycMWF9A"
  );
}