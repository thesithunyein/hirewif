export type AlertPayload = {
  address: string;
  email?: string;
  threshold: number;
  change24h: number;
  priceUsd: number;
};

export type Delivery = { delivered: boolean; via: 'knock' | 'webhook' | 'none' };

const KNOCK_BASE = 'https://api.knock.app/v1';

function message(p: AlertPayload): string {
  const direction = p.change24h >= 0 ? 'up' : 'down';
  return [
    `WIF is ${direction} ${Math.abs(p.change24h).toFixed(2)}% over 24h, past the ${p.threshold}% you set.`,
    `Price is $${p.priceUsd.toFixed(6)}.`,
    '',
    'Unlock Research for the sourced explanation: https://www.hirewif.tech/marketplace#agent-research',
    '',
    `Watch for ${p.address}. Turn it off on the same page.`,
  ].join('\n');
}

/**
 * Delivery order: Knock when an API key and recipient email exist, then a plain webhook
 * (Discord/Slack style) so the loop can be demonstrated without a vendor account.
 */
export async function deliverAlert(p: AlertPayload): Promise<Delivery> {
  const apiKey = process.env.KNOCK_API_KEY;
  const workflow = process.env.KNOCK_WORKFLOW ?? 'price-alert';

  if (apiKey && p.email) {
    try {
      const response = await fetch(`${KNOCK_BASE}/workflows/${encodeURIComponent(workflow)}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          recipients: [p.address],
          data: { email: p.email, symbol: 'WIF', price: p.priceUsd, change24h: p.change24h, threshold: p.threshold },
          // One alert per wallet per threshold move, even if cron retries.
          idempotency_key: `wif-alert:${p.address.toLowerCase()}:${p.threshold}:${new Date().toISOString().slice(0, 13)}`,
        }),
        cache: 'no-store',
      });
      if (response.ok) return { delivered: true, via: 'knock' };
    } catch {
      // fall through to the webhook
    }
  }

  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (webhook) {
    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message(p), text: message(p) }),
        cache: 'no-store',
      });
      if (response.ok) return { delivered: true, via: 'webhook' };
    } catch {
      // nothing left to try
    }
  }

  return { delivered: false, via: 'none' };
}
