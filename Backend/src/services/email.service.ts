import "dotenv/config";
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY in environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Nexa <onboarding@resend.dev>";
const APP_NAME = "Nexa";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailParams): Promise<void> => {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }

  console.log(`Email sent (${data?.id}) to ${to}`);
};

const escapeHtml = (str: string) =>
  str.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] as string));


export const sendVerificationEmail = async (
  to: string,
  rawToken: string,
  name?: string
): Promise<void> => {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111;">Verify your email</h2>
      <p>${greeting}</p>
      <p>Welcome to ${APP_NAME}. Click below to verify your email and activate your account.</p>
      <a href="${verificationUrl}"
         style="display:inline-block; padding:12px 24px; background:#111; color:#fff; text-decoration:none; border-radius:6px; margin: 16px 0;">
        Verify Email
      </a>
      <p style="font-size: 13px; color: #666;">
        Or paste this into your browser:<br/>
        <a href="${verificationUrl}">${verificationUrl}</a>
      </p>
      <p style="font-size: 13px; color: #999;">
        This link expires in 1 hour. If you didn't create a ${APP_NAME} account, ignore this email.
      </p>
    </div>
  `;

  await sendEmail({ to, subject: `Verify your email — ${APP_NAME}`, html });
};

export const sendPasswordResetEmail = async (
  to: string,
  rawToken: string,
  name?: string
): Promise<void> => {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111;">Reset your password</h2>
      <p>${greeting}</p>
      <p>We received a request to reset your ${APP_NAME} password. Click below to choose a new one.</p>
      <a href="${resetUrl}"
         style="display:inline-block; padding:12px 24px; background:#111; color:#fff; text-decoration:none; border-radius:6px; margin: 16px 0;">
        Reset Password
      </a>
      <p style="font-size: 13px; color: #666;">
        Or paste this into your browser:<br/>
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
      <p style="font-size: 13px; color: #999;">
        This link expires in 30 minutes. If you didn't request a password reset, you can safely ignore this email — your password won't be changed.
      </p>
    </div>
  `;

  await sendEmail({ to, subject: `Reset your password — ${APP_NAME}`, html });
};