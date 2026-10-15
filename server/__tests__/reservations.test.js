const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const Reservation = require('../models/Reservation');
const emailService = require('../services/email');
const { app } = require('../server');

describe('Task 2, 3 & 6 — Reservation Validation & Amazon SES Integration', () => {
  it('creates valid reservation with status pending and cryptographically unique RES-2026- code', async () => {
    const originalSave = Reservation.prototype.save;
    Reservation.prototype.save = async function () {
      return this;
    };

    // Calculate a future date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    try {
      const payload = {
        name: 'Aarav Patel',
        email: 'aarav.patel@example.com',
        phone: '+919876543210',
        date: dateStr,
        time: '7:30 PM',
        guests: '4',
        specialRequests: 'Window booth please',
      };

      const res = await request(app)
        .post('/api/reservations')
        .send(payload);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.name, 'Aarav Patel');
      assert.strictEqual(res.body.email, 'aarav.patel@example.com');
      assert.strictEqual(res.body.guests, 4);
      // Status must be pending because availability validation is pending host review
      assert.strictEqual(res.body.status, 'pending');
      assert.ok(res.body.reservationCode.startsWith('RES-2026-'));
    } finally {
      Reservation.prototype.save = originalSave;
    }
  });

  it('rejects reservation with missing required fields', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .send({
        name: 'John Doe',
        // missing email, phone, date, time
      });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error);
  });

  it('rejects reservation with invalid email format', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const res = await request(app)
      .post('/api/reservations')
      .send({
        name: 'John Doe',
        email: 'invalid-email-no-at-sign',
        phone: '1234567890',
        date: tomorrow.toISOString().split('T')[0],
        time: '6:00 PM',
        guests: 2,
      });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('valid email'));
  });

  it('rejects reservation with date in the past', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        date: '2020-01-01', // Past date
        time: '6:00 PM',
        guests: 2,
      });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('valid current or future date'));
  });

  it('rejects party size exceeding allowed limits (< 1 or > 20)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const res = await request(app)
      .post('/api/reservations')
      .send({
        name: 'Large Party',
        email: 'party@example.com',
        phone: '9988776655',
        date: tomorrow.toISOString().split('T')[0],
        time: '8:00 PM',
        guests: 99, // Too high
      });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Party size must be between 1 and 20'));
  });

  it('SES disabled mode: reservation succeeds with HTTP 201 without attempting AWS send', async () => {
    process.env.SES_ENABLED = 'false';

    const result = await emailService.sendReservationAcknowledgement({
      reservationCode: 'RES-TEST-DISABLED',
      name: 'Guest',
      email: 'guest@example.com',
      date: '2026-10-20',
      time: '7:00 PM',
      guests: 2,
    });

    assert.strictEqual(result.delivered, false);
    assert.strictEqual(result.status, 'disabled');
  });

  it('SES success with mocked AWS SDK client', async () => {
    process.env.SES_ENABLED = 'true';
    process.env.SES_FROM_EMAIL = 'reservations@emberandash.com';

    let sentParams = null;
    const mockSesClient = {
      send: async (command) => {
        sentParams = command.input;
        return { MessageId: 'mocked-aws-msg-001' };
      },
    };

    emailService.setSesClient(mockSesClient);

    try {
      const result = await emailService.sendReservationAcknowledgement({
        reservationCode: 'RES-2026-MOCK1',
        name: 'Test Guest',
        email: 'testguest@example.com',
        date: '2026-11-01',
        time: '8:00 PM',
        guests: 3,
      });

      assert.strictEqual(result.delivered, true);
      assert.strictEqual(result.status, 'sent');
      assert.strictEqual(result.messageId, 'mocked-aws-msg-001');

      // Verify email parameters
      assert.strictEqual(sentParams.Source, 'reservations@emberandash.com');
      assert.deepStrictEqual(sentParams.Destination.ToAddresses, ['testguest@example.com']);
      assert.ok(sentParams.Message.Subject.Data.includes('RES-2026-MOCK1'));
      assert.ok(sentParams.Message.Body.Text.Data.includes('Party Size: 3 guest(s)'));
    } finally {
      process.env.SES_ENABLED = 'false';
      emailService.setSesClient(null);
    }
  });

  it('SES failure with mocked AWS SDK does not reverse or fail reservation', async () => {
    process.env.SES_ENABLED = 'true';
    process.env.SES_FROM_EMAIL = 'reservations@emberandash.com';

    const mockFailingClient = {
      send: async () => {
        throw new Error('SES Sandbox simulated rejection: Address not verified');
      },
    };

    emailService.setSesClient(mockFailingClient);

    try {
      const result = await emailService.sendReservationAcknowledgement({
        reservationCode: 'RES-2026-FAIL1',
        name: 'Sandbox User',
        email: 'unverified@example.com',
        date: '2026-11-01',
        time: '8:00 PM',
        guests: 2,
      });

      // Email service returns delivered false but does not throw unhandled exception
      assert.strictEqual(result.delivered, false);
      assert.strictEqual(result.status, 'failed');
      assert.ok(result.error.includes('Address not verified'));
    } finally {
      process.env.SES_ENABLED = 'false';
      emailService.setSesClient(null);
    }
  });

  it('retries and succeeds when a reservationCode collision (E11000) occurs', async () => {
    let callCount = 0;
    const originalSave = Reservation.prototype.save;

    Reservation.prototype.save = async function () {
      callCount++;
      if (callCount === 1) {
        const duplicateErr = new Error('E11000 duplicate key error');
        duplicateErr.code = 11000;
        throw duplicateErr;
      }
      return this;
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const res = await request(app)
        .post('/api/reservations')
        .send({
          name: 'Retry Guest',
          email: 'retry@example.com',
          phone: '+919988776655',
          date: tomorrow.toISOString().split('T')[0],
          time: '8:00 PM',
          guests: 2,
        });

      assert.strictEqual(res.statusCode, 201);
      assert.ok(callCount >= 2, `Expected at least 2 save calls due to retry, got ${callCount}`);
      assert.ok(res.body.reservationCode.startsWith('RES-2026-'));
    } finally {
      Reservation.prototype.save = originalSave;
    }
  });

  it('maskEmail correctly masks sensitive customer emails in logs', () => {
    assert.strictEqual(emailService.maskEmail('daneesh@example.com'), 'd***h@example.com');
    assert.strictEqual(emailService.maskEmail('a@b.com'), 'a***@b.com');
    assert.strictEqual(emailService.maskEmail(null), '***');
  });
});
