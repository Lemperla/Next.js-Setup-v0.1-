import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nicht angemeldet → zum Login, und merken wohin es danach weitergehen soll.
  //
  // /scan ist bewusst NICHT mehr ausgenommen: Ohne Anmeldung konnte man das
  // Formular zwar ausfüllen, aber nicht speichern – die RLS-Regeln lehnen es ab.
  // Das wäre genau in dem Moment passiert, in dem jemand beim Auto steht und
  // es eilig hat. Jetzt kommt erst die Anmeldung, danach geht es automatisch
  // zum gescannten Fahrzeug zurück.
  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    const url = new URL("/login", request.url);
    url.searchParams.set(
      "weiter",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
