import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/server";
import { SettingsForms } from "./SettingsForms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");

  const { data: company } = await session.supabase
    .from("companies")
    .select("*")
    .eq("id", session.companyId)
    .single();
  if (!company) redirect("/login");

  return <SettingsForms company={company} />;
}
