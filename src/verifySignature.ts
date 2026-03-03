import crypto from "node:crypto";

/**
 * Intercom Webhookの署名を検証する。
 * X-Hub-Signatureヘッダーの値をHMAC-SHA1で計算した値と比較する。
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac("sha1", secret);
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
  hmac.update(body, "utf-8");
  const expected = `sha1=${hmac.digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}
