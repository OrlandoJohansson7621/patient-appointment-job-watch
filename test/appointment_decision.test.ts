import assert from "node:assert/strict";
import test from "node:test";
import { decideNotification } from "../src/appointment_decision.js";

test("holds a reminder when its appointment has already started", () => {
  const decision = decideNotification({
    appointmentId: "apt-42",
    patientFirstName: "Mina",
    startsAt: "2026-09-15T08:00:00.000Z",
    channel: "sms"
  }, new Date("2026-09-15T08:01:00.000Z"));
  assert.deepEqual(decision, { kind: "hold", reason: "The appointment time is not eligible for a reminder." });
});
