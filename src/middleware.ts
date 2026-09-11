import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-side gate for signed-in areas. Self-contained on purpose: it must not
 * pull in node:crypto or the database layer.
 *
 * This is a fast redirect, not the security boundary — every protected page and
 * route handler re-checks the session server-side.
 */

const PROTECTED = ["/dashboard", "/result", "/billing"];
const SESSION_COOKIE = "rs_session";

function secretKey(): Uint8Array | null {
  const raw = process.env.AUTH_SECRET;
  if (raw && raw.length >= 32) return new TextEncoder().encode(raw);
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-0123456789");
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const key = secretKey();
  let valid = false;

  if (token && key) {
    try {
      await jwtVerify(token, key, { issuer: "repositsaas" });
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (valid) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/result/:path*", "/billing/:path*"],
};
