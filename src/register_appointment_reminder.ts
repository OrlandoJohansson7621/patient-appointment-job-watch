import { InfraiHealthClient } from "./infrai_health_client.js";

const task = process.env.APPOINTMENT_REMINDER_TASK_URL;
if (!task) throw new Error("Set APPOINTMENT_REMINDER_TASK_URL.");

const infrai = new InfraiHealthClient();
const job = await infrai.registerReminderJob("0 */2 * * *", task);
console.log(job.job_id);
