import type { HttpResult } from './gateway.ts';

export type Post = {
  id: string;
  rootId: string;
  username: string;
  message: string;
  type: string;
  createAt: number;
};

type RawPost = { id: string; root_id?: string; user_id: string; message: string; type?: string; create_at: number };
type RawPosts = { order: string[]; posts: Record<string, RawPost> };

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// One person's view of Mattermost, so a transcript shows what that person can see.
export class MattermostSession {
  private readonly baseUrl: string;
  private readonly usernames = new Map<string, string>();
  private token = '';
  userId = '';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async login(username: string, password: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: username, password }),
    });
    if (response.status !== 200) return false;
    this.token = response.headers.get('Token') ?? '';
    this.userId = ((await response.json()) as { id: string }).id;
    return this.token !== '';
  }

  async request(method: string, path: string, body?: unknown): Promise<HttpResult> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await readBody(response) };
  }

  async channelId(team: string, channel: string): Promise<string | null> {
    const result = await this.request('GET', `/teams/name/${team}/channels/name/${channel}`);
    return result.status === 200 ? (result.body as { id: string }).id : null;
  }

  async postMessage(channelId: string, message: string, fileIds: string[] = []): Promise<string> {
    const result = await this.request('POST', '/posts', { channel_id: channelId, message, file_ids: fileIds });
    if (result.status !== 201) throw new Error(`post returned ${result.status}`);
    return (result.body as { id: string }).id;
  }

  async uploadAndPost(channelId: string, message: string, filename: string, bytes: Buffer): Promise<string> {
    const form = new FormData();
    form.append('channel_id', channelId);
    form.append('files', new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), filename);
    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    if (response.status !== 201) throw new Error(`upload returned ${response.status}`);
    const uploaded = (await response.json()) as { file_infos: { id: string }[] };
    return this.postMessage(channelId, message, uploaded.file_infos.map((file) => file.id));
  }

  private async username(userId: string): Promise<string> {
    const known = this.usernames.get(userId);
    if (known !== undefined) return known;
    const result = await this.request('GET', `/users/${userId}`);
    const name = result.status === 200 ? (result.body as { username: string }).username : userId;
    this.usernames.set(userId, name);
    return name;
  }

  async posts(channelId: string): Promise<Post[]> {
    const result = await this.request('GET', `/channels/${channelId}/posts?per_page=200`);
    if (result.status !== 200) return [];
    const raw = result.body as RawPosts;
    const posts: Post[] = [];
    for (const id of [...raw.order].reverse()) {
      const post = raw.posts[id];
      if (!post) continue;
      posts.push({
        id: post.id,
        rootId: post.root_id ?? '',
        username: await this.username(post.user_id),
        message: post.message,
        type: post.type ?? '',
        createAt: post.create_at,
      });
    }
    return posts;
  }

  async clientConfig(): Promise<Record<string, string>> {
    const result = await this.request('GET', '/config/client?format=old');
    return result.status === 200 ? (result.body as Record<string, string>) : {};
  }
}
