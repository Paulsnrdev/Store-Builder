import { redirect } from "next/navigation";
import { hasValidAdminSession } from "@/lib/admin-auth";

export async function requireAdmin() {
  if (!(await hasValidAdminSession())) redirect("/dist/login");
}
