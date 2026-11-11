import { z } from "zod";
import { decideNotification, type AppointmentEvent } from "./appointment_decision.js";
import { InfraiHealthClient } from "./infrai_health_client.js";

const appointmentBody = z.object({
  appointmentId: z.string().min(1),
  patientFirstName: z.string().min(1),
  startsAt: z.string().datetime(),
  channel: z.enum(["sms", "email"])
});

export async function queueAppointmentNotification(input: unknown, now = new Date()) {
  const parsed = appointmentBody.parse(input);
  const event: AppointmentEvent = {
    appointmentId: parsed.appointmentId,
    patientFirstName: parsed.patientFirstName,
    startsAt: parsed.startsAt,
    channel: parsed.channel
  };
  const decision = decideNotification(event, now);
  if (decision.kind === "hold") return { status: 202, decision };

  const client = new InfraiHealthClient();
  try {
    const queued = await client.publishAppointment({
      appointmentId: event.appointmentId,
      channel: event.channel,
      message: decision.message
    });
    return { status: 202, decision, messageId: queued.message_id };
  } catch (error) {
    await client.capture({ exception: error instanceof Error ? error.message : "Notification queue error" });
    return { status: 502, decision: { kind: "hold", reason: "The notification was recorded for operations review." } };
  }
}
