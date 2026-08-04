import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { AcceptInviteButton } from "@/components/auth/accept-invite-button";

export default async function StaffInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.storeMember.findUnique({ where: { inviteToken: token }, include: { store: true } });
  if (!invite || invite.status !== "PENDING") {
    return <AuthCard title="Invalid invitation" description="This invitation link is invalid or has already been used." />;
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/staff-invite/${token}`)}`);
  }

  return (
    <AuthCard title={`Join ${invite.store.name}`} description={`You've been invited to help manage ${invite.store.name}'s dashboard.`}>
      {session.user.email?.toLowerCase() === invite.email.toLowerCase() ? (
        <AcceptInviteButton token={token} />
      ) : (
        <p className="text-sm text-red-600">
          This invitation was sent to {invite.email}. You&apos;re signed in as {session.user.email} — sign out and back in with the
          invited email to accept it.
        </p>
      )}
    </AuthCard>
  );
}
