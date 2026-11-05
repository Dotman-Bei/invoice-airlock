export type HttpResult = { status: number; body: unknown };

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// A person's Gateway session. Login sets cookies, so this keeps a small jar.
export class GatewaySession {
  private readonly baseUrl: string;
  private readonly cookies = new Map<string, string>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async login(email: string, password: string): Promise<HttpResult> {
    return this.request('POST', '/auth/login', { email, password });
  }

  async request(method: string, path: string, body?: unknown): Promise<HttpResult> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.cookies.size > 0) {
      headers['Cookie'] = [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0] ?? '';
      const at = pair.indexOf('=');
      if (at > 0) this.cookies.set(pair.slice(0, at), pair.slice(at + 1));
    }
    return { status: response.status, body: await readBody(response) };
  }
}

export function must(result: HttpResult, label: string): Record<string, unknown> {
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`${label} returned ${result.status}: ${JSON.stringify(result.body).slice(0, 300)}`);
  }
  return typeof result.body === 'object' && result.body !== null ? (result.body as Record<string, unknown>) : {};
}
