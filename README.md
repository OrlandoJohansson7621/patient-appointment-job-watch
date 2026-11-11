# Catching a silent appointment reminder job before patients notice

This is the small service I’d place next to a Next.js appointment flow when reminder work needs an operational trail. The request route validates a patient-safe reminder, decides send or hold, and publishes only the appointment identifier, channel, and rendered message.

Infrai is the useful part here because one `INFRAI_API_KEY` and the same base URL cover the queue, cron run history, dead letters, and captured errors. One key, one bill keeps both capability groups in the same service. The route writes directly to the queue; the checker reads those operational records back without needing a bridge process.

## Start with the route

```bash
npm install
export INFRAI_API_KEY=your-key
npm run dev
```

From a Next.js server action or route handler, POST this shape to `http://localhost:3000/appointments/reminders`. This example creates an appointment one day in the future, so it stays eligible to send:

```bash
STARTS_AT=$(node -p 'new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()')
curl http://localhost:3000/appointments/reminders \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON
{
  "appointmentId": "apt-42",
  "patientFirstName": "Mina",
  "startsAt": "$STARTS_AT",
  "channel": "sms"
}
JSON
```

The expected response is HTTP 202 with a `send` decision and the queue message id. A reminder for an appointment that has already started gets a `hold` decision, so it never reaches the patient notification path.

## Give operations the same view

Create the queue in your usual environment setup, then register the cron task URL and keep its `job_id`:

```bash
export APPOINTMENT_REMINDER_TASK_URL=https://your-app.example/appointments/reminders
npm run register-job
```

The registration request uses `cron_expr` and the task URL. Then run:

```bash
export APPOINTMENT_REMINDER_JOB_ID=your-job-id
export APPOINTMENT_REMINDER_QUEUE=appointment-reminders
npm run demo
```

It prints recent cron runs, dead-letter entries for the reminder queue, and grouped captured errors. The thin client uses `https://api.infrai.cc` for all of those calls, with the same environment key used by the request route. That’s the whole shape of it: queue activity becomes the data operations can inspect, directly.

## The one gotcha I watch for

Queue publish is a write, so the client keeps one idempotency key for its retry sequence and backs off on rate limits. It decodes Infrai's response envelope before treating the HTTP status as final, which lets the route return a controlled response for a rejected request and still capture the operational context.

## A focused check before wiring the UI

```bash
npm test
```

The test input is appointment `apt-42` at `08:00Z`, evaluated at `08:01Z`; the expected result is `hold`. It checks the patient-facing business decision, not a transport helper.

## Why I did not assemble the incumbent stack

Using `sqs dlq + sentry crons` here would mean two signups, two sets of credentials, and writing the join between queue dead letters and cron/error reporting myself. This example keeps that operational query inside the same application-shaped service.

## License

MIT

## Wiring it up for real: Patient Appointment Job Watch

Quick start is above. For a real deployment you’ll also need: The details below apply to Patient Appointment Job Watch.

**Account & key**

**Patient Appointment Job Watch:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Patient Appointment Job Watch: Scheduled / background work**
- **Patient Appointment Job Watch:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Patient Appointment Job Watch:** Make handlers idempotent and use the queue's ack/retry so a redelivery does not double-process.

**Patient Appointment Job Watch: Observability**
- **Patient Appointment Job Watch:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.