import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'Petpics <onboarding@resend.dev>',
      to,
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Petpics 🐾</h1>
            </div>

            <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Thanks for signing up! To get started creating beautiful pet photos, please verify your email address:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="font-size: 14px; color: #4f46e5; word-break: break-all;">
                ${verificationUrl}
              </p>

              <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                This link will expire in 24 hours. If you didn't create an account with Petpics, you can safely ignore this email.
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Petpics. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendTrainingCompleteEmail(
  to: string,
  name: string,
  modelName: string,
  triggerWord: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petpics.akoolai.com';

  try {
    await resend.emails.send({
      from: 'Petpics <onboarding@resend.dev>',
      to,
      subject: `${triggerWord} is ready! 📸`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">${triggerWord} is Ready! 🐾</h1>
            </div>

            <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name || 'there'},</p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Great news! <strong>${triggerWord}</strong> has finished training and is ready for photos.
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                You can now create photos of ${triggerWord} in any setting you can imagine.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/generate"
                   style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Create Photos Now
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                Tip: Try different scenes and settings to find your favorites!
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>&copy; ${new Date().getFullYear()} Petpics. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send training complete email:', error);
    // Don't throw - email is non-critical
  }
}

export async function sendTrainingFailedEmail(
  to: string,
  name: string,
  modelName: string,
  errorReason: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petpics.akoolai.com';

  try {
    await resend.emails.send({
      from: 'Petpics <onboarding@resend.dev>',
      to,
      subject: 'Training didn\'t complete - credits refunded',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Training Issue</h1>
            </div>

            <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name || 'there'},</p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Unfortunately, there was an issue training <strong>${modelName}</strong>.
              </p>

              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>What happened:</strong> ${errorReason || 'The training process encountered an unexpected error.'}
                </p>
              </div>

              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>Your 10 credits have been automatically refunded</strong> to your account.
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                This can sometimes happen due to image quality issues. For best results, try using:
              </p>
              <ul style="font-size: 14px; color: #666;">
                <li>High-resolution images (at least 512x512 pixels)</li>
                <li>Well-lit photos with clear focus on your pet</li>
                <li>Multiple angles and expressions of your pet</li>
                <li>5-20 images for training</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/"
                   style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Try Again
                </a>
              </div>
            </div>

            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>&copy; ${new Date().getFullYear()} Petpics. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send training failed email:', error);
    // Don't throw - email is non-critical
  }
}
