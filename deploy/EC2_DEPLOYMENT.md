# Ember & Ash — Amazon EC2 Deployment Guide (Amazon Linux 2023)

This runbook outlines the deployment of the Ember & Ash Express backend on Amazon EC2 running **Amazon Linux 2023 (AL2023)**.

---

## 1. Prerequisites & Architectural Summary

- **OS:** Amazon Linux 2023 (x86_64 or aarch64 Graviton)
- **Node.js Runtime:** Node.js 20 LTS (minimum `>= 20.19.0` required by Mongoose 9) or Node.js 22 LTS
- **Binary Path:** `/usr/bin/node` (standard AL2023 package manager binary)
- **Working Directory:** `/opt/ember-ash`
- **Process Supervision:** Systemd service (`ember-ash-backend.service`) running under service user `ec2-user` with native `LogsDirectory=ember-ash`
- **Log Management:** Dedicated logs in `/var/log/ember-ash/` with automatic rotation via `logrotate`
- **Reverse Proxy & TLS:** Nginx reverse proxy with two-stage deployment (HTTP bootstrap before certificate issuance, HTTPS after)
- **Database:** MongoDB Atlas (retained as-is, connected via TLS with SRV using standard VPC DNS resolver)
- **AWS Service Auth:** IAM Role attached to the EC2 instance (No static AWS keys stored in code or files)

---

## 2. Security Group Configuration

In the AWS VPC Console, configure the EC2 Security Group as follows:

| Type | Port | Source | Description |
| :--- | :--- | :--- | :--- |
| **SSH** | 22 | `Your-Admin-IP/32` | Bastion or Admin IP only |
| **HTTP** | 80 | `0.0.0.0/0` | Public HTTP traffic (Certbot ACME & HTTPS redirect) |
| **HTTPS**| 443 | `0.0.0.0/0` | Public HTTPS API traffic |
| **Custom TCP** | 5000 | **None (Blocked)** | Keep internal port 5000 completely blocked from internet |

> [!IMPORTANT]
> Port 5000 must NEVER be exposed publicly. Nginx binds to 80 and 443, proxying internal requests to `127.0.0.1:5000`.

---

## 3. EC2 IAM Role Configuration

Attach an IAM Role to your EC2 instance with an Instance Profile containing:
1. `CloudWatchAgentServerPolicy` (AWS managed policy for CloudWatch Agent metrics and logs)
2. Custom Inline Policy for Amazon SES:

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

Because the application uses the AWS SDK v3 Default Credential Provider Chain, the instance profile automatically provides temporary credentials. **Do not configure AWS access keys or secret keys in `.env`.**

---

## 4. Server Provisioning & Node.js Installation

SSH into the instance and run:

```bash
# Update system packages
sudo dnf update -y

# Install Node.js 20 LTS (or 22 LTS), git, nginx, certbot
sudo dnf install -y nodejs npm git nginx certbot python3-certbot-nginx

# Verify Node.js version satisfies Mongoose 9 requirement (>= 20.19.0)
node -v   # Expected: v20.19.0+ or v22.x
which node # Expected: /usr/bin/node
```

---

## 5. Application Deployment

```bash
# Create application root directory
sudo mkdir -p /opt/ember-ash
sudo chown -R ec2-user:ec2-user /opt/ember-ash

# Clone or synchronize the repository
cd /opt/ember-ash
git clone https://github.com/realdaneesh/EMBER-ASHrepo.git .
git checkout feature/aws-backend-infra

# Install production dependencies only
npm ci --omit=dev
```

---

## 6. Secure Environment Variables Configuration

Create the directory and environment file owned by `ec2-user:ec2-user` with read-only permissions:

```bash
sudo mkdir -p /etc/ember-ash
sudo touch /etc/ember-ash/backend.env
sudo chown ec2-user:ec2-user /etc/ember-ash/backend.env
sudo chmod 0600 /etc/ember-ash/backend.env
```

Populate `/etc/ember-ash/backend.env` with your production settings:

```bash
sudo nano /etc/ember-ash/backend.env
```

```ini
PORT=5000
NODE_ENV=production
FRONTEND_ORIGIN=https://main.d123456789.amplifyapp.com,https://emberandash.com
MONGO_URI=mongodb+srv://<db_user>:<db_password>@cluster0.xxxxx.mongodb.net/ember_and_ash_db?retryWrites=true&w=majority
AWS_REGION=us-east-1
SES_FROM_EMAIL=reservations@emberandash.com
SES_ENABLED=true
ADMIN_API_KEY=your-secure-32-char-random-api-key
```

---

## 7. Systemd Service Setup & Log Rotation

Systemd natively manages the log directory via `LogsDirectory=ember-ash` and `LogsDirectoryMode=0755`, creating `/var/log/ember-ash` with `ec2-user:ec2-user` ownership **before** opening log streams:

```bash
# 1. Install systemd unit file
sudo cp /opt/ember-ash/deploy/ember-ash-backend.service /etc/systemd/system/

# 2. Install logrotate configuration to prevent disk exhaustion
sudo cp /opt/ember-ash/deploy/ember-ash.logrotate /etc/logrotate.d/ember-ash
sudo chmod 0644 /etc/logrotate.d/ember-ash

# 3. Reload systemd daemon
sudo systemctl daemon-reload

# 4. Enable and start the backend service
sudo systemctl enable --now ember-ash-backend

# 5. Verify status
sudo systemctl status ember-ash-backend
```

Logs are continuously written and automatically rotated:
- `/var/log/ember-ash/backend.log` (stdout)
- `/var/log/ember-ash/backend.error.log` (stderr)

---

## 8. Two-Stage Nginx Reverse Proxy Setup & HTTPS

To prevent the chicken-and-egg startup failure where Nginx crashes due to missing SSL certificate files before Certbot runs:

### Stage 1: Deploy HTTP Bootstrap Configuration
```bash
# 1. Create ACME challenge webroot directory
sudo mkdir -p /var/www/certbot
sudo chown -R nginx:nginx /var/www/certbot

# 2. Deploy HTTP-only bootstrap configuration
sudo cp /opt/ember-ash/deploy/nginx.bootstrap.conf /etc/nginx/conf.d/ember-ash.conf

# 3. Test syntax and start Nginx
sudo nginx -t
sudo systemctl enable --now nginx

# 4. Verify HTTP health endpoint
curl -i http://localhost/health
```

### Stage 2: Obtain SSL Certificate & Activate HTTPS
```bash
# 1. Obtain Let's Encrypt certificate using Certbot webroot plugin
# Replace <YOUR_DOMAIN> (e.g. api.yourdomain.com) and <ADMIN_EMAIL>
sudo certbot certonly --webroot -w /var/www/certbot -d <YOUR_DOMAIN> --agree-tos -m <ADMIN_EMAIL> --non-interactive

# 2. Edit /opt/ember-ash/deploy/nginx.conf to set server_name to <YOUR_DOMAIN>
# Then deploy production HTTPS configuration
sudo cp /opt/ember-ash/deploy/nginx.conf /etc/nginx/conf.d/ember-ash.conf

# 3. Test Nginx syntax and reload
sudo nginx -t
sudo systemctl reload nginx

# 4. Enable automatic certificate renewal timer
sudo systemctl enable --now certbot-renew.timer
```

---

## 9. Verification & Health Check

```bash
# Test local backend health
curl -i http://127.0.0.1:5000/health

# Test public HTTPS endpoint
curl -i https://<YOUR_DOMAIN>/health
```
