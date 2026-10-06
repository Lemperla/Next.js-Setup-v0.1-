"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** Rolle des angemeldeten Benutzers – entscheidet, ob Admin-Links erscheinen */
  role: "admin" | "driver";
  /** Welche Seite gerade aktiv ist */
  active?: string;
};

const driverLinks = [
  { key: "fahrten", label: "Meine Fahrten", href: "/fahrten" },
];

const adminLinks = [
  { key: "admin", label: "Auswertung", href: "/admin" },
  { key: "fahrzeuge", label: "Fahrzeuge", href: "/admin/fahrzeuge" },
  { key: "benutzer", label: "Benutzer", href: "/admin/benutzer" },
];

export default function TopNav({ role, active }: Props) {
  const router = useRouter();

  const links = role === "admin" ? [...driverLinks, ...adminLinks] : driverLinks;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white text-slate-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href={role === "admin" ? "/admin" : "/fahrten"}
          aria-label="DriveTag Startseite"
          className="flex shrink-0 items-center"
        >
          <Logo height={32} />
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={
                active === link.key
                  ? "flex h-10 shrink-0 items-center rounded-lg bg-[#E9FBF2] px-3 text-sm font-semibold text-[#0A7D46]"
                  : "flex h-10 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }
            >
              {link.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            Abmelden
          </button>
        </nav>
      </div>
    </header>
  );
}
