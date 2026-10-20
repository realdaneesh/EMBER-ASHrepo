# Ember & Ash — Amazon CloudWatch Monitoring & Alarms Setup

This document outlines the observability, log aggregation, system metrics, and alarm configuration for the Ember & Ash application on Amazon EC2 (Amazon Linux 2023, Instance ID: `i-0b5cdb48de4725b0a`, Region: `ap-south-1`).

---

## 1. Architecture & Cost-Conscious Design

To maintain strict cost control while providing robust observability:

- **Log Groups (Short 7-Day Retention):**
  - `/ember-ash/backend` (Retention: 7 days)
    - Stream `{instance_id}-app`: Express application logs from `/var/log/ember-ash/backend.log`
    - Stream `{instance_id}-error`: Express error output from `/var/log/ember-ash/backend.error.log`
  - `/ember-ash/nginx` (Retention: 7 days)
    - Stream `{instance_id}-error`: Nginx vhost errors from `/var/log/nginx/ember_ash_error.log`
    - Stream `{instance_id}-main-error`: Main Nginx server errors from `/var/log/nginx/error.log`
- **Metrics Namespace:** `EmberAsh/Backend`
- **Instance Metrics (Standard 60-Second Resolution):**
  - CPU Utilization: `cpu_usage_idle`, `cpu_usage_iowait`, `cpu_usage_user`, `cpu_usage_system` (`totalcpu: true`)
  - Memory: `mem_used_percent`
  - Root Disk: `used_percent` (mount `/`)
- **Process Security:** The agent runs as the unprivileged user `cwagent` (supplementary group: `adm`) instead of root.
- **Log Privacy & Redaction:** Sensitive credentials (`MONGO_URI`, tokens) are strictly excluded. Customer emails are masked (`d***h@gmail.com`).

---

## 2. IAM Role & Permissions

The EC2 instance is attached to IAM role `EmberAshEC2Role`.
The role includes the AWS-managed policy:
- **`CloudWatchAgentServerPolicy`**

Permissions verified:
- `cloudwatch:PutMetricData`
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`
- `logs:DescribeLogStreams`
- `logs:DescribeLogGroups`
- `logs:PutRetentionPolicy`
- `ec2:DescribeTags`
- `ec2:DescribeVolumes`

---

## 3. Configuration & Startup

The canonical agent configuration is versioned at `deploy/amazon-cloudwatch-agent.json`.

### Apply Configuration & Start Agent:
```bash
# 1. Copy config to CloudWatch agent directory
sudo cp /home/ec2-user/EMBER-ASHrepo/deploy/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# 2. Validate configuration schema
sudo /opt/aws/amazon-cloudwatch-agent/bin/config-translator \
  --input /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  --output /tmp/cwagent-validate.toml \
  --mode ec2

# 3. Apply config and start service
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

---

## 4. Verification & Diagnostics

### A. Local Service Status
```bash
# Query agent control status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status

# Query systemd unit
sudo systemctl status amazon-cloudwatch-agent --no-pager

# Check internal agent logs
sudo tail -n 50 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

### B. AWS CloudWatch Verification (via AWS CLI in ap-south-1)
```bash
# Verify Log Groups
aws logs describe-log-groups --region ap-south-1

# Verify Backend Log Streams
aws logs describe-log-streams --log-group-name /ember-ash/backend --region ap-south-1

# Verify Nginx Log Streams
aws logs describe-log-streams --log-group-name /ember-ash/nginx --region ap-south-1
```

---

## 5. CloudWatch CPU Alarm (Prepared for Deployment)

### Alarm Specification:
- **Alarm Name**: `EmberAsh-EC2-HighCPU`
- **Metric**: `CPUUtilization` (Namespace: `AWS/EC2`, Dimension: `InstanceId=i-0b5cdb48de4725b0a`)
- **Threshold**: `>= 80%`
- **Evaluation Period**: 300 seconds (5 minutes)
- **Evaluation Periods to Alarm**: 2 consecutive periods (10 minutes total sustained load)
- **Comparison Operator**: `GreaterThanOrEqualToThreshold`

### Command to Create (Requires Approval):
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "EmberAsh-EC2-HighCPU" \
  --alarm-description "Triggers when Ember & Ash EC2 instance CPU utilization exceeds 80% for 10 minutes" \
  --metric-name "CPUUtilization" \
  --namespace "AWS/EC2" \
  --statistic "Average" \
  --period 300 \
  --threshold 80.0 \
  --comparison-operator "GreaterThanOrEqualToThreshold" \
  --dimensions "Name=InstanceId,Value=i-0b5cdb48de4725b0a" \
  --evaluation-periods 2 \
  --datapoints-to-alarm 2 \
  --unit "Percent" \
  --region ap-south-1
```

### Cost Explanation:
1. **Free Tier**: AWS CloudWatch includes **10 free metric alarm metrics** permanently per account. If your AWS account currently has fewer than 10 alarms active, this alarm costs **$0.00/month**.
2. **Standard Paid Pricing**: Beyond the free tier, standard resolution alarms in `ap-south-1` cost **$0.10 per alarm metric per month**.
3. **High Resolution Avoided**: Standard 300-second evaluation periods are used; high-resolution alarms (10s/30s at $0.30/alarm/month) are avoided.
4. **SNS Notifications**: Email notifications from Amazon SNS are free for the first 1,000 notifications per month ($2.00 per 100,000 thereafter). SMS notifications incur telco carrier fees.

---

## 6. Shutdown & Rollback Procedures

### Shutdown Agent:
```bash
# Stop agent process
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a stop

# Disable systemd service so it does not restart on reboot
sudo systemctl disable amazon-cloudwatch-agent
```

### Complete Rollback:
```bash
# 1. Stop and disable the agent service
sudo systemctl stop amazon-cloudwatch-agent
sudo systemctl disable amazon-cloudwatch-agent

# 2. Remove configuration files
sudo rm -rf /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/*
sudo rm -f /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.toml
sudo rm -f /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.yaml

# 3. (Optional) Delete CloudWatch Log Groups via AWS CLI if removing test traces
aws logs delete-log-group --log-group-name /ember-ash/backend --region ap-south-1
aws logs delete-log-group --log-group-name /ember-ash/nginx --region ap-south-1
```
