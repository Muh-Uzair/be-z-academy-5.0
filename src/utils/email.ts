import transporter from "@src/config/mailer";
import { env } from "@src/config/env";

export const sendOtpEmail = async (options: {
  email: string;
  otp: string;
  fullName: string;
}) => {
  const digits = options.otp.split("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your zAcademy account</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- ── TOP ACCENT BAR ── -->
          <tr>
            <td style="background-color:#2fbfad;height:5px;border-radius:12px 12px 0 0;"></td>
          </tr>

          <!-- ── HEADER ── -->
          <tr>
            <td style="background-color:#134d3c;padding:36px 48px 32px;text-align:center;">
              <div style="display:inline-block;background-color:#1a8065;border-radius:50px;padding:8px 22px;margin-bottom:18px;">
                <span style="font-size:13px;font-weight:700;color:#8dd6bc;letter-spacing:2px;text-transform:uppercase;">zAcademy</span>
              </div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">Verify your account</h1>
              <p style="margin:10px 0 0;font-size:14px;color:#8dd6bc;">One step away from starting your learning journey</p>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 48px;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#134d3c;">Hi, ${options.fullName}!</p>
              <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.7;">
                We received a request to verify your email address. Enter the 6-digit code below to complete your sign-up. This code expires in <strong style="color:#1a8065;">10 minutes</strong>.
              </p>

              <!-- OTP Digits -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#2fbfad;letter-spacing:3px;text-transform:uppercase;">Your One-Time Password</p>
                    <table cellpadding="0" cellspacing="8" border="0">
                      <tr>
                        ${digits.map(d => `
                        <td>
                          <div style="width:56px;height:64px;background-color:#e8f8f3;border:2px solid #2fbfad;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                            <span style="font-size:32px;font-weight:800;color:#134d3c;line-height:64px;display:block;text-align:center;">${d}</span>
                          </div>
                        </td>`).join("")}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 28px;" />

              <!-- Security note -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff9f0;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                      🔒 <strong>Never share this code</strong> with anyone — including zAcademy staff. If you didn't request this, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.7;">
                Questions? Email us at <a href="mailto:support@zacademy.com" style="color:#2fbfad;font-weight:600;text-decoration:none;">support@zacademy.com</a>
              </p>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background-color:#1a8065;padding:22px 48px;text-align:center;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:12px;color:#8dd6bc;line-height:1.8;">
                © ${new Date().getFullYear()} zAcademy · All rights reserved<br/>
                You received this because you created an account at zAcademy.
              </p>
            </td>
          </tr>

          <!-- ── BOTTOM ACCENT BAR ── -->
          <tr>
            <td style="background-color:#2fbfad;height:4px;border-radius:0 0 12px 12px;"></td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `;

  await transporter.sendMail({
    from: `zAcademy <${env.EMAIL_FROM}>`,
    to: options.email,
    subject: "🔐 Your zAcademy verification code",
    html,
  });
};

