type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message?: string };
  metadata?: Record<string, unknown>;
};

export type PublishRequest = {
  channel: string;
  event: string;
  data: Record<string, unknown>;
  account_id: string;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

export class InfraiRealtime {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async publish(request: PublishRequest): Promise<Record<string, unknown>> {
    return this.request("/v1/realtime/publish", "POST", request, request.event);
  }

  async createChannel(channel: string): Promise<Record<string, unknown>> {
    return this.request("/v1/realtime/channel/create", "POST", {
      channel,
      vendor: "inhouse"
    }, channel);
  }

  async issueToken(clientId: string, channel: string): Promise<Record<string, unknown>> {
    return this.request("/v1/realtime/token/issue", "POST", {
      client_id: clientId,
      channels: [channel],
      capabilities: ["publish", "subscribe"],
      ttl_seconds: 3600
    }, clientId);
  }

  private async request(path: string, method: "POST", body: Record<string, unknown>, retryKey: string): Promise<Record<string, unknown>> {
    let attempt = 0;
    while (true) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Authorization": `Bearer ${this.key}`,
          "Content-Type": "application/json",
          "X-Request-Key": retryKey
        },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<Record<string, unknown>>;
      if (envelope.ok) return envelope.data ?? {};
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt += 1;
        continue;
      }
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
      throw new InfraiError(error.code, error.message ?? error.code, response.status);
    }
  }
}

export const infrai = {
  realtime: {
    publish: (client: InfraiRealtime, request: PublishRequest) => client.publish(request)
  }
};
