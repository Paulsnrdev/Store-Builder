"use client";

import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Current password</label>
        <Input type="password" name="currentPassword" required className="mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">New password</label>
        <Input type="password" name="newPassword" required minLength={8} className="mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
        <Input type="password" name="confirmPassword" required className="mt-1" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Password updated.</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Change password"}
      </Button>
    </form>
  );
}
