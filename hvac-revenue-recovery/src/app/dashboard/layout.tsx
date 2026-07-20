import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session) redirect("/login");

  const { data: company } = await session.supabase
    .from("companies")
    .select("name, is_demo")
    .eq("id", session.companyId)
    .single();

  const nav = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/leads", label: "Leads" },
    { href: "/dashboard/reports", label: "Reports" },
    { href: "/dashboard/settings", label: "Settings" },
  ];
  if (company?.is_demo) nav.push({ href: "/dashboard/demo", label: "Demo Controls" });

  return (
    <div className="min-h-screen">
      {company?.is_demo && (
        <div className="bg-amber-400 text-amber-950 text-center text-xs font-semibold py-1">
          DEMO MODE — sample data only, no real texts are sent
        </div>
      )}
      <header className="bg-brand-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-bold">{company?.name ?? "Dashboard"}</div>
            <div className="text-xs text-blue-200">Missed-Call Revenue Recovery</div>
          </div>
          <nav className="flex items-center gap-1 text-sm overflow-x-auto">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-lg hover:bg-white/10 whitespace-nowrap"
              >
                {n.label}
              </Link>
            ))}
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
