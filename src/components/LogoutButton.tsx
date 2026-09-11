"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="text-[13px] text-ink-500 transition-colors hover:text-white disabled:opacity-50"
    >
      {pending ? "Déconnexion..." : "Se déconnecter"}
    </button>
  );
}
