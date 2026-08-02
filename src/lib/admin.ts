import { redirect } from "next/navigation";
import { requireSession } from "@/lib/store";

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session;
}
