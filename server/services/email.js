const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

/**
 * Amazon SES Service for Ember & Ash
 *
 * Configured via environment variables:
 * - AWS_REGION: AWS Region for SES (default: 'ap-south-1')
 * - SES_FROM_EMAIL: Verified sender email address (default: 'daneeshshetty@gmail.com')
 * - SES_ENABLED: 'true' to enable email dispatch; disabled by default
 * - SES_SANDBOX_MODE: 'true' to enforce sandbox test recipient allowlist
 * - SES_ALLOWED_RECIPIENTS: Comma-separated list of permitted recipients during sandbox testing
 *
 * Uses the AWS SDK default credential provider chain:
 * When running on Amazon EC2, credentials are automatically resolved
 * from the instance metadata service (IMDS) via the attached IAM role (EmberAshEC2Role).
 * No static AWS keys are ever embedded in code or configuration files.
 */

const getAwsRegion = () => process.env.AWS_REGION || 'ap-south-1';
const getSesFromEmail = () => process.env.SES_FROM_EMAIL || 'daneeshshetty@gmail.com';
const isSesEnabled = () => process.env.SES_ENABLED === 'true';
const isSesSandboxMode = () => process.env.SES_SANDBOX_MODE === 'true';

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
 * Retrieve the list of allowed recipients in SES Sandbox mode.
 * Automatically permits the verified sender identity and SES Mailbox Simulator addresses.
 */
function getAllowedRecipients() {
  const allowlistEnv = process.env.SES_ALLOWED_RECIPIENTS || process.env.SES_TEST_ALLOWLIST || '';
  const list = allowlistEnv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const fromEmail = getSesFromEmail().toLowerCase();
  if (fromEmail && !list.includes(fromEmail)) {
    list.push(fromEmail);
  }

  const simulators = [
    'success@simulator.amazonses.com',
    'bounce@simulator.amazonses.com',
    'ooto@simulator.amazonses.com',
    'complaint@simulator.amazonses.com',
    'suppressionlist@simulator.amazonses.com',
  ];
  for (const sim of simulators) {
    if (!list.includes(sim)) {
      list.push(sim);
    }
  }

  return list;
}

/**
 * Verify whether a recipient address is permitted under SES Sandbox mode rules.
 */
function isRecipientAllowed(recipientEmail) {
  if (!isSesSandboxMode()) {
    return true; // Production mode: all valid destinations permitted
  }

  if (!recipientEmail || typeof recipientEmail !== 'string') return false;
  const target = recipientEmail.trim().toLowerCase();
  const allowed = getAllowedRecipients();

  return allowed.some((entry) => {
    if (entry.startsWith('@')) {
      return target.endsWith(entry);
    }
    return target === entry;
  });
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
 * @param {string} [details.specialRequests] - Special requests (optional)
 * @returns {Promise<{ delivered: boolean, status: string, messageId?: string, error?: string, reason?: string }>}
 */
async function sendReservationAcknowledgement({ reservationCode, name, email, date, time, guests, specialRequests }) {
  if (!isSesEnabled()) {
    console.info(`[SES] Service disabled by configuration. Skipped email for reservation ${reservationCode}.`);
    return { delivered: false, status: 'disabled' };
  }

  const fromEmail = getSesFromEmail();
  if (!fromEmail) {
    console.warn(`[SES] SES_FROM_EMAIL is not configured. Skipped email for reservation ${reservationCode}.`);
    return { delivered: false, status: 'unconfigured' };
  }

  if (!email || typeof email !== 'string') {
    return { delivered: false, status: 'invalid_recipient' };
  }

  const masked = maskEmail(email);

  // Check Sandbox Mode test recipient allowlist
  if (isSesSandboxMode() && !isRecipientAllowed(email)) {
    console.info(`[SES Sandbox] Skipped email for reservation ${reservationCode} (Recipient: ${masked} not in allowlist).`);
    return {
      delivered: false,
      status: 'skipped_sandbox',
      reason: 'recipient_not_allowlisted',
    };
  }

  const subject = `Ember & Ash — Reservation Request Received (${reservationCode})`;

  const textBody = `
Dear ${name || 'Valued Guest'},

Thank you for your reservation request at Ember & Ash!

We have received your booking details:
- Reference Code: ${reservationCode}
- Date: ${date}
- Time: ${time}
- Party Size: ${guests} guest(s)
${specialRequests ? `- Special Requests: ${specialRequests}\n` : ''}
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
      ${specialRequests ? `<div class="detail-row"><span class="label">Special Requests</span><span class="value">${specialRequests}</span></div>` : ''}
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

/**
 * Send order confirmation email via Amazon SES
 *
 * @param {Object} details
 * @param {string} details.orderId - e.g. 'EA-LWP-A1B2C3D4'
 * @param {string} details.tableNumber - e.g. 'Table 4'
 * @param {string} [details.guestName] - Guest full name
 * @param {string} details.email - Guest destination email
 * @param {Array} details.items - Array of order items { name, quantity, price, priceNum }
 * @param {number} details.subtotal - Subtotal amount
 * @param {number} details.gst - GST amount
 * @param {number} details.total - Grand total amount
 * @param {string} [details.notes] - Kitchen notes
 * @param {string} [details.timePlaced] - Time placed string
 * @returns {Promise<{ delivered: boolean, status: string, messageId?: string, error?: string, reason?: string }>}
 */
async function sendOrderConfirmation({
  orderId,
  tableNumber,
  guestName,
  email,
  items = [],
  subtotal = 0,
  gst = 0,
  total = 0,
  notes = '',
  timePlaced = '',
}) {
  if (!isSesEnabled()) {
    console.info(`[SES] Service disabled by configuration. Skipped email for order ${orderId}.`);
    return { delivered: false, status: 'disabled' };
  }

  const fromEmail = getSesFromEmail();
  if (!fromEmail) {
    console.warn(`[SES] SES_FROM_EMAIL is not configured. Skipped email for order ${orderId}.`);
    return { delivered: false, status: 'unconfigured' };
  }

  if (!email || typeof email !== 'string') {
    return { delivered: false, status: 'invalid_recipient' };
  }

  const masked = maskEmail(email);

  // Check Sandbox Mode test recipient allowlist
  if (isSesSandboxMode() && !isRecipientAllowed(email)) {
    console.info(`[SES Sandbox] Skipped email for order ${orderId} (Recipient: ${masked} not in allowlist).`);
    return {
      delivered: false,
      status: 'skipped_sandbox',
      reason: 'recipient_not_allowlisted',
    };
  }

  const formattedTime = timePlaced || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const subject = `Ember & Ash — Order Confirmation (${orderId})`;

  const itemListText = items
    .map((item) => `- ${item.quantity}x ${item.name} (${item.price || '₹' + item.priceNum}) — ₹${(Number(item.priceNum) * Number(item.quantity)).toFixed(2)}`)
    .join('\n');

  const textBody = `
Dear ${guestName || 'Valued Guest'},

Thank you for dining with Ember & Ash! Your order has been received and sent directly to our kitchen.

Order Details:
- Order Reference: ${orderId}
- Destination: ${tableNumber}
- Time Placed: ${formattedTime}
- Status: In Kitchen Preparation

Items Ordered:
${itemListText}

Subtotal: ₹${Number(subtotal).toFixed(2)}
Restaurant GST (5%): ₹${Number(gst).toFixed(2)}
Total Amount: ₹${Number(total).toFixed(2)}
${notes ? `\nKitchen Notes: ${notes}\n` : ''}
Your food is being freshly prepared and will be served to your table shortly.

Location:
The Mills, Senapati Bapat Marg, Lower Parel, Mumbai, Maharashtra 400013
Reservations & Inquiries: +91 (022) 6789 4500

Warm regards,
The Ember & Ash Culinary Team
`.trim();

  const itemRowsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #2a2721;">
        <td style="padding: 10px 0; color: #f5f0ea;">${item.name}</td>
        <td style="padding: 10px 0; text-align: center; color: #a8a29e;">${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right; color: #a8a29e;">${item.price || '₹' + item.priceNum}</td>
        <td style="padding: 10px 0; text-align: right; color: #f5f0ea; font-weight: 600;">₹${(Number(item.priceNum) * Number(item.quantity)).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0c0b09; color: #f5f0ea; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #161512; border: 1px solid #2e2b26; border-radius: 8px; padding: 32px; }
    .header { text-align: center; border-bottom: 1px solid #2e2b26; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #e65100; letter-spacing: 1px; }
    .title { color: #f5f0ea; font-size: 18px; margin: 12px 0 0 0; }
    .meta-box { background: #1e1c18; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #2a2721; font-size: 14px; }
    .meta-row:last-child { border-bottom: none; }
    .label { color: #a8a29e; }
    .value { color: #f5f0ea; font-weight: 600; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .items-table th { text-align: left; padding: 8px 0; border-bottom: 2px solid #2e2b26; color: #d97706; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .bill-summary { background: #1e1c18; border-radius: 6px; padding: 16px 20px; margin-top: 16px; }
    .bill-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #a8a29e; }
    .bill-total { border-top: 1px solid #2e2b26; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: bold; color: #f59e0b; }
    .notice { font-size: 13px; color: #10b981; background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 12px; margin: 20px 0; border-radius: 4px; }
    .notes-box { font-size: 13px; color: #d97706; background: rgba(217, 119, 6, 0.1); border-left: 3px solid #d97706; padding: 10px 14px; margin: 16px 0; border-radius: 4px; }
    .footer { text-align: center; font-size: 12px; color: #78716c; margin-top: 24px; border-top: 1px solid #2e2b26; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">🔥 EMBER & ASH</div>
      <h2 class="title">Order Confirmed & In Kitchen</h2>
    </div>
    <p>Dear ${guestName || 'Valued Guest'},</p>
    <p>Thank you for dining with us! Your order has been received and is actively being prepared.</p>

    <div class="meta-box">
      <div class="meta-row"><span class="label">Order Reference</span><span class="value">${orderId}</span></div>
      <div class="meta-row"><span class="label">Destination</span><span class="value">${tableNumber}</span></div>
      <div class="meta-row"><span class="label">Time Placed</span><span class="value">${formattedTime}</span></div>
      <div class="meta-row"><span class="label">Kitchen Status</span><span class="value" style="color: #f59e0b;">In Preparation</span></div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Dish</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
      </tbody>
    </table>

    <div class="bill-summary">
      <div class="bill-row">
        <span>Items Subtotal</span>
        <span>₹${Number(subtotal).toFixed(2)}</span>
      </div>
      <div class="bill-row">
        <span>Restaurant GST (5%)</span>
        <span>₹${Number(gst).toFixed(2)}</span>
      </div>
      <div class="bill-row bill-total">
        <span>Total Amount</span>
        <span>₹${Number(total).toFixed(2)}</span>
      </div>
    </div>

    ${notes ? `<div class="notes-box"><strong>Kitchen Notes:</strong> ${notes}</div>` : ''}

    <div class="notice">
      <strong>Your table order is in making:</strong> Our chefs have begun preparation. Our floor team will serve each dish hot from the grill to your table.
    </div>

    <p style="font-size: 13px; color: #a8a29e;">
      Location: The Mills, Senapati Bapat Marg, Lower Parel, Mumbai, Maharashtra 400013<br>
      Reservations & Inquiries: +91 (022) 6789 4500
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

    console.info(`[SES] Confirmation dispatched for order ${orderId} (Recipient: ${masked}, MessageId: ${result.MessageId})`);
    return {
      delivered: true,
      status: 'sent',
      messageId: result.MessageId,
    };
  } catch (err) {
    console.error(`[SES] Failed to send email for order ${orderId} (Recipient: ${masked}): ${err.message}`);
    return {
      delivered: false,
      status: 'failed',
      error: err.message,
    };
  }
}

module.exports = {
  sendReservationAcknowledgement,
  sendOrderConfirmation,
  isRecipientAllowed,
  getAllowedRecipients,
  isSesSandboxMode,
  isSesEnabled,
  maskEmail,
  getSesClient,
  setSesClient,
  getAwsRegion,
  getSesFromEmail,
};
