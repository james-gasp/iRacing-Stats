import { createHash } from "crypto";

const BASE_URL = "https://members-ng.iracing.com";

/**
 * iRacing requires the password to be pre-hashed client-side:
 * base64(sha256(password + lowercase(email)))
 */
function encodePassword(email: string, password: string): string {
  const hash = createHash("sha256")
    .update(password + email.toLowerCase())
    .digest();
  return hash.toString("base64");
}

class RateLimiter {
  private lastRequestAt = 0;
  constructor(private minIntervalMs: number) {}

  async wait() {
    const elapsed = Date.now() - this.lastRequestAt;
    const remaining = this.minIntervalMs - elapsed;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    this.lastRequestAt = Date.now();
  }
}

// iRacing's Data API is rate limited; keep a conservative gap between calls.
const limiter = new RateLimiter(300);

export class IracingClient {
  private cookie: string | null = null;
  private authPromise: Promise<void> | null = null;

  constructor(
    private email: string,
    private password: string,
  ) {}

  private async authenticate(): Promise<void> {
    await limiter.wait();
    const res = await fetch(`${BASE_URL}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.email,
        password: encodePassword(this.email, this.password),
      }),
    });

    if (!res.ok) {
      throw new Error(`iRacing auth failed: ${res.status} ${await res.text()}`);
    }

    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) {
      throw new Error("iRacing auth succeeded but no session cookie was returned");
    }
    // Node's fetch folds multiple Set-Cookie headers into one string on some
    // runtimes; split defensively and keep only the name=value pairs.
    this.cookie = setCookie
      .split(/,(?=[^;]+=[^;]+;)/)
      .map((c) => c.split(";")[0])
      .join("; ");
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.cookie) return;
    if (!this.authPromise) {
      this.authPromise = this.authenticate().finally(() => {
        this.authPromise = null;
      });
    }
    await this.authPromise;
  }

  /**
   * Calls a Data API endpoint. Most endpoints respond with `{ link: <url> }`
   * pointing at a signed, short-lived payload rather than inline JSON, so we
   * follow that link automatically. Retries once on 401 in case the session
   * cookie expired.
   */
  async get<T = unknown>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    await this.ensureAuthenticated();

    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value));
    }
    const url = `${BASE_URL}${path}${query.size ? `?${query}` : ""}`;

    await limiter.wait();
    let res = await fetch(url, { headers: { Cookie: this.cookie ?? "" } });

    if (res.status === 401) {
      this.cookie = null;
      await this.ensureAuthenticated();
      await limiter.wait();
      res = await fetch(url, { headers: { Cookie: this.cookie ?? "" } });
    }

    if (!res.ok) {
      throw new Error(`iRacing GET ${path} failed: ${res.status} ${await res.text()}`);
    }

    const body = await res.json();

    if (body && typeof body === "object" && "link" in body && typeof (body as { link?: unknown }).link === "string") {
      await limiter.wait();
      const linkRes = await fetch((body as { link: string }).link);
      if (!linkRes.ok) {
        throw new Error(`iRacing chunked payload fetch failed: ${linkRes.status}`);
      }
      return (await linkRes.json()) as T;
    }

    return body as T;
  }
}

let sharedClient: IracingClient | null = null;

export function getIracingClient(): IracingClient {
  if (!sharedClient) {
    const email = process.env.IRACING_EMAIL;
    const password = process.env.IRACING_PASSWORD;
    if (!email || !password) {
      throw new Error("IRACING_EMAIL and IRACING_PASSWORD must be set (see .env.example)");
    }
    sharedClient = new IracingClient(email, password);
  }
  return sharedClient;
}
