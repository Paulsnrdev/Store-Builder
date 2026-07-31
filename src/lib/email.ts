import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || "StoreHike <onboarding@resend.dev>";

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  if (!resend) return;
  try {
    await resend.emails.send({ from: FROM, to: params.to, subject: params.subject, html: params.html });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}
