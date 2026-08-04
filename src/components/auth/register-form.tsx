"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { registerSeller, type RegisterState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STORE_NICHES } from "@/lib/store-niches";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerSeller, initialState);

  return (
    <>
      <Button variant="secondary" onClick={() => signIn("google", { callbackUrl: "/register" })} type="button" className="w-full">
        <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
          />
          <path
            fill="#FF3D00"
            d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
          />
        </svg>
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        or
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Your name</label>
          <Input name="name" type="text" required placeholder="e.g. Segun Ajayi" className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <Input name="email" type="email" required placeholder="you@email.com" className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <Input name="password" type="password" required minLength={8} placeholder="At least 8 characters" className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Store name</label>
          <Input name="storeName" type="text" required placeholder="e.g. Chunkz" className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">What do you sell?</label>
          <Select name="niche" required defaultValue="" className="mt-1">
            <option value="" disabled>
              Select a niche
            </option>
            {STORE_NICHES.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </Select>
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating..." : "Create store"}
        </Button>
      </form>
    </>
  );
}
