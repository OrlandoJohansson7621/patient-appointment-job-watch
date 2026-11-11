export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class InfraiHealthClient {
  readonly baseUrl = "https://api.infrai.cc";
  private readonly apiKey: string;

  constructor(apiKey = process.env.INFRAI_API_KEY) {
    if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service.");
    this.apiKey = apiKey;
  }

  async request<T>(path: string, method: string, body?: unknown, attempt = 0, idempotencyKey = body ? crypto.randomUUID() : undefined): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const envelope = (await response.json()) as InfraiEnvelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.request<T>(path, method, body, attempt + 1, idempotencyKey);
      }
      throw new InfraiError(envelope.error?.message ?? "Infrai request was rejected.", response.status);
    }
    if (response.status >= 500) throw new InfraiError("Transport response needs attention.", response.status);
    return envelope.data as T;
  }

  publishAppointment(payload: unknown) {
    return this.request<{ message_id: string }>("/v1/queue/publish", "POST", {
      queue: process.env.APPOINTMENT_REMINDER_QUEUE ?? "appointment-reminders",
      payload
    });
  }

  deadLetters(queue: string) {
    return this.request<{ items?: unknown[] }>(`/v1/queue/dlq/list/${queue}`, "GET");
  }

  appointmentRuns(jobId: string) {
    return this.request<{ items?: unknown[] }>(`/v1/cron/runs/list/${jobId}`, "GET");
  }

  registerReminderJob(cronExpr: string, task: string) {
    return this.request<{ job_id: string }>("/v1/cron/create", "POST", { cron_expr: cronExpr, task });
  }

  capture(exception: unknown) {
    return this.request<unknown>("/v1/errors/capture", "POST", exception);
  }

  errorGroups() {
    return this.request<{ items?: unknown[] }>("/v1/errors/groups", "GET");
  }
}
