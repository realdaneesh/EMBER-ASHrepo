const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

/**
 * Amazon SES Service for Ember & Ash
 *
 * Configured via environment variables:
 * - AWS_REGION: AWS Region for SES (default: 'us-east-1')
 * - SES_FROM_EMAIL: Verified sender email address or ARN
 * - SES_ENABLED: 'true' to enable email dispatch; disabled by default
 *
 * Uses the AWS SDK default credential provider chain:
 * When running on Amazon EC2, credentials are automatically resolved
 * from the instance metadata service (IMDS) via the attached IAM role.
 * No static AWS keys are ever embedded in code or configuration files.
 */

const getAwsRegion = () => process.env.AWS_REGION || 'us-east-1';
const getSesFromEmail = () => process.env.SES_FROM_EMAIL || '';
const isSesEnabled = () => process.env.SES_ENABLED === 'true';

// Initialize default SES Client using default credential provider chain
let sesClientInstance = null;

function getSesClient() {
  if (!sesClientInstance) {
    sesClientInstance = new SESClient({ region: getAwsRegion() });
  }
  return sesClientInstance;
}

// Allow overriding client for automated testing
function setSesClient(customClient) {
  sesClientInstance = customClient;
}

/**
 * Mask an email address for privacy in log files.
 * Example: 'daneesh@example.com' -> 'd***h@example.com'
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

/**
 * Send reservation acknowledgement email via Amazon SES
 *
 * @param {Object} details
 * @param {string} details.reservationCode - e.g. 'RES-2026-A1B2'
 * @param {string} details.name - Guest full name
 * @param {string} details.email - Guest destination email
 * @param {string} details.date - Reservation date
 * @param {string} details.time - Reservation time
 * @param {number|string} details.guests - Number of guests
 * @returns {Promise<{ delivered: boolean, status: string, messageId?: string, error?: string }>}
 */
async function sendReservationAcknowledgement({ reservationCode, name, email, date, time, guests }) {
  if (!isSesEnabled()) {
    console.info(`[SES] Service disabled by configuration. Skipped email for reservation ${reservationCode}.`);
    return { delivered: false, status: 'disabled' };
  }

  const fromEmail = getSesFromEmail();
  if (!fromEmail) {
    console.warn(`[SES] SES_FROM_EMAIL is not configured. Skipped email for reservation ${reservationCode}.`);
    return { delivered: false, status: 'unconfigured' };
  }

  const masked = maskEmail(email);

  const subject = `Ember & Ash — Reservation Request Received (${reservationCode})`;

  const textBody = `
Dear ${name || 'Valued Guest'},

Thank you for your reservation request at Ember & Ash!

We have received your booking details:
- Reference Code: ${reservationCode}
- Date: ${date}
- Time: ${time}
- Party Size: ${guests} guest(s)

Please note: This confirms that your reservation request has been received and is currently pending host review and table assignment. Our dining room team will contact you if any adjustments are needed.

Location:
The Mills, Senapati Bapat Marg, Lower Parel, Mumbai, Maharashtra 400013
Phone: +91 (022) 6789 4500

We look forward to welcoming you!

Warm regards,
The Ember & Ash Team
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0c0b09; color: #f5f0ea; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #161512; border: 1px solid #2e2b26; border-radius: 8px; padding: 32px; }
    .header { text-align: center; border-bottom: 1px solid #2e2b26; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #e65100; letter-spacing: 1px; }
    .title { color: #f5f0ea; font-size: 18px; margin: 12px 0 0 0; }
    .details { background: #1e1c18; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2a2721; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #a8a29e; }
    .value { color: #f5f0ea; font-weight: 600; }
    .notice { font-size: 13px; color: #d97706; background: rgba(217, 119, 6, 0.1); border-left: 3px solid #d97706; padding: 12px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; font-size: 12px; color: #78716c; margin-top: 24px; border-top: 1px solid #2e2b26; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">🔥 EMBER & ASH</div>
      <h2 class="title">Reservation Request Received</h2>
    </div>
    <p>Dear ${name || 'Valued Guest'},</p>
    <p>Thank you for submitting a reservation request with Ember & Ash.</p>
    
    <div class="details">
      <div class="detail-row"><span class="label">Reference Code</span><span class="value">${reservationCode}</span></div>
      <div class="detail-row"><span class="label">Date</span><span class="value">${date}</span></div>
      <div class="detail-row"><span class="label">Time</span><span class="value">${time}</span></div>
      <div class="detail-row"><span class="label">Party Size</span><span class="value">${guests} guest(s)</span></div>
    </div>

    <div class="notice">
      <strong>Status: Request Received & Pending Review</strong><br>
      Your reservation request has been registered in our system and is pending host review and table assignment.
    </div>

    <p style="font-size: 13px; color: #a8a29e;">
      Location: The Mills, Senapati Bapat Marg, Lower Parel, Mumbai, Maharashtra 400013<br>
      Reservations Desk: +91 (022) 6789 4500
    </p>

    <div class="footer">
      &copy; ${new Date().getFullYear()} Ember & Ash Grill & Kitchen. All rights reserved.
    </div>
  </div>
</body>
</html>
`.trim();

  const params = {
    Source: fromEmail,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const client = getSesClient();
    const command = new SendEmailCommand(params);
    const result = await client.send(command);

    console.info(`[SES] Acknowledgement dispatched for reservation ${reservationCode} (Recipient: ${masked}, MessageId: ${result.MessageId})`);
    return {
      delivered: true,
      status: 'sent',
      messageId: result.MessageId,
    };
  } catch (err) {
    // Log failure without crashing or bubbling to customer
    console.error(`[SES] Failed to send email for reservation ${reservationCode} (Recipient: ${masked}): ${err.message}`);
    return {
      delivered: false,
      status: 'failed',
      error: err.message,
    };
  }
}

module.exports = {
  sendReservationAcknowledgement,
  maskEmail,
  isSesEnabled,
  getSesClient,
  setSesClient,
};
