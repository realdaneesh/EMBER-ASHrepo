const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const emailService = require('../services/email');
const Order = require('../models/Order');
const Dish = require('../models/Dish');
const Reservation = require('../models/Reservation');
const { app } = require('../server');

describe('Amazon SES Email Notifications — Orders, Reservations & Sandbox Allowlist', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    emailService.setSesClient(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    emailService.setSesClient(null);
  });

  it('SES disabled mode: sendOrderConfirmation skips AWS dispatch and returns disabled status', async () => {
    process.env.SES_ENABLED = 'false';

    const result = await emailService.sendOrderConfirmation({
      orderId: 'EA-LWP-DIS01',
      tableNumber: 'Table 2',
      guestName: 'Jane Doe',
      email: 'jane@example.com',
      items: [{ name: 'Smoked Butter Chicken', priceNum: 650, quantity: 1 }],
      subtotal: 650,
      gst: 32.5,
      total: 682.5,
    });

    assert.strictEqual(result.delivered, false);
    assert.strictEqual(result.status, 'disabled');
  });

  it('sendOrderConfirmation successfully sends email with mocked SES client and validates email parameters', async () => {
    process.env.SES_ENABLED = 'true';
    process.env.AWS_REGION = 'ap-south-1';
    process.env.SES_FROM_EMAIL = 'daneeshshetty@gmail.com';
    process.env.SES_SANDBOX_MODE = 'false'; // Direct send test

    let sentParams = null;
    const mockSesClient = {
      send: async (command) => {
        sentParams = command.input;
        return { MessageId: 'msg-order-mock-12345' };
      },
    };

    emailService.setSesClient(mockSesClient);

    const result = await emailService.sendOrderConfirmation({
      orderId: 'EA-LWP-TEST01',
      tableNumber: 'Table 5',
      guestName: 'Aarav Patel',
      email: 'aarav.patel@example.com',
      items: [
        { name: 'Charred Chicken Tikka', price: '₹500', priceNum: 500, quantity: 2 },
        { name: 'Smoked Butter Naan', price: '₹90', priceNum: 90, quantity: 2 },
      ],
      subtotal: 1180,
      gst: 59,
      total: 1239,
      notes: 'Extra mint chutney please',
      timePlaced: '08:15 PM',
    });

    assert.strictEqual(result.delivered, true);
    assert.strictEqual(result.status, 'sent');
    assert.strictEqual(result.messageId, 'msg-order-mock-12345');

    // Validate SES parameters
    assert.strictEqual(sentParams.Source, 'daneeshshetty@gmail.com');
    assert.deepStrictEqual(sentParams.Destination.ToAddresses, ['aarav.patel@example.com']);
    assert.ok(sentParams.Message.Subject.Data.includes('EA-LWP-TEST01'));

    // Validate Plain Text and HTML body contents
    const textBody = sentParams.Message.Body.Text.Data;
    const htmlBody = sentParams.Message.Body.Html.Data;

    assert.ok(textBody.includes('Table 5'));
    assert.ok(textBody.includes('2x Charred Chicken Tikka'));
    assert.ok(textBody.includes('Subtotal: ₹1180.00'));
    assert.ok(textBody.includes('Restaurant GST (5%): ₹59.00'));
    assert.ok(textBody.includes('Total Amount: ₹1239.00'));
    assert.ok(textBody.includes('Extra mint chutney please'));

    assert.ok(htmlBody.includes('Order Confirmed & In Kitchen'));
    assert.ok(htmlBody.includes('EA-LWP-TEST01'));
    assert.ok(htmlBody.includes('Charred Chicken Tikka'));
    assert.ok(htmlBody.includes('₹1239.00'));

    // Security check: Never leak database credentials or environment keys in email body
    assert.ok(!htmlBody.includes('mongodb+srv'));
    assert.ok(!textBody.includes('mongodb+srv'));
    assert.ok(!htmlBody.includes('password'));
  });

  it('SES Sandbox mode: skips dispatch to unverified recipient not on allowlist', async () => {
    process.env.SES_ENABLED = 'true';
    process.env.SES_FROM_EMAIL = 'daneeshshetty@gmail.com';
    process.env.SES_SANDBOX_MODE = 'true';
    process.env.SES_ALLOWED_RECIPIENTS = 'daneeshshetty@gmail.com,qa-tester@example.com';

    let sendCalled = false;
    const mockSesClient = {
      send: async () => {
        sendCalled = true;
        return { MessageId: 'should-not-be-called' };
      },
    };
    emailService.setSesClient(mockSesClient);

    const result = await emailService.sendOrderConfirmation({
      orderId: 'EA-LWP-UNVERIFIED',
      tableNumber: 'Table 3',
      guestName: 'Unverified Customer',
      email: 'random-customer@external.com',
      items: [{ name: 'Paneer Tikka', priceNum: 450, quantity: 1 }],
      subtotal: 450,
      gst: 22.5,
      total: 472.5,
    });

    assert.strictEqual(sendCalled, false, 'AWS SES send should NOT be called for unverified sandbox recipient');
    assert.strictEqual(result.delivered, false);
    assert.strictEqual(result.status, 'skipped_sandbox');
    assert.strictEqual(result.reason, 'recipient_not_allowlisted');
  });

  it('SES Sandbox mode: allows dispatch to recipient explicitly on allowlist', async () => {
    process.env.SES_ENABLED = 'true';
    process.env.SES_FROM_EMAIL = 'daneeshshetty@gmail.com';
    process.env.SES_SANDBOX_MODE = 'true';
    process.env.SES_ALLOWED_RECIPIENTS = 'daneeshshetty@gmail.com,qa-tester@example.com';

    let sendCalled = false;
    const mockSesClient = {
      send: async () => {
        sendCalled = true;
        return { MessageId: 'msg-allowed-sandbox' };
      },
    };
    emailService.setSesClient(mockSesClient);

    const result = await emailService.sendOrderConfirmation({
      orderId: 'EA-LWP-ALLOWED',
      tableNumber: 'Table 3',
      guestName: 'QA Tester',
      email: 'qa-tester@example.com',
      items: [{ name: 'Paneer Tikka', priceNum: 450, quantity: 1 }],
      subtotal: 450,
      gst: 22.5,
      total: 472.5,
    });

    assert.strictEqual(sendCalled, true);
    assert.strictEqual(result.delivered, true);
    assert.strictEqual(result.status, 'sent');
    assert.strictEqual(result.messageId, 'msg-allowed-sandbox');
  });

  it('SES Sandbox mode: sendReservationAcknowledgement respects test allowlist', async () => {
    process.env.SES_ENABLED = 'true';
    process.env.SES_FROM_EMAIL = 'daneeshshetty@gmail.com';
    process.env.SES_SANDBOX_MODE = 'true';
    process.env.SES_ALLOWED_RECIPIENTS = 'daneeshshetty@gmail.com,verified-guest@example.com';

    let sendCallCount = 0;
    const mockSesClient = {
      send: async () => {
        sendCallCount++;
        return { MessageId: 'msg-res-allowlist' };
      },
    };
    emailService.setSesClient(mockSesClient);

    // 1. Unverified guest -> skipped
    const skippedResult = await emailService.sendReservationAcknowledgement({
      reservationCode: 'RES-2026-SKIP',
      name: 'Unverified Guest',
      email: 'stranger@gmail.com',
      date: '2026-11-15',
      time: '7:00 PM',
      guests: 2,
    });
    assert.strictEqual(skippedResult.delivered, false);
    assert.strictEqual(skippedResult.status, 'skipped_sandbox');
    assert.strictEqual(sendCallCount, 0);

    // 2. Verified guest -> dispatched
    const sentResult = await emailService.sendReservationAcknowledgement({
      reservationCode: 'RES-2026-OK',
      name: 'Verified Guest',
      email: 'verified-guest@example.com',
      date: '2026-11-15',
      time: '7:00 PM',
      guests: 2,
    });
    assert.strictEqual(sentResult.delivered, true);
    assert.strictEqual(sentResult.status, 'sent');
    assert.strictEqual(sendCallCount, 1);
  });

  it('SES delivery failure does not throw or crash when AWS SDK rejects', async () => {
    process.env.SES_ENABLED = 'true';
    process.env.SES_FROM_EMAIL = 'daneeshshetty@gmail.com';
    process.env.SES_SANDBOX_MODE = 'false';

    const mockFailingClient = {
      send: async () => {
        throw new Error('SES Network Timeout connecting to ap-south-1.email.amazonaws.com');
      },
    };
    emailService.setSesClient(mockFailingClient);

    const result = await emailService.sendOrderConfirmation({
      orderId: 'EA-LWP-FAILTEST',
      tableNumber: 'Table 8',
      guestName: 'Failing Recipient',
      email: 'fail@example.com',
      items: [{ name: 'Dal Makhani', priceNum: 350, quantity: 1 }],
      subtotal: 350,
      gst: 17.5,
      total: 367.5,
    });

    assert.strictEqual(result.delivered, false);
    assert.strictEqual(result.status, 'failed');
    assert.ok(result.error.includes('SES Network Timeout'));
  });

  it('POST /api/orders: saves order and preserves order even when SES fails', async () => {
    process.env.SES_ENABLED = 'true';
    process.env.SES_FROM_EMAIL = 'daneeshshetty@gmail.com';
    process.env.SES_SANDBOX_MODE = 'false';

    // Mock failing AWS SES client
    const mockFailingClient = {
      send: async () => {
        throw new Error('SES simulated delivery failure');
      },
    };
    emailService.setSesClient(mockFailingClient);

    // Mock Dish and Order database save
    const originalDishFind = Dish.find;
    const originalOrderSave = Order.prototype.save;

    Dish.find = () => ({
      lean: async () => [
        { dishId: 301, name: 'Lamb Seekh Kebab', priceNum: 600 },
      ],
    });

    let savedOrderDoc = null;
    Order.prototype.save = async function () {
      savedOrderDoc = this;
      return this;
    };

    try {
      const res = await request(app)
        .post('/api/orders')
        .send({
          tableNumber: 'Table 7',
          guestName: 'Rohan Sharma',
          email: 'rohan.sharma@example.com',
          notes: 'Spicy please',
          items: [{ dishId: 301, name: 'Lamb Seekh Kebab', priceNum: 600, quantity: 1 }],
        });

      // Crucial requirement: Order MUST still succeed with HTTP 201
      assert.strictEqual(res.statusCode, 201);
      assert.ok(res.body.orderId.startsWith('EA-LWP-'));
      assert.strictEqual(res.body.tableNumber, 'Table 7');
      assert.strictEqual(res.body.guestEmail, 'rohan.sharma@example.com');
      assert.strictEqual(res.body.total, 630); // 600 + 5% GST

      // Verify the order document was saved
      assert.ok(savedOrderDoc !== null);
      assert.strictEqual(savedOrderDoc.tableNumber, 'Table 7');
    } finally {
      Dish.find = originalDishFind;
      Order.prototype.save = originalOrderSave;
    }
  });

  it('isRecipientAllowed correctly handles domain wildcards and SES simulators', () => {
    process.env.SES_SANDBOX_MODE = 'true';
    process.env.SES_FROM_EMAIL = 'daneeshshetty@gmail.com';
    process.env.SES_ALLOWED_RECIPIENTS = 'test@example.com,@emberandash.com';

    assert.strictEqual(emailService.isRecipientAllowed('test@example.com'), true);
    assert.strictEqual(emailService.isRecipientAllowed('daneeshshetty@gmail.com'), true); // Verified sender
    assert.strictEqual(emailService.isRecipientAllowed('chef@emberandash.com'), true); // Domain match
    assert.strictEqual(emailService.isRecipientAllowed('success@simulator.amazonses.com'), true); // SES simulator
    assert.strictEqual(emailService.isRecipientAllowed('bounce@simulator.amazonses.com'), true); // SES simulator
    assert.strictEqual(emailService.isRecipientAllowed('unverified@yahoo.com'), false); // Blocked
  });
});
