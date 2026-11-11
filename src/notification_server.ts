import { createServer } from "node:http";
import { ZodError } from "zod";
import { queueAppointmentNotification } from "./appointment_notification_route.js";

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/appointments/reminders") {
    response.writeHead(404).end();
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  try {
    const result = await queueAppointmentNotification(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    response.writeHead(result.status, { "Content-Type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof ZodError ? "Invalid appointment request." : "Invalid JSON request.";
    response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ message }));
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => console.log("Appointment notification service listening."));
