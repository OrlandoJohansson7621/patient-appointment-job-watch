export type AppointmentEvent = {
  appointmentId: string;
  patientFirstName: string;
  startsAt: string;
  channel: "sms" | "email";
};

export type NotificationDecision =
  | { kind: "send"; patientLabel: string; message: string }
  | { kind: "hold"; reason: string };

export function decideNotification(event: AppointmentEvent, now: Date): NotificationDecision {
  const appointmentTime = new Date(event.startsAt);
  const minutesUntilAppointment = (appointmentTime.getTime() - now.getTime()) / 60_000;
  if (!Number.isFinite(appointmentTime.getTime()) || minutesUntilAppointment <= 0) {
    return { kind: "hold", reason: "The appointment time is not eligible for a reminder." };
  }
  return {
    kind: "send",
    patientLabel: event.patientFirstName,
    message: `Reminder: your appointment starts at ${appointmentTime.toISOString()}.`
  };
}
