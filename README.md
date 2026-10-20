# 🔥 EMBER & ASH — Full-Stack Dining & Kitchen Platform

Full-Stack Web Application for **Ember & Ash Grill & Kitchen**, located at The Mills, Lower Parel, Mumbai.

Built with a **React frontend**, **Node.js / Express backend**, **MongoDB Atlas (`ember_and_ash_db`)**, and **Amazon Simple Email Service (SES)** running on **Amazon EC2 (Region: `ap-south-1`)**.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: React 19, responsive components, table tray ordering modal, reservation form.
- **Backend**: Node.js + Express 5, RESTful APIs, rate-limiting, and error handling.
- **Database**: MongoDB Atlas (`ember_and_ash_db`) with Mongoose ODM models for `Dishes`, `Categories`, `Orders`, and `Reservations`.
- **Email Service**: Amazon SES (`@aws-sdk/client-ses`) in AWS Region `ap-south-1` with verified sender `daneeshshetty@gmail.com`.
- **Infrastructure**: Amazon EC2 with IAM Role `EmberAshEC2Role` using default credential resolution (EC2 IMDS). No hardcoded credentials.

---

## 📧 Amazon SES Email Notifications

The application features centralized transactional email handling via `server/services/email.js`:

1. **Reservation Acknowledgement**: Dispatched after a reservation request is validated and saved in MongoDB.
2. **Order Confirmation**: Dispatched with full itemization, taxes (5% GST), table destination, and special notes after an order is saved.
3. **SES Sandbox Mode & Allowlist**:
   - Because Amazon SES is initially in **Sandbox Mode**, emails can only be sent to verified addresses.
   - Set `SES_SANDBOX_MODE=true` to enforce a test-recipient allowlist (`SES_ALLOWED_RECIPIENTS`).
   - Unverified recipients are gracefully skipped (`skipped_sandbox`) without attempting AWS calls, preventing `MessageRejected` exceptions.
   - The verified sender (`daneeshshetty@gmail.com`) and SES mailbox simulators are always automatically allowed.
4. **Resilience & Privacy**:
   - Deliveries are non-blocking and non-reversing: an email failure never rolls back, deletes, or duplicates an order or reservation.
   - Recipient emails are masked in application logs (e.g. `d***h@gmail.com`).
   - Email templates strictly exclude database credentials, connection strings, and payment information.

See [deploy/SES_SETUP.md](deploy/SES_SETUP.md) for complete AWS SES identity setup, IAM policies, and sandbox graduation steps.

---

## 🚀 Available Scripts

### Development & Running Locally

```bash
# Install root dependencies
npm install

# Run backend test suite
npm run test:backend

# Start backend server
npm run server

# Start React frontend
npm start
```

### Environment Configuration

Copy `.env.example` to `.env` to configure your local environment:

```bash
cp .env.example .env
```

Key environment variables:
- `PORT`: Server port (default `5000`)
- `NODE_ENV`: Runtime environment (`development` / `production` / `test`)
- `MONGO_URI`: MongoDB Atlas connection URI
- `AWS_REGION`: AWS region for SES (`ap-south-1`)
- `SES_FROM_EMAIL`: Verified sender email (`daneeshshetty@gmail.com`)
- `SES_ENABLED`: `true` to enable email dispatch; `false` by default
- `SES_SANDBOX_MODE`: `true` to enforce sandbox recipient allowlist
- `SES_ALLOWED_RECIPIENTS`: Comma-separated list of test recipients allowed in sandbox
- `ADMIN_API_KEY`: Secret key required to view `/api/orders`
