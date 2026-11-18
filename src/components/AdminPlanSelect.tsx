"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Plan } from "@/lib/types";

const OPTIONS: { value: Plan; label: string }[] = [
  { value: "free", label: "Gratuit" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "elite", label: "Elite" },
];

/** Grants an offer by hand — the way to test the paywall until payment exists. */
export function AdminPlanSelect({ userId, plan }: { userId: string; plan: Plan }) {
  const router = useRouter();
  const [value, setValue] = useState<Plan>(plan);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function change(next: Plan) {
    const previous = value;
    setValue(next);
    setState("saving");
    const res = await fetch("/api/admin/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, plan: next }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setValue(previous);
      setState("error");
      return;
    }
    setState("idle");
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={value}
        disabled={state === "saving"}
        onChange={(e) => change(e.target.value as Plan)}
        aria-label="Offre du compte"
        className="h-8 rounded-lg border border-white/10 bg-ink-950 px-2 text-[12.5px] text-ink-100 focus:border-brand-500/60 focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {state === "error" && <span className="text-[12px] text-red-300">Échec</span>}
    </span>
  );
}
