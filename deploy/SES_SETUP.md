# Ember & Ash — Amazon SES Integration & Sandbox Guide

This document outlines the setup, identity verification, and production graduation process for Amazon Simple Email Service (SES) used to send reservation acknowledgements.

---

## 1. Amazon SES Sandbox vs. Production Access

By default, every new AWS account has Amazon SES in **Sandbox Mode**.

### Sandbox Mode Restrictions:
- You can **only send emails to verified email addresses and domains**, or to the Amazon SES mailbox simulator.
- You can send a maximum of 200 emails per 24-hour period.
- Maximum send rate is 1 message per second.

### Moving from Sandbox to Production:
1. Open the [Amazon SES Console](https://console.aws.amazon.com/ses/).
2. In the navigation pane, choose **Account dashboard**.
3. Choose **Request production access** (Fill in the use case description: *"Transactional reservation confirmation receipts for Ember & Ash restaurant diners"*).
4. AWS typically approves requests within 24–48 hours.

---

## 2. Verified Identities (Sender Configuration)

Before SES can dispatch emails from `SES_FROM_EMAIL`, the sender identity must be verified in SES.

### Option A: Domain Verification (Recommended for Production)
1. In the SES Console, navigate to **Identities** -> **Create Identity**.
2. Select **Domain** and enter `emberandash.com`.
3. Check **Generate Easy DKIM**.
4. Add the 3 CNAME DNS records provided by AWS into your DNS provider (Route 53, Cloudflare, GoDaddy, etc.).
5. Add a custom MAIL FROM domain or use the default.
6. Once DNS propagates, status changes to **Verified**.

### Option B: Single Email Address Verification (Quick Testing / Development)
1. Select **Email address** and enter your testing email (e.g., `reservations@emberandash.com`).
2. AWS sends a verification link to that inbox.
3. Click the link to complete verification.

---

## 3. EC2 IAM Role Permissions for SES

When the backend runs on Amazon EC2, it authenticates via its attached IAM Instance Profile. No credentials should be saved in `.env`.

Attach this policy statement to the EC2 IAM role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSendReservationEmail",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 4. Environment Variables Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `AWS_REGION` | `us-east-1` | AWS Region hosting the verified SES identity. |
| `SES_FROM_EMAIL` | *(Empty)* | Verified sender email address (e.g. `reservations@emberandash.com`). |
| `SES_ENABLED` | `false` | Must be set to `true` to enable outbound email dispatch. |

---

## 5. Graceful Failure & Offline Behavior

- If `SES_ENABLED` is `false`, the reservation is stored in MongoDB and the API returns HTTP 201 without attempting to call AWS.
- If SES throws an exception (e.g., recipient address not verified in sandbox, or network timeout), the reservation is **NOT reversed or deleted**. The backend logs an error with masked recipient details and returns HTTP 201 to the guest.
