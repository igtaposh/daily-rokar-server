import { Resend } from "resend";

export async function sendRegistrationOTP(email, otp) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: "DailyRokar <onboarding@resend.dev>",
    to: [email],
    subject: `${otp} is your DailyRokar verification code`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="
          margin: 0;
          padding: 0;
          background-color: #f4f7f5;
          font-family: Arial, Helvetica, sans-serif;
        ">
          <div style="
            max-width: 520px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #e5ebe7;
          ">
            <div style="
              background: #166534;
              padding: 30px 24px;
              text-align: center;
            ">
              <h1 style="
                margin: 0;
                color: #ffffff;
                font-size: 30px;
                font-weight: 800;
                letter-spacing: -1px;
              ">DailyRokar</h1>

              <p style="
                margin: 8px 0 0;
                color: #dcfce7;
                font-size: 14px;
              ">Your daily business, simplified.</p>
            </div>

            <div style="padding: 32px 28px;">
              <h2 style="
                margin: 0 0 16px;
                color: #172b21;
                font-size: 22px;
              ">Verify your email address</h2>

              <p style="
                color: #526158;
                font-size: 15px;
                line-height: 1.7;
              ">
                Welcome to DailyRokar! Use the verification code below
                to complete your registration and start managing your
                daily sales, expenses, and cash records.
              </p>

              <div style="
                margin: 28px 0;
                padding: 24px 16px;
                text-align: center;
                background: #f0fdf4;
                border: 1px dashed #86b99a;
                border-radius: 12px;
              ">
                <p style="
                  margin: 0 0 12px;
                  color: #166534;
                  font-size: 12px;
                  font-weight: bold;
                  letter-spacing: 2px;
                  text-transform: uppercase;
                ">Your verification code</p>

                <div style="
                  color: #166534;
                  font-size: 36px;
                  font-weight: 800;
                  letter-spacing: 10px;
                ">${otp}</div>
              </div>

              <p style="
                color: #526158;
                font-size: 14px;
                line-height: 1.7;
              ">
                This code is valid for <strong>10 minutes</strong>.
                Please do not share it with anyone.
              </p>

              <p style="
                color: #526158;
                font-size: 14px;
                line-height: 1.7;
              ">
                If you didn't request this code, you can safely ignore
                this email.
              </p>

              <hr style="
                border: none;
                border-top: 1px solid #e5ebe7;
                margin: 28px 0 20px;
              " />

              <p style="
                margin: 0;
                color: #849087;
                font-size: 12px;
                line-height: 1.6;
                text-align: center;
              ">
                This is an automated email from DailyRokar.<br />
                © ${new Date().getFullYear()} DailyRokar. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Failed to send registration OTP:", error);
    throw new Error("Unable to send verification email.");
  }

  return data;
}
