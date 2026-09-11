"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "./ui";

export function LicenseForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("checking");

    const res = await fetch("/api/billing/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: key.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; plan?: string };

    if (!res.ok) {
      setError(data.error ?? "Vérification impossible.");
      setState("idle");
      return;
    }

    setState("ok");
    router.refresh();
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="license" className="mb-1.5 block text-[13px] text-ink-400">
          Clé de licence Whop
        </label>
        <input
          id="license"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="xxxx-xxxx-xxxx-xxxx"
          className="h-12 w-full rounded-xl border border-white/[0.09] bg-ink-950 px-4 font-mono text-[14px] text-white placeholder:text-ink-600 focus:border-brand-500/60 focus:outline-none"
        />
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {state === "ok" && <Alert tone="success">Licence validée. Redirection vers tes briefs...</Alert>}

      <Button type="submit" variant="brand" disabled={state !== "idle" || key.trim().length < 6} className="w-full">
        {state === "checking" ? "Vérification..." : "Vérifier ma licence"}
      </Button>
    </form>
  );
}
