import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type ReceiptPayload = {
  v: 1;
  agent: string;
  name: string;
  task: string;
  result: string;
  /** sha256 of the delivered answer, so a shared receipt can be matched to the exact text. */
  resultHash: string;
  price: string;
  burn: string;
  operator: string;
  tx: string;
  at: string;
};

/** Content hash of an answer. Anyone holding the answer can recompute it. */
export function hashResult(result: string): string {
  return `sha256:${createHash('sha256').update(result, 'utf8').digest('hex')}`;
}

const encode = (value: Buffer) => value.toString('base64url');

function secret(): string {
  return process.env.RECEIPT_SECRET ?? '';
}

/**
 * A receipt is an HMAC over the exact payload the server returned. Without the secret
 * anyone could still hand-build the old query-string link, which is exactly why the
 * report page marks those as unverified instead of presenting them as proof.
 */
export function signReceipt(payload: ReceiptPayload): string | null {
  const key = secret();
  if (!key) return null;
  const body = encode(Buffer.from(JSON.stringify(payload)));
  const signature = encode(createHmac('sha256', key).update(body).digest());
  return `${body}.${signature}`;
}

export function verifyReceipt(token: string): ReceiptPayload | null {
  const key = secret();
  if (!key) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = encode(createHmac('sha256', key).update(body).digest());
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ReceiptPayload;
    return payload.v === 1 ? payload : null;
  } catch {
    return null;
  }
}
