# Ember & Ash — Amazon SES Integration & Sandbox Guide

This document outlines the setup, identity verification, sandbox configuration, and production graduation process for Amazon Simple Email Service (SES) used to send transactional emails (Reservation Acknowledgements and Order Confirmations) in the Ember & Ash application.

---

## 1. Project Information & Architecture

- **AWS Region**: `ap-south-1` (Asia Pacific - Mumbai)
- **Verified Sender**: `daneeshshetty@gmail.com`
- **EC2 IAM Role**: `EmberAshEC2Role`
- **Supported Emails**:
  - **Reservation Acknowledgement**: Dispatched after a table booking is registered in MongoDB.
  - **Order Confirmation**: Dispatched with full itemization, taxes, and table details after a dining order is recorded.
- **Credential Security**:
  - Uses the AWS SDK v3 default credential provider chain (`@aws-sdk/client-ses`).
  - When running on Amazon EC2, credentials are automatically resolved from the EC2 Instance Metadata Service (IMDS) via `EmberAshEC2Role`.
  - Static AWS access keys (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) are **never** hardcoded into codebase or configuration files.

---

## 2. Amazon SES Sandbox vs. Production Access

By default, every new AWS account has Amazon SES in **Sandbox Mode**.

### Sandbox Mode Restrictions:
- You can **only send emails to verified email addresses and domains**, or to the Amazon SES mailbox simulator.
- You can send a maximum of 200 emails per 24-hour period.
- Maximum send rate is 1 message per second.

### Configurable Test-Recipient Allowlist:
To prevent attempts to send emails to unverified customer addresses during testing while in Sandbox Mode, the backend enforces a configurable test-recipient allowlist:
- `SES_SANDBOX_MODE=true`: Enables sandbox allowlist enforcement.
- `SES_ALLOWED_RECIPIENTS`: Comma-separated list of verified destination addresses (e.g. `daneeshshetty@gmail.com,success@simulator.amazonses.com`).
- The verified sender (`SES_FROM_EMAIL`) and SES mailbox simulator addresses (`success@simulator.amazonses.com`, `bounce@simulator.amazonses.com`, etc.) are automatically included in the permitted list.
- When an order or reservation is created with an unverified email, the email dispatch is gracefully bypassed with status `skipped_sandbox`, avoiding AWS SDK `MessageRejected` errors.

### Moving from Sandbox to Production:
1. Open the [Amazon SES Console](https://console.aws.amazon.com/ses/) in region `ap-south-1`.
2. In the navigation pane, choose **Account dashboard**.
3. Choose **Request production access** (Fill in the use case description: *"Transactional reservation receipts and order confirmations for Ember & Ash restaurant diners in Mumbai"*).
4. Once granted, set `SES_SANDBOX_MODE=false` in `.env` to enable sending to all customer emails.

---

## 3. Verified Identities (Sender Configuration)

Before SES can dispatch emails from `SES_FROM_EMAIL`, the sender identity must be verified in SES in the `ap-south-1` region.

### Single Email Address Verification:
1. In the SES Console (Region `ap-south-1`), navigate to **Identities** -> **Create Identity**.
2. Select **Email address** and enter `daneeshshetty@gmail.com`.
3. AWS sends a confirmation email to `daneeshshetty@gmail.com`.
4. Click the verification link in the inbox to mark the identity as **Verified**.

---

## 4. EC2 IAM Role Permissions for SES

When the backend runs on Amazon EC2, it authenticates via its attached IAM Instance Profile (`EmberAshEC2Role`).

Attach this policy statement to the `EmberAshEC2Role`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSendEmberAshEmails",
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

## 5. Environment Variables Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `AWS_REGION` | `ap-south-1` | AWS Region hosting the verified SES identity. |
| `SES_FROM_EMAIL` | `daneeshshetty@gmail.com` | Verified sender email address. |
| `SES_ENABLED` | `false` | Set to `true` to enable outbound email dispatch via SES. |
| `SES_SANDBOX_MODE` | `true` | When `true`, prevents dispatching to addresses not in allowlist. |
| `SES_ALLOWED_RECIPIENTS` | *(Sender + Simulator)* | Comma-separated allowlist of test recipient email addresses. |

---

## 6. Graceful Failure & PII Protection

- **Persistence Guarantee**: Orders and reservations are **always saved to MongoDB Atlas first** before email dispatch is triggered.
- **Non-blocking / Non-reversing**: An SES delivery failure (e.g. timeout, unverified address, or SES service issue) will **never** cause an already-saved order or reservation to be lost, rolled back, or duplicated.
- **Privacy & Logging**: Customer email addresses are masked in application logs (e.g. `d***h@gmail.com`) to protect PII. No sensitive payment information or database credentials are ever logged or sent in emails.
