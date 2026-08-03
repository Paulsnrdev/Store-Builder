"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type ResetPasswordState } from "@/lib/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword.bind(null, token), initialState);

  if (state.success) {
    return (
      <AuthCard title="Password updated" description="Your password has been changed.">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in with your new password
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" description="Must be at least 8 characters.">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">New password</label>
          <Input type="password" name="password" required placeholder="••••••••" className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm password</label>
          <Input type="password" name="confirmPassword" required placeholder="••••••••" className="mt-1" />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Saving..." : "Reset password"}
        </Button>
      </form>
    </AuthCard>
  );
}
