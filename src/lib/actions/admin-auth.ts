"use server";

import { redirect } from "next/navigation";
import { verifyAdminPassword, setAdminSessionCookie, clearAdminSessionCookie } from "@/lib/admin-auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export type AdminLoginState = { error?: string };

export async function adminLogin(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const password = formData.get("password");
  if (typeof password !== "string" || !password) {
    return { error: "Enter the admin password." };
  }

  // A single shared password with no per-account lockout is brute-forceable without this —
  // limit by IP since there's no per-user identifier to key on.
  if (!(await checkRateLimit("adminLogin", await clientIp()))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  if (!verifyAdminPassword(password)) {
    return { error: "Incorrect password." };
  }

  await setAdminSessionCookie();
  redirect("/dist");
}

export async function adminLogout() {
  await clearAdminSessionCookie();
  redirect("/dist/login");
}
