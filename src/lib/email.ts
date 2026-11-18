/**
 * Transactional email, through Resend's HTTP API (no SDK needed).
 *
 * In development without RESEND_API_KEY the code is printed in the server
 * console instead, so the sign-in flow can be tested without any account.
 * In production without a key, sending fails loudly: a code nobody receives
 * is worse than an explicit error.
 */

import { getSetting } from "./settings";

export async function emailConfigured(): Promise<boolean> {
  return Boolean(await getSetting("RESEND_API_KEY"));
}

async function sender(): Promise<string> {
  // onboarding@resend.dev works without a verified domain, but Resend then
  // only delivers to the address that owns the Resend account.
  return (await getSetting("EMAIL_FROM")) || "ScaleBiz <onboarding@resend.dev>";
}

export type SendResult = { ok: true; devLogged?: boolean } | { ok: false; error: string };

export async function sendLoginCode(to: string, code: string, ttlMinutes: number): Promise<SendResult> {
  const subject = `${code} est ton code ScaleBiz`;
  const text =
    `Ton code de connexion ScaleBiz : ${code}\n\n` +
    `Il est valable ${ttlMinutes} minutes. Si tu n'as rien demandé, ignore ce message.`;
  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#060807;font-family:Arial,Helvetica,sans-serif;color:#ebf1ee">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#0f1311;border:1px solid #1d2521;border-radius:16px;padding:32px">
        <tr><td style="font-size:20px;font-weight:bold;color:#ffffff">Scale<span style="color:#34d399">Biz</span></td></tr>
        <tr><td style="padding-top:24px;font-size:15px;color:#cbd5d0">Ton code de connexion :</td></tr>
        <tr><td style="padding:14px 0 18px;font-size:36px;font-weight:bold;letter-spacing:8px;color:#ffffff">${code}</td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#7d8a84">Valable ${ttlMinutes} minutes. Si tu n'as rien demandé, ignore ce message : personne ne peut se connecter sans ce code.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const key = await getSetting("RESEND_API_KEY");
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email] (dev, pas de RESEND_API_KEY) code pour ${to} : ${code}`);
      return { ok: true, devLogged: true };
    }
    return {
      ok: false,
      error:
        "L'envoi d'emails n'est pas configuré sur ce site (RESEND_API_KEY absente). " +
        "Ajoute la variable dans Vercel, puis redéploie.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: await sender(), to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true };

    const body = (await res.json().catch(() => ({}))) as { message?: string };
    console.error(`[email] Resend a refusé l'envoi (${res.status}) : ${body.message ?? "sans détail"}`);
    if (res.status === 403 || res.status === 422) {
      return {
        ok: false,
        error:
          "L'email n'a pas pu partir : l'adresse d'expédition n'est pas autorisée par Resend. " +
          "Vérifie ton domaine dans Resend (ou, en test, utilise l'email de ton compte Resend).",
      };
    }
    return { ok: false, error: "L'email n'a pas pu être envoyé. Réessaie dans un instant." };
  } catch {
    return { ok: false, error: "Le service d'email ne répond pas. Réessaie dans un instant." };
  }
}
