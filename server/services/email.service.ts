import { createLogger } from '../utils/logger'

const logger = createLogger('email-service')

// ============================================================================
// Email Configuration
// ============================================================================

interface EmailConfig {
  provider: 'console' | 'resend' | 'sendgrid' | 'smtp'
  apiKey?: string
  fromEmail: string
  fromName: string
  baseUrl: string
}

function getEmailConfig(): EmailConfig {
  const config = useRuntimeConfig()

  return {
    provider: (process.env.EMAIL_PROVIDER as any) || 'console',
    apiKey: process.env.EMAIL_API_KEY,
    fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',
    fromName: process.env.EMAIL_FROM_NAME || 'AI Agents Platform',
    baseUrl: (config.public.appUrl as string | undefined) || 'http://localhost:3000'
  }
}

// ============================================================================
// Email Templates
// ============================================================================

function getInvitationEmailHtml(data: {
  recipientName: string
  inviterName: string
  companyName: string
  invitationUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to join ${data.companyName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content p {
      margin: 0 0 20px 0;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      opacity: 0.9;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You've been invited!</h1>
    </div>

    <div class="content">
      <p>Hi ${data.recipientName || 'there'},</p>

      <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.companyName}</strong> on our AI Agents Platform.</p>

      <p>Click the button below to accept your invitation and set up your account:</p>

      <div style="text-align: center;">
        <a href="${data.invitationUrl}" class="button">Accept Invitation</a>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>⏰ This invitation expires in 7 days</strong></p>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.invitationUrl}" style="color: #667eea; word-break: break-all;">${data.invitationUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p>This invitation was sent to you by ${data.inviterName}</p>
      <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
      <p style="margin-top: 20px;">
        <strong>AI Agents Platform</strong><br>
        Powering intelligent conversations
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

function getInvitationEmailText(data: {
  recipientName: string
  inviterName: string
  companyName: string
  invitationUrl: string
}): string {
  return `
Hi ${data.recipientName || 'there'},

${data.inviterName} has invited you to join ${data.companyName} on our AI Agents Platform.

Accept your invitation and set up your account:
${data.invitationUrl}

This invitation expires in 7 days.

If you weren't expecting this invitation, you can safely ignore this email.

---
AI Agents Platform
Powering intelligent conversations
  `.trim()
}

// ============================================================================
// Email Sending Functions
// ============================================================================

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text: string
}

async function sendEmailConsole(params: SendEmailParams): Promise<void> {
  logger.info({ to: params.to, subject: params.subject }, 'Email sent (console mode)')

  console.log('\n' + '='.repeat(60))
  console.log('📧 EMAIL SENT (CONSOLE MODE)')
  console.log('='.repeat(60))
  console.log(`To: ${params.to}`)
  console.log(`Subject: ${params.subject}`)
  console.log('─'.repeat(60))
  console.log(params.text)
  console.log('='.repeat(60) + '\n')
}

async function sendEmailResend(
  config: EmailConfig,
  params: SendEmailParams
): Promise<void> {
  // Integration with Resend API
  // Install: npm install resend

  if (!config.apiKey) {
    throw new Error('EMAIL_API_KEY not configured for Resend')
  }

  try {
    // Example Resend integration (uncomment when ready):
    /*
    const { Resend } = await import('resend')
    const resend = new Resend(config.apiKey)

    await resend.emails.send({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text
    })
    */

    // For now, log
    logger.info({ to: params.to }, 'Email would be sent via Resend')
    console.log(`📧 Email would be sent to ${params.to} via Resend`)
  } catch (error) {
    logger.error({ err: error, to: params.to }, 'Failed to send email via Resend')
    throw error
  }
}

async function sendEmailSendGrid(
  config: EmailConfig,
  params: SendEmailParams
): Promise<void> {
  // Integration with SendGrid API
  // Install: npm install @sendgrid/mail

  if (!config.apiKey) {
    throw new Error('EMAIL_API_KEY not configured for SendGrid')
  }

  try {
    // Example SendGrid integration (uncomment when ready):
    /*
    const sgMail = await import('@sendgrid/mail')
    sgMail.setApiKey(config.apiKey)

    await sgMail.send({
      from: {
        email: config.fromEmail,
        name: config.fromName
      },
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text
    })
    */

    // For now, log
    logger.info({ to: params.to }, 'Email would be sent via SendGrid')
    console.log(`📧 Email would be sent to ${params.to} via SendGrid`)
  } catch (error) {
    logger.error({ err: error, to: params.to }, 'Failed to send email via SendGrid')
    throw error
  }
}

async function sendEmail(params: SendEmailParams): Promise<void> {
  const config = getEmailConfig()

  logger.debug({ provider: config.provider, to: params.to }, 'Sending email')

  switch (config.provider) {
    case 'console':
      await sendEmailConsole(params)
      break

    case 'resend':
      await sendEmailResend(config, params)
      break

    case 'sendgrid':
      await sendEmailSendGrid(config, params)
      break

    default:
      logger.warn({ provider: config.provider }, 'Unknown email provider, using console')
      await sendEmailConsole(params)
  }
}

// ============================================================================
// Public API
// ============================================================================

export async function sendInvitationEmail(data: {
  to: string
  recipientName?: string
  inviterName: string
  companyName: string
  invitationToken: string
}): Promise<void> {
  const config = getEmailConfig()

  const invitationUrl = `${config.baseUrl}/auth/accept-invite?token=${data.invitationToken}`

  const html = getInvitationEmailHtml({
    recipientName: data.recipientName || data.to.split('@')[0] || data.to,
    inviterName: data.inviterName,
    companyName: data.companyName,
    invitationUrl
  })

  const text = getInvitationEmailText({
    recipientName: data.recipientName || data.to.split('@')[0] || data.to,
    inviterName: data.inviterName,
    companyName: data.companyName,
    invitationUrl
  })

  await sendEmail({
    to: data.to,
    subject: `You've been invited to join ${data.companyName}`,
    html,
    text
  })

  logger.info({ to: data.to, company: data.companyName }, 'Invitation email sent')
}

export async function sendPasswordResetEmail(data: {
  to: string
  name: string
  resetToken: string
}): Promise<void> {
  const config = getEmailConfig()
  const resetUrl = `${config.baseUrl}/auth/reset-password?token=${data.resetToken}`

  const html = `
    <h1>Password Reset Request</h1>
    <p>Hi ${data.name},</p>
    <p>You requested to reset your password. Click the link below to continue:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `

  const text = `
    Hi ${data.name},

    You requested to reset your password. Visit this link to continue:
    ${resetUrl}

    This link expires in 1 hour.

    If you didn't request this, please ignore this email.
  `

  await sendEmail({
    to: data.to,
    subject: 'Reset your password',
    html,
    text
  })

  logger.info({ to: data.to }, 'Password reset email sent')
}
