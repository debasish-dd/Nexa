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
  otp: string,
  name?: string
): Promise<void> => {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111;">Verify your email</h2>
      <p>${greeting}</p>
      <p>Welcome to ${APP_NAME}. Use the code below to verify your email address.</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f4f4f5; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 20px 0; color: #111;">
        ${otp}
      </div>
      <p style="font-size: 13px; color: #666;">
        This code expires in 10 minutes. Don't share it with anyone.
      </p>
      <p style="font-size: 13px; color: #999;">
        If you didn't create a ${APP_NAME} account, ignore this email.
      </p>
    </div>
  `;

  await sendEmail({
    to,
    subject: `Your ${APP_NAME} verification code`,
    html,
  });
};