import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/server";
import { DemoControls } from "./DemoControls";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");

  const { data: company } = await session.supabase
    .from("companies")
    .select("is_demo")
    .eq("id", session.companyId)
    .single();
  if (!company?.is_demo) redirect("/dashboard");

  return <DemoControls />;
}
