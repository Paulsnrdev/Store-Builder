"use client";

import { useActionState } from "react";
import { inviteStaffMember, type TeamFormState } from "@/lib/actions/team";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: TeamFormState = {};

export function InviteStaffForm() {
  const [state, formAction, pending] = useActionState(inviteStaffMember, initialState);

  return (
    <form action={formAction}>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Invite by email</label>
          <Input name="email" type="email" required placeholder="teammate@email.com" className="mt-1" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending..." : "Send invite"}
        </Button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
