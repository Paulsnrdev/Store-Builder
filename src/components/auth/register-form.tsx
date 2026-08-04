"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { User, Mail, Store, Tag } from "lucide-react";
import { registerSeller, type RegisterState } from "@/lib/actions/auth";
import { IconInput } from "@/components/auth/icon-input";
import { IconSelect } from "@/components/auth/icon-select";
import { PasswordInput } from "@/components/auth/password-input";
import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";
import { STORE_NICHES } from "@/lib/store-niches";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerSeller, initialState);

  return (
    <>
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Your name</label>
            <IconInput icon={User} name="name" type="text" required placeholder="e.g. Wall Mart" className="mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <IconInput icon={Mail} name="email" type="email" required placeholder="you@email.com" className="mt-1" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <PasswordInput name="password" required minLength={8} placeholder="At least 8 characters" className="mt-1" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Store name</label>
            <IconInput icon={Store} name="storeName" type="text" required placeholder="e.g. Chunkz" className="mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">What do you sell?</label>
            <IconSelect icon={Tag} name="niche" required defaultValue="" className="mt-1">
              <option value="" disabled>
                Select a niche
              </option>
              {STORE_NICHES.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </IconSelect>
          </div>
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating..." : "Create store"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        or
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <Button
        variant="secondary"
        onClick={() => signIn("google", { callbackUrl: "/register" })}
        type="button"
        className="w-full"
      >
        <GoogleIcon />
        Continue with Google
      </Button>
    </>
  );
}
