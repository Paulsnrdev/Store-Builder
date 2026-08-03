import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

// /dist (the admin panel) is gated separately by its own shared-password
// session (see src/lib/admin.ts / src/lib/admin-auth.ts), not the seller
// NextAuth session — it must stay reachable without a seller login at all.
export const config = {
  matcher: ["/dashboard/:path*"],
};
