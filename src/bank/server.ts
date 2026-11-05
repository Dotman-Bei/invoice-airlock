import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { parsePaymentRequest, type Ledger } from './ledger.ts';

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock bank</title>
<style>
  :root { color-scheme: light dark; font: 16px/1.5 system-ui, sans-serif; }
  body { margin: 24px; }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 6px 12px 6px 0; }
  .balance { font-size: 48px; font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<h1>Mock bank. No real money</h1>
<p class="balance" id="balance"></p>
<table>
  <thead><tr><th>Entry</th><th>Invoice</th><th>Paid to</th><th>Account</th><th>Amount</th><th>Released by</th></tr></thead>
  <tbody id="entries"></tbody>
</table>
<script>
  const usd = (cents) => (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  async function refresh() {
    const ledger = await (await fetch('/ledger.json')).json();
    document.getElementById('balance').textContent = usd(ledger.balance_cents);
    const body = document.getElementById('entries');
    body.replaceChildren(...ledger.entries.map((e) => {
      const row = document.createElement('tr');
      for (const text of [e.entry, e.invoice_no, e.vendor_name, 'ending ' + e.account.slice(-4), usd(e.amount_cents), e.released_by]) {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.append(cell);
      }
      return row;
    }));
  }
  refresh();
  setInterval(refresh, 1000);
</script>
</body>
</html>
`;

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function tokenMatches(request: IncomingMessage, token: string): boolean {
  const given = Buffer.from(request.headers.authorization ?? '');
  const wanted = Buffer.from(`Bearer ${token}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export function createBankServer(token: string, ledger: Ledger): Server {
  return createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(PAGE);
      return;
    }
    if (request.method === 'GET' && request.url === '/ledger.json') {
      send(response, 200, ledger.view());
      return;
    }
    if (request.method === 'POST' && request.url === '/payments') {
      if (!tokenMatches(request, token)) {
        send(response, 401, { error: 'unauthorized' });
        return;
      }
      let raw = '';
      request.on('data', (chunk) => { raw += String(chunk); });
      request.on('end', () => {
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        const payment = parsePaymentRequest(parsed);
        if (!payment) {
          send(response, 400, { error: 'bad payment' });
          return;
        }
        const result = ledger.pay(payment);
        if (result.ok) {
          send(response, 201, result.entry);
        } else if (result.code === 'already-paid') {
          send(response, 409, { error: result.code });
        } else {
          send(response, 400, { error: result.code });
        }
      });
      return;
    }
    send(response, 404, { error: 'not found' });
  });
}
