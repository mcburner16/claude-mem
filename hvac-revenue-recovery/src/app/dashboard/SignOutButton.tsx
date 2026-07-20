"use client";

import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await getBrowserClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-blue-200"
    >
      Sign out
    </button>
  );
}
