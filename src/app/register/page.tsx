import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "@/components/auth/register-form";
import { CompleteStoreForm } from "@/components/auth/complete-store-form";

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Almost there</h1>
          </div>
          <CompleteStoreForm name={session.user.name ?? session.user.email ?? "there"} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Create your store</h1>
          <p className="mt-1 text-sm text-gray-500">Start selling in minutes</p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-gray-900 underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
