import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'Petpics <hello@petpics.akoolai.com>',
      replyTo: 'zach@akoolai.com',
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
      from: 'Petpics <hello@petpics.akoolai.com>',
      replyTo: 'zach@akoolai.com',
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

/**
 * Send training complete email with watermarked sample images.
 * This shows users the quality of their trained model before they purchase credits.
 */
export async function sendTrainingCompleteEmailWithImages(
  to: string,
  name: string,
  modelName: string,
  triggerWord: string,
  sampleImages: string[] // Array of 3 watermarked image URLs
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petpics.akoolai.com';

  // Build image grid HTML
  const imageGridHtml = sampleImages.map((url, index) => `
    <div style="flex: 1; min-width: 150px; max-width: 180px; margin: 8px;">
      <img src="${url}" alt="Sample ${index + 1}" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    </div>
  `).join('');

  const result = await resend.emails.send({
    from: 'Petpics <hello@petpics.akoolai.com>',
    replyTo: 'zach@akoolai.com',
    to,
    subject: `${triggerWord} is ready! See your sample photos 📸`,
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
              Great news! <strong>${triggerWord}</strong> has finished training. Here are some sample photos we generated for you:
            </p>

            <div style="display: flex; flex-wrap: wrap; justify-content: center; margin: 24px 0; padding: 16px; background: white; border-radius: 12px;">
              ${imageGridHtml}
            </div>

            <p style="font-size: 14px; color: #666; text-align: center; margin-bottom: 24px;">
              These are watermarked samples. Visit the Portrait Studio to create full-quality portraits!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/dashboard"
                 style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Create Portraits Now
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Tip: You can create ${triggerWord} in any scene - from cozy home settings to beautiful outdoor adventures!
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Petpics. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
  });

  if (result.error) {
    throw new Error(`Resend API error: ${result.error.message}`);
  }

  console.log(`Training complete email sent to ${to}, id: ${result.data?.id}`);
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
      from: 'Petpics <hello@petpics.akoolai.com>',
      replyTo: 'zach@akoolai.com',
      to,
      subject: 'Training didn\'t complete \u2014 please try again',
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
                <strong>Training is free, so there's no charge.</strong> You can try again anytime.
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

/**
 * Send re-engagement email to users who trained a model but never purchased credits.
 * Includes watermarked sample images to entice them back.
 */
export async function sendReengagementEmail(
  to: string,
  name: string,
  petName: string,
  sampleImages: string[]
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petpics.akoolai.com';

  const imageGridHtml = sampleImages.map((url, index) => `
    <div style="flex: 1; min-width: 150px; max-width: 180px; margin: 8px;">
      <img src="${url}" alt="Sample ${index + 1}" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    </div>
  `).join('');

  const result = await resend.emails.send({
    from: 'Petpics <hello@petpics.akoolai.com>',
    replyTo: 'zach@akoolai.com',
    to,
    subject: 'Your pet portraits are still waiting!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${petName} is waiting for you! 🐾</h1>
          </div>

          <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name || 'there'},</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              We generated some sample portraits of <strong>${petName}</strong> &mdash; come check them out and create more!
            </p>

            <div style="display: flex; flex-wrap: wrap; justify-content: center; margin: 24px 0; padding: 16px; background: white; border-radius: 12px;">
              ${imageGridHtml}
            </div>

            <p style="font-size: 14px; color: #666; text-align: center; margin-bottom: 24px;">
              These are watermarked previews. Visit the Portrait Studio to create full-quality portraits!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/dashboard"
                 style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Create Portraits Now
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              If you have any questions, just reply to this email!
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Petpics. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
  });

  if (result.error) {
    throw new Error(`Resend API error: ${result.error.message}`);
  }

  console.log(`Re-engagement email sent to ${to}, id: ${result.data?.id}`);
}

export async function sendStuckTrainingAlertEmail(
  to: string,
  stuckTrainings: { id: number; userEmail: string; triggerWord: string; minutesElapsed: number }[]
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petpics.akoolai.com';
  const count = stuckTrainings.length;

  const trainingRows = stuckTrainings.map(t => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${t.userEmail}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 600;">${t.triggerWord}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #dc2626;">${t.minutesElapsed} min</td>
    </tr>
  `).join('');

  const result = await resend.emails.send({
    from: 'Petpics <hello@petpics.akoolai.com>',
    replyTo: 'zach@akoolai.com',
    to,
    subject: `${count} stuck training${count !== 1 ? 's' : ''} detected`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 18px;">Stuck Training Alert</h1>
            </div>
            <div style="padding: 20px;">
              <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
                ${count} training${count !== 1 ? 's have' : ' has'} been running for over 20 minutes:
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">User</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Pet</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Elapsed</th>
                  </tr>
                </thead>
                <tbody>
                  ${trainingRows}
                </tbody>
              </table>
              <div style="text-align: center;">
                <a href="${baseUrl}/admin" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
                  Open Admin Dashboard
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (result.error) {
    throw new Error(`Resend API error: ${result.error.message}`);
  }

  console.log(`Stuck training alert sent to ${to}, id: ${result.data?.id}`);
}

// ========================================
// Print Order Email Templates
// ========================================

interface OrderItem {
  productType: string;
  sizeLabel: string;
  priceCents: number;
  imageUrl: string;
}

interface OrderAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
}

export async function sendOrderConfirmationEmail(
  to: string,
  name: string,
  orderId: number,
  items: OrderItem[],
  totalCents: number,
  address: OrderAddress
): Promise<void> {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${item.imageUrl}" width="60" height="60" style="border-radius: 8px; object-fit: cover;" alt="Product">
          <div>
            <div style="font-weight: 600;">${item.productType} — ${item.sizeLabel}</div>
            <div style="color: #666; font-size: 14px;">$${(item.priceCents / 100).toFixed(2)}</div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');

  const result = await resend.emails.send({
    from: 'Petpics <hello@petpics.akoolai.com>',
    replyTo: 'zach@akoolai.com',
    to,
    subject: `Your pet portrait is being made! 🎨`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Order Confirmed! 🎉</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name || 'there'},</p>
            <p>Your order <strong>#${orderId}</strong> has been placed and is being prepared.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">${itemsHtml}</table>

            <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <div style="font-weight: 600; margin-bottom: 8px;">Total: $${(totalCents / 100).toFixed(2)}</div>
              <div style="font-size: 14px; color: #666;">
                Estimated production: 2–5 business days<br>
                We'll email you when it ships.
              </div>
            </div>

            <div style="font-size: 14px; color: #666; margin-top: 20px;">
              <strong>Ships to:</strong><br>
              ${address.name}<br>
              ${address.address1}<br>
              ${address.address2 ? address.address2 + '<br>' : ''}
              ${address.city}, ${address.state || ''} ${address.zip}<br>
              ${address.country}
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://petpics.akoolai.com/print/order/${orderId}"
                 style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Order Status
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (result.error) {
    throw new Error(`Resend API error: ${result.error.message}`);
  }
  console.log(`Order confirmation email sent to ${to}, id: ${result.data?.id}`);
}

export async function sendOrderShippedEmail(
  to: string,
  name: string,
  orderId: number,
  trackingNumber: string,
  trackingUrl: string
): Promise<void> {
  const result = await resend.emails.send({
    from: 'Petpics <hello@petpics.akoolai.com>',
    replyTo: 'zach@akoolai.com',
    to,
    subject: `Your pet portrait is on its way! 📦`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Your Order Has Shipped! 📦</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name || 'there'},</p>
            <p>Great news! Your order <strong>#${orderId}</strong> is on its way to you.</p>

            <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
              <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Tracking Number</div>
              <div style="font-weight: 600; font-size: 18px;">${trackingNumber}</div>
              ${trackingUrl ? `
                <a href="${trackingUrl}" style="display: inline-block; margin-top: 12px; color: #ff6b6b; text-decoration: none; font-weight: 600;">
                  Track Package →
                </a>
              ` : ''}
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://petpics.akoolai.com/print/order/${orderId}"
                 style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Order Status
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
              Love your portrait? <a href="https://petpics.akoolai.com/dashboard" style="color: #ff6b6b;">Create another one!</a>
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (result.error) {
    throw new Error(`Resend API error: ${result.error.message}`);
  }
  console.log(`Shipped notification sent to ${to}, id: ${result.data?.id}`);
}

export async function sendDeliveryFollowupEmail(
  to: string,
  name: string,
  orderId: number
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petpics.akoolai.com';

  const result = await resend.emails.send({
    from: 'Petpics <hello@petpics.akoolai.com>',
    replyTo: 'zach@akoolai.com',
    to,
    subject: `Did your pet portrait arrive? 🐾`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">How does it look? 🐾</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name || 'there'},</p>
            <p>Your order <strong>#${orderId}</strong> should have arrived by now. We hope you love it!</p>

            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Love your portrait?</p>
              <p style="font-size: 14px; color: #666; margin-bottom: 16px;">
                Create more prints of your pet in different scenes and styles. Each one makes a great gift!
              </p>
              <a href="${baseUrl}/dashboard"
                 style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ff9672 100%); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Create Another Print
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 24px;">
              Had any issues? Just reply to this email and we'll make it right.
            </p>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${baseUrl}/print/order/${orderId}"
                 style="color: #ff6b6b; text-decoration: none; font-size: 14px;">
                View Order Details
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (result.error) {
    throw new Error(`Resend API error: ${result.error.message}`);
  }
  console.log(`Delivery follow-up email sent to ${to}, id: ${result.data?.id}`);
}

// ========================================
// Admin Alert Emails
// ========================================

/**
 * Sends a simple admin alert email (for Printful failures, refund issues, etc.)
 */
export async function sendAdminAlert(
  subject: string,
  details: string
): Promise<void> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  if (adminEmails.length === 0) {
    console.error('No ADMIN_EMAILS configured, cannot send alert:', subject);
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petpics.akoolai.com';

  const result = await resend.emails.send({
    from: 'Petpics <hello@petpics.akoolai.com>',
    replyTo: 'zach@akoolai.com',
    to: adminEmails,
    subject: `[Petpics Alert] ${subject}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 18px;">Admin Alert</h1>
            </div>
            <div style="padding: 20px;">
              <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 8px;">${subject}</p>
              <pre style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; font-size: 12px; color: #374151; overflow-x: auto; white-space: pre-wrap;">${details}</pre>
              <div style="text-align: center; margin-top: 16px;">
                <a href="${baseUrl}/admin" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
                  Open Admin Dashboard
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (result.error) {
    console.error(`Failed to send admin alert: ${result.error.message}`);
  } else {
    console.log(`Admin alert sent: "${subject}", id: ${result.data?.id}`);
  }
}
