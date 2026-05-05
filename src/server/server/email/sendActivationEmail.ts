import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendActivationEmail({
  to,
  code,
  product,
}: {
  to: string;
  code: string;
  product: string;
}) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Your Work Zone OS Activation Code",
    html: `
      <h2>Thank you for your purchase</h2>

      <p>Your <strong>${product}</strong> activation code:</p>

      <div style="font-size:20px;letter-spacing:4px;font-weight:bold;">
        ${code}
      </div>

      <p>
        Enter this code during installation to activate your application.
      </p>

      <p>
        If you experience issues, contact customer support.
      </p>
    `,
  });
}
