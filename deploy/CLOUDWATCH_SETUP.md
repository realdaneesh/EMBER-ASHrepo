# Ember & Ash — Amazon CloudWatch Monitoring & Alarms Setup

This guide details the observability, log streaming, and metric alarm configuration for the Ember & Ash Express backend on Amazon EC2.

---

## 1. Overview & Architecture

- **Log Groups:**
  - `/ember-ash/backend` (Application logs from `/var/log/ember-ash/backend.log` and `/var/log/ember-ash/backend.error.log`)
  - `/ember-ash/nginx` (Nginx error logs from `/var/log/nginx/ember_ash_error.log`)
  - `/ember-ash/system` (OS system logs from `/var/log/messages`)
- **Custom Metrics Namespace:** `EmberAsh/Backend`
- **Instance Metrics:** CPU utilization, memory used percent, disk used percent, network I/O.
- **Security & Privacy Rule:** Never log passwords, MongoDB credentials, authorization tokens, or raw customer emails/phones. The backend application automatically masks email addresses (`d***h@example.com`) and excludes credentials.

---

## 2. IAM Role & Permissions

The EC2 instance profile must have the AWS-managed policy attached:
- **`arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy`**

This policy permits:
- `cloudwatch:PutMetricData`
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`
- `logs:DescribeLogStreams`

---

## 3. Installing & Configuring the CloudWatch Agent

On the EC2 instance (Amazon Linux 2023):

```bash
# 1. Install the CloudWatch agent package
sudo dnf install -y amazon-cloudwatch-agent

# 2. Place the configuration file
sudo cp /opt/ember-ash/deploy/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# 3. Start and enable the CloudWatch agent service
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# 4. Verify agent status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status
```

---

## 4. Setting Up CloudWatch Alarms

### Alarm 1: High CPU Utilization Alarm
Alerts if average CPU utilization exceeds 80% for two consecutive 5-minute evaluation periods.

Using the AWS CLI:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "EmberAsh-EC2-HighCPU" \
  --alarm-description "Triggers when EC2 backend CPU exceeds 80% for 10 minutes" \
  --metric-name "CPUUtilization" \
  --namespace "AWS/EC2" \
  --statistic "Average" \
  --period 300 \
  --threshold 80.0 \
  --comparison-operator "GreaterThanOrEqualToThreshold" \
  --dimensions "Name=InstanceId,Value=<YOUR_EC2_INSTANCE_ID>" \
  --evaluation-periods 2 \
  --alarm-actions "<YOUR_SNS_TOPIC_ARN>" \
  --unit "Percent"
```

### Alarm 2: Instance Status Check Failure Alarm
Alerts immediately if the EC2 instance status check fails (underlying hardware or hypervisor issue).

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "EmberAsh-EC2-StatusCheckFailed" \
  --alarm-description "Triggers when EC2 instance status check fails for 2 minutes" \
  --metric-name "StatusCheckFailed" \
  --namespace "AWS/EC2" \
  --statistic "Maximum" \
  --period 60 \
  --threshold 1.0 \
  --comparison-operator "GreaterThanOrEqualToThreshold" \
  --dimensions "Name=InstanceId,Value=<YOUR_EC2_INSTANCE_ID>" \
  --evaluation-periods 2 \
  --alarm-actions "<YOUR_SNS_TOPIC_ARN>"
```

### Alarm 3: Backend Memory Usage Alarm (CloudWatch Agent Metric)
Alerts if memory utilization exceeds 85%.

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "EmberAsh-EC2-HighMemory" \
  --alarm-description "Triggers when Memory utilization exceeds 85%" \
  --metric-name "mem_used_percent" \
  --namespace "EmberAsh/Backend" \
  --statistic "Average" \
  --period 300 \
  --threshold 85.0 \
  --comparison-operator "GreaterThanOrEqualToThreshold" \
  --dimensions "Name=InstanceId,Value=<YOUR_EC2_INSTANCE_ID>" \
  --evaluation-periods 2 \
  --alarm-actions "<YOUR_SNS_TOPIC_ARN>" \
  --unit "Percent"
```

---

## 5. Log Redaction & Privacy Verification

The Ember & Ash backend conforms to strict data privacy principles:
1. **Database credentials:** Never logged. `server.js` logs connection status (`Connected` or `Disconnected`) without printing the full `MONGO_URI`.
2. **Customer Contact Info:** Email addresses in reservation logs are masked (`d***h@example.com`). Phone numbers are not written to output logs.
3. **HTTP Payloads:** Body payloads containing sensitive customer data are not logged in plain text.
