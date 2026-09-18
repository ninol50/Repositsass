"use client";

import { useState } from "react";
import { WhopCheckout } from "./WhopCheckout";
import { buttonClass, type ButtonVariant } from "./ui";

/**
 * The subscribe button.
 *
 * When the plan has a Whop plan id, it opens the checkout over the site
 * instead of sending the customer to whop.com — a customer who leaves at the
 * moment of paying often does not come back. Everything else (no account yet,
 * no Whop link configured) keeps the plain navigation it had.
 */
export function PlanCheckoutButton({
  planId,
  planName,
  price,
  period,
  href,
  label,
  accountEmail,
  variant = "brand",
  className,
}: {
  /** Null when the link is not a Whop checkout: then this is a normal link. */
  planId: string | null;
  planName: string;
  price: string;
  period: string;
  href: string;
  label: string;
  accountEmail: string | null;
  variant?: ButtonVariant;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const classes = buttonClass(variant, "md", className);

  if (!planId) {
    return (
      <a href={href} className={classes}>
        {label}
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={classes}>
        {label}
      </button>

      {open && (
        <WhopCheckout
          planId={planId}
          planName={planName}
          price={price}
          period={period}
          accountEmail={accountEmail}
          fallbackUrl={href}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
