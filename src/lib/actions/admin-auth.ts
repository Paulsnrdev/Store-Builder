"use server";

import { redirect } from "next/navigation";
import { verifyAdminPassword, setAdminSessionCookie, clearAdminSessionCookie } from "@/lib/admin-auth";

export type AdminLoginState = { error?: string };

export async function adminLogin(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const password = formData.get("password");
  if (typeof password !== "string" || !password) {
    return { error: "Enter the admin password." };
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
