# Email Service Setup Guide

Configure email sending for user invitations and notifications.

---

## Quick Start

The email service supports multiple providers. By default, emails are logged to the console for development.

### Development (Console Mode)

No configuration needed! Emails will be printed to the console.

```env
EMAIL_PROVIDER=console
```

When you invite a user, you'll see:

```
============================================================
📧 EMAIL SENT (CONSOLE MODE)
============================================================
To: user@example.com
Subject: You've been invited to join My Company
------------------------------------------------------------
Hi there,

John Doe has invited you to join My Company...
============================================================
```

The invitation URL will also be returned in the API response for testing.

---

## Production Setup

### Option 1: Resend (Recommended)

[Resend](https://resend.com) is a modern email API with great developer experience.

**1. Install Resend package:**

```bash
npm install resend
```

**2. Get API key:**
- Sign up at https://resend.com
- Create an API key
- Verify your domain (or use their test domain)

**3. Configure environment:**

```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_123456789
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Company Name
NUXT_PUBLIC_APP_URL=https://yourdomain.com
```

**4. Uncomment Resend code:**

Edit `server/services/email.service.ts` and uncomment the Resend integration:

```typescript
// Change this:
// const { Resend } = await import('resend')

// To this:
const { Resend } = await import('resend')
const resend = new Resend(config.apiKey)

await resend.emails.send({
  from: `${config.fromName} <${config.fromEmail}>`,
  to: params.to,
  subject: params.subject,
  html: params.html,
  text: params.text
})
```

**Cost**: Free tier includes 100 emails/day, 3,000/month

---

### Option 2: SendGrid

Popular email service with good deliverability.

**1. Install SendGrid package:**

```bash
npm install @sendgrid/mail
```

**2. Get API key:**
- Sign up at https://sendgrid.com
- Create an API key
- Verify your sender email/domain

**3. Configure environment:**

```env
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Company Name
NUXT_PUBLIC_APP_URL=https://yourdomain.com
```

**4. Uncomment SendGrid code:**

Edit `server/services/email.service.ts` and uncomment the SendGrid integration.

**Cost**: Free tier includes 100 emails/day

---

### Option 3: Custom SMTP

You can also use any SMTP server (Gmail, Outlook, etc.).

**1. Install nodemailer:**

```bash
npm install nodemailer
```

**2. Add SMTP configuration:**

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Your Name
NUXT_PUBLIC_APP_URL=https://yourdomain.com
```

**3. Implement SMTP sender:**

Add to `server/services/email.service.ts`:

```typescript
async function sendEmailSMTP(config: EmailConfig, params: SendEmailParams) {
  const nodemailer = await import('nodemailer')

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  })

  await transporter.sendMail({
    from: `${config.fromName} <${config.fromEmail}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text
  })
}
```

---

## Email Templates

### User Invitation Email

Sent when you invite a new team member.

**Subject**: You've been invited to join {Company Name}

**Content**:
- Personalized greeting
- Who invited them
- Company name
- Call-to-action button
- Expiration notice (7 days)
- Plain text fallback

**Preview**:

```
🎉 You've been invited!

Hi John,

Jane Doe has invited you to join Acme Corp on our AI Agents Platform.

[Accept Invitation Button]

⏰ This invitation expires in 7 days
```

### Customizing Templates

Edit templates in `server/services/email.service.ts`:

```typescript
function getInvitationEmailHtml(data: {
  recipientName: string
  inviterName: string
  companyName: string
  invitationUrl: string
}): string {
  // Customize HTML here
  return `...`
}
```

**Tips**:
- Keep HTML simple (email clients are picky)
- Always include plain text version
- Test in multiple email clients
- Use inline CSS (not external stylesheets)
- Include unsubscribe link for marketing emails

---

## Testing Emails

### 1. Console Mode (Development)

```env
EMAIL_PROVIDER=console
```

Emails will print to terminal. Invitation URLs are included in API response.

### 2. Mailtrap (Testing Service)

Great for testing without sending real emails.

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASSWORD=your-mailtrap-password
```

All emails are caught by Mailtrap for inspection.

### 3. Test in Production

Send test invitation:

```bash
curl -X POST https://yourapi.com/api/admin/users/invite \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "role_ids": ["viewer-role-id"]
  }'
```

---

## Troubleshooting

### Emails not sending

**1. Check provider configuration:**

```bash
# Verify env variables
echo $EMAIL_PROVIDER
echo $EMAIL_API_KEY
echo $EMAIL_FROM
```

**2. Check logs:**

```bash
# Look for email service errors
npm run dev

# Filter for email logs
npm run dev | grep "email-service"
```

**3. Verify API key:**
- Is the API key correct?
- Does it have send permissions?
- Is it expired?

### Emails going to spam

**1. Verify domain:**
- Add SPF record
- Add DKIM record
- Add DMARC record

**2. Use verified sender:**
- Verify your email/domain with provider
- Don't use @gmail.com in production

**3. Improve content:**
- Avoid spam trigger words
- Include unsubscribe link
- Use proper HTML structure

### Rate limits exceeded

**1. Check provider limits:**
- Resend: 100/day free, 3,000/month
- SendGrid: 100/day free

**2. Upgrade plan:**
- Resend: $20/mo for 50,000 emails
- SendGrid: $15/mo for 40,000 emails

**3. Implement queuing:**
- Use job queue (Bull, BullMQ)
- Batch sends
- Retry failed sends

---

## Email Best Practices

### Security

✅ **Use environment variables** for sensitive data
✅ **Never commit API keys** to version control
✅ **Use HTTPS** for invitation links
✅ **Expire invitation tokens** (7 days max)
✅ **Log email failures** for debugging

### Deliverability

✅ **Verify your domain** with email provider
✅ **Use professional from address** (noreply@yourdomain.com)
✅ **Include plain text version** (some clients block HTML)
✅ **Keep emails concise** and actionable
✅ **Test in multiple clients** (Gmail, Outlook, Apple Mail)

### User Experience

✅ **Clear subject lines** ("You've been invited...")
✅ **Personalization** (use recipient name)
✅ **Mobile-friendly design** (responsive templates)
✅ **Clear call-to-action** (big button)
✅ **Provide context** (who invited them, which company)

---

## Advanced Configuration

### Multiple Email Templates

Create different templates for different purposes:

```typescript
export async function sendWelcomeEmail(data: {...}) {
  // Welcome email after signup
}

export async function sendPasswordResetEmail(data: {...}) {
  // Password reset
}

export async function sendNotificationEmail(data: {...}) {
  // System notifications
}
```

### Email Tracking

Track email opens and clicks:

```typescript
// Add tracking pixel
const trackingPixel = `<img src="${config.baseUrl}/track/email/${emailId}" width="1" height="1" />`

// Add UTM parameters to links
const trackedUrl = `${url}?utm_source=email&utm_medium=invitation&utm_campaign=user_invite`
```

### Localization

Send emails in user's language:

```typescript
function getInvitationEmailHtml(data: {...}, locale: string) {
  const translations = {
    'pt-BR': { title: 'Você foi convidado!' },
    'en': { title: "You've been invited!" }
  }

  const t = translations[locale] || translations['en']
  // Use t.title in template
}
```

---

## Provider Comparison

| Provider | Free Tier | Pricing | Best For |
|----------|-----------|---------|----------|
| **Resend** | 100/day | $20/mo 50k | Modern apps, developers |
| **SendGrid** | 100/day | $15/mo 40k | Established apps, marketing |
| **Mailgun** | 100/day | $35/mo 50k | High volume, APIs |
| **AWS SES** | 62k/mo | $0.10/1k | AWS users, high volume |
| **Postmark** | 100/mo | $15/mo 10k | Transactional emails |

**Recommendation**: Start with **Resend** (best developer experience) or **SendGrid** (most popular).

---

## Next Steps

1. ✅ Choose email provider
2. ✅ Configure environment variables
3. ✅ Install provider package
4. ✅ Uncomment provider code
5. ✅ Test with development emails
6. ✅ Verify domain for production
7. ✅ Monitor delivery rates

---

## Support

- Resend docs: https://resend.com/docs
- SendGrid docs: https://docs.sendgrid.com
- Email template tools: https://maizzle.com, https://mjml.io

Happy emailing! 📧
