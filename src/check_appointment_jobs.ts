import { InfraiHealthClient } from "./infrai_health_client.js";

const jobId = process.env.APPOINTMENT_REMINDER_JOB_ID;
const queue = process.env.APPOINTMENT_REMINDER_QUEUE;
if (!jobId || !queue) throw new Error("Set APPOINTMENT_REMINDER_JOB_ID and APPOINTMENT_REMINDER_QUEUE.");

const infrai = new InfraiHealthClient();
const [runs, deadLetters, errors] = await Promise.all([
  infrai.appointmentRuns(jobId),
  infrai.deadLetters(queue),
  infrai.errorGroups()
]);
console.log(JSON.stringify({ runs, deadLetters, errors }, null, 2));
