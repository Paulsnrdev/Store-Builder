import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "@/components/auth/register-form";
import { CompleteStoreForm } from "@/components/auth/complete-store-form";
import { AuthCard } from "@/components/auth/auth-card";

export default async function RegisterPage() {
  const session = await auth();

  // A signed-in user with no store yet (e.g. just completed Google sign-in for the
  // first time) needs a lightweight "name your store" step, not the full signup
  // form — that form creates a new User/password and would collide with the one
  // the OAuth adapter already created for them.
  if (session?.user?.id) {
    const existingStore = await prisma.store.findFirst({ where: { userId: session.user.id } });
    if (existingStore) redirect("/dashboard");

    return (
      <AuthCard title="Almost there">
        <CompleteStoreForm name={session.user.name ?? session.user.email ?? "there"} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your store" description="Start selling in minutes">
      <RegisterForm />
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
