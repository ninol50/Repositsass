"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Countdown to a REAL deadline given by the server. It does not restart on
 * refresh; at zero the page refreshes and the discount is gone.
 */
export function PromoCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const router = useRouter();
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const left = now === null ? null : Math.max(0, end - now);

  useEffect(() => {
    if (left === 0) router.refresh();
  }, [left, router]);

  if (left === null) return <span className={className}>--:--</span>;
  const total = Math.ceil(left / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return (
    <span className={className} role="timer" aria-live="off">
      {mm}:{ss}
    </span>
  );
}
